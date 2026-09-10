import type { CallToolResult, McpServer, ToolCallback } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { ApiError } from '@/lib/api/errors'
import { MODEL_PRESETS, listNovitaModels, novitaConfigured } from '@/lib/ai/novita'
import {
  campaignCreateSchema, createCampaign, createMagnet, createTemplate, deleteMagnet, deleteTemplate,
  getMagnet, getTemplate, listCampaigns, listMagnets, listTemplates, magnetCreateSchema, magnetUpdateSchema,
  templateCreateSchema, templateUpdateSchema, updateMagnet, updateTemplate,
} from '@/lib/content/service'
import { emailListQuerySchema, getEmail, inboxQuerySchema, leadThread, listEmails, listInbox, sendEmailSchema, sendOneOff, updateEmail } from '@/lib/email/service'
import { emailStatusFromHunter, findEmail, verifyEmail } from '@/lib/enrichment/hunter'
import { db } from '@/lib/db'
import { leadBulkSchema, leadCreateSchema, leadListQuerySchema, leadUpdateSchema } from '@/lib/leads/schemas'
import { bulkUpsertLeads, createLead, deleteLead, getLead, listLeads, splitName, updateLead } from '@/lib/leads/service'
import { applyEnrollmentAction, enrollLeads, listEnrollments, liveEnrollmentForLead } from '@/lib/sequences/enrollments'
import { enrollSchema, enrollmentActionSchema, enrollmentListQuerySchema, sequenceCreateSchema, sequenceListQuerySchema, sequenceUpdateSchema, stepInputSchema, stepUpdateSchema } from '@/lib/sequences/schemas'
import { previewSequenceForLead, runDueSteps } from '@/lib/sequences/runner'
import { addStep, createSequence, deleteSequence, deleteStep, getSequenceWithSteps, listSequences, reorderSteps, resolveSequence, sequenceStats, updateSequence, updateStep } from '@/lib/sequences/service'
import { getAllSettings, updateSetting } from '@/lib/settings'
import { overviewStats } from '@/lib/stats'

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean }

function ok(data: unknown): ToolResult {
  return { content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }] }
}

function fail(error: unknown): ToolResult {
  const message = error instanceof ApiError
    ? `${error.message}${error.details ? `\n${JSON.stringify(error.details)}` : ''}`
    : error instanceof z.ZodError
      ? `Validation failed: ${error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`
      : error instanceof Error ? error.message : 'Unknown error'
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true }
}

const id = z.string().describe('UUID')
const sequenceRef = z.string().describe('Sequence UUID or slug')

const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
const mutating = { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
const destructive = { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
const external = { readOnlyHint: false, destructiveHint: false, openWorldHint: true }

export const SERVER_INSTRUCTIONS = `Bodega is Pigeon Labs' cold-email CRM. Typical workflow:
1. Create or import leads (create_lead / bulk_import_leads). Use find_lead_email / verify_lead_email (Hunter.io) when the address is unknown or unverified. Outbound send and sequence enrollment require a verified status (valid, accept_all, or webmail) — unverified leads are rejected.
2. Write the sequence: create_sequence with steps, or add_sequence_step. Bodies support {{first_name}}, {{company_name}}, {{title}}, {{first_name|there}} (fallback), and {{research.<key>}} from the lead's research JSON. Leave a follow-up's subject empty and thread_with_previous=true to send it as a reply in the same thread. condition_prompt lets you gate a step with a natural-language rule evaluated by an LLM before sending.
3. preview_sequence for a real lead to proofread every rendered step, then activate the sequence (update_sequence status=active) and enroll_leads. The cron sends due steps every 15 minutes inside the send window.
4. Replies arrive via Resend webhooks: check list_inbox, read get_lead_thread, answer with send_email (reply_to_email_id keeps the thread), then mark_email_handled.
A lead can only be in one live sequence at a time. Replies, bounces, and unsubscribes stop the sequence automatically.`

export function registerBodegaTools(server: McpServer) {
  const tool = <S extends z.ZodTypeAny>(
    name: string,
    description: string,
    inputSchema: S,
    annotations: Record<string, boolean>,
    handler: (args: z.infer<S>) => Promise<unknown>,
  ) => {
    const callback = async (args: unknown): Promise<CallToolResult> => {
      try {
        return ok(await handler(args as z.infer<S>))
      } catch (error) {
        return fail(error)
      }
    }
    server.registerTool(name, { title: name.replace(/_/g, ' '), description, inputSchema, annotations }, callback as unknown as ToolCallback<S>)
  }

  // ----- Overview -----------------------------------------------------------
  tool('crm_overview', 'Pipeline snapshot: leads by stage, active sequences, due sends, last-7-day email stats, unhandled inbox count.', z.object({}), readOnly,
    () => overviewStats())

  // ----- Leads --------------------------------------------------------------
  tool('list_leads', 'Search and filter leads. q matches email/name/company/title.', leadListQuerySchema, readOnly,
    (args) => listLeads(args))
  tool('get_lead', 'Fetch one lead with its live sequence enrollment (if any).', z.object({ lead_id: id }), readOnly,
    async ({ lead_id }) => ({ ...(await getLead(lead_id)), live_enrollment: await liveEnrollmentForLead(lead_id) }))
  tool('create_lead', 'Create a lead. Email must be unique. For cold outreach omit source (defaults to cold_email) or set source like "Cold outreach — YC". research/custom accept arbitrary JSON for notes the agent gathers.', leadCreateSchema, mutating,
    (args) => createLead(args))
  tool('update_lead', 'Update lead fields (stage, notes, research, tags, contact info...).', leadUpdateSchema.extend({ lead_id: id }), mutating,
    ({ lead_id, ...patch }) => updateLead(lead_id, patch))
  tool('delete_lead', 'Permanently delete a lead and its emails/enrollments.', z.object({ lead_id: id }), destructive,
    async ({ lead_id }) => { await deleteLead(lead_id); return { deleted: lead_id } })
  tool('bulk_import_leads', 'Create or update many leads at once (max 500). on_conflict=skip keeps existing records untouched.', leadBulkSchema, mutating,
    (args) => bulkUpsertLeads(args.leads, args.on_conflict))

  // ----- Enrichment (Hunter.io) ---------------------------------------------
  tool('find_lead_email', 'Hunter Email Finder: locate the address for a lead from name + company domain and save it (unless apply=false).',
    z.object({ lead_id: id, domain: z.string().optional(), apply: z.boolean().default(true) }), external,
    async ({ lead_id, domain, apply }) => {
      const lead = await getLead(lead_id)
      const names = splitName(lead.full_name)
      const first = lead.first_name || names.first_name
      const last = lead.last_name || names.last_name
      if (!first || !last) throw ApiError.badRequest('Lead needs first and last name')
      const result = await findEmail({ first_name: first, last_name: last, domain: domain || lead.company_domain || undefined, company: lead.company_name || undefined })
      if (result.email && apply) {
        const { data, error } = await db().from('leads').update({
          email: result.email.toLowerCase(),
          email_score: result.score,
          enrichment: { ...lead.enrichment, hunter_finder: { ...result, fetched_at: new Date().toISOString() } },
        }).eq('id', lead.id).select('*').single()
        if (error) throw error
        return { result, lead: data }
      }
      return { result, lead }
    })
  tool('verify_lead_email', 'Hunter Email Verifier: check deliverability of a lead\'s email and store the status on the lead.', z.object({ lead_id: id }), external,
    async ({ lead_id }) => {
      const lead = await getLead(lead_id)
      const result = await verifyEmail(lead.email)
      const { data, error } = await db().from('leads').update({
        email_status: emailStatusFromHunter(result),
        email_score: result.score,
        email_verified_at: new Date().toISOString(),
        enrichment: { ...lead.enrichment, hunter_verifier: { ...result, fetched_at: new Date().toISOString() } },
      }).eq('id', lead.id).select('*').single()
      if (error) throw error
      return { result, lead: data }
    })
  tool('hunter_find_email', 'Hunter Email Finder without touching a lead: name + domain/company → most likely address.',
    z.object({ first_name: z.string(), last_name: z.string(), domain: z.string().optional(), company: z.string().optional() }), external,
    (args) => findEmail(args))
  tool('hunter_verify_email', 'Hunter Email Verifier for any address.', z.object({ email: z.string().email() }), external,
    ({ email }) => verifyEmail(email))

  // ----- Sequences ----------------------------------------------------------
  tool('list_sequences', 'List sequences with enrollment and email stats.', sequenceListQuerySchema, readOnly,
    async (args) => {
      const { data, total } = await listSequences(args)
      return { total, data: await Promise.all(data.map(async (sequence) => ({ ...sequence, stats: await sequenceStats(sequence.id) }))) }
    })
  tool('get_sequence', 'Fetch a sequence with all steps and stats.', z.object({ sequence: sequenceRef }), readOnly,
    async ({ sequence }) => { const full = await getSequenceWithSteps(sequence); return { ...full, stats: await sequenceStats(full.id) } })
  tool('create_sequence', 'Create a sequence, optionally with its steps inline. Sequences start as draft; set status=active when ready. delay_days/hours/minutes are relative to the previous step (first step: relative to enrollment).',
    sequenceCreateSchema, mutating, (args) => createSequence(args))
  tool('update_sequence', 'Update sequence settings or status (draft|active|paused|archived).', sequenceUpdateSchema.extend({ sequence: sequenceRef }), mutating,
    ({ sequence, ...patch }) => updateSequence(sequence, patch))
  tool('delete_sequence', 'Delete a sequence, its steps, and enrollments. Emails already sent are kept.', z.object({ sequence: sequenceRef }), destructive,
    async ({ sequence }) => { await deleteSequence(sequence); return { deleted: sequence } })
  tool('add_sequence_step', 'Append (or insert at position) a step to a sequence.', stepInputSchema.extend({ sequence: sequenceRef }), mutating,
    ({ sequence, ...step }) => addStep(sequence, step))
  tool('update_sequence_step', 'Edit a step (subject, body, delay, condition_prompt, active...).', stepUpdateSchema.extend({ sequence: sequenceRef, step_id: id }), mutating,
    ({ sequence, step_id, ...patch }) => updateStep(sequence, step_id, patch))
  tool('delete_sequence_step', 'Remove a step from a sequence.', z.object({ sequence: sequenceRef, step_id: id }), destructive,
    async ({ sequence, step_id }) => { await deleteStep(sequence, step_id); return { deleted: step_id } })
  tool('reorder_sequence_steps', 'Set the order of all steps by listing every step id in the desired order.', z.object({ sequence: sequenceRef, step_ids: z.array(id).min(1) }), mutating,
    ({ sequence, step_ids }) => reorderSteps(sequence, step_ids))
  tool('preview_sequence', 'Render every step of a sequence for a specific lead (subjects, bodies, schedule, unresolved template tokens). Use before enrolling.',
    z.object({ sequence: sequenceRef, lead_id: id }), readOnly,
    async ({ sequence, lead_id }) => previewSequenceForLead(await resolveSequence(sequence), await getLead(lead_id)))
  tool('enroll_leads', 'Enroll leads (by id or email) into a sequence. Leads already in another live sequence are skipped unless replace_existing=true.',
    enrollSchema.extend({ sequence: sequenceRef }), mutating, ({ sequence, ...input }) => enrollLeads(sequence, input))
  tool('list_enrollments', 'List enrollments for a sequence with lead summary.', enrollmentListQuerySchema.extend({ sequence: sequenceRef }), readOnly,
    async ({ sequence, ...query }) => listEnrollments((await resolveSequence(sequence)).id, query))
  tool('update_enrollment', 'pause | resume | exit | skip_step | reschedule (needs next_step_due_at) a single enrollment.',
    enrollmentActionSchema.extend({ enrollment_id: id }), mutating, ({ enrollment_id, ...action }) => applyEnrollmentAction(enrollment_id, action))
  tool('run_sequence_now', 'Process due steps immediately instead of waiting for the cron. force=true ignores the send window.',
    z.object({ sequence: sequenceRef.optional(), force: z.boolean().default(false) }), external,
    async ({ sequence, force }) => runDueSteps({ sequence_id: sequence ? (await resolveSequence(sequence)).id : undefined, ignore_window: force, limit: 100 }))

  // ----- Email ---------------------------------------------------------------
  tool('send_email', 'Send a one-off email to a lead via Resend. Lead email must be verified first (valid/accept_all/webmail) via verify_lead_email. Set reply_to_email_id to answer in an existing thread (subject may then be empty). Optional lead_magnet_id attaches a personalized PDF.',
    sendEmailSchema, external, (args) => sendOneOff(args))
  tool('list_inbox', 'Inbound replies, newest first. Defaults to unhandled only.', inboxQuerySchema, readOnly, (args) => listInbox(args))
  tool('list_emails', 'Delivery log of sent/received emails with filters.', emailListQuerySchema, readOnly, (args) => listEmails(args))
  tool('get_email', 'Full email record including bodies.', z.object({ email_id: id }), readOnly, ({ email_id }) => getEmail(email_id))
  tool('get_lead_thread', 'Every email exchanged with a lead, oldest first.', z.object({ lead_id: id }), readOnly, ({ lead_id }) => leadThread(lead_id))
  tool('mark_email_handled', 'Mark an inbound email handled (or unhandled) so it leaves the inbox.', z.object({ email_id: id, handled: z.boolean().default(true) }), mutating,
    ({ email_id, handled }) => updateEmail(email_id, { handled, is_read: true }))

  // ----- Templates & lead magnets ------------------------------------------
  tool('list_templates', 'Saved email templates (reusable copy, not tied to a sequence).', z.object({ category: z.string().optional(), q: z.string().optional() }), readOnly,
    (args) => listTemplates(args))
  tool('get_template', 'Fetch a template.', z.object({ template_id: id }), readOnly, ({ template_id }) => getTemplate(template_id))
  tool('create_template', 'Save a reusable template.', templateCreateSchema, mutating, (args) => createTemplate(args))
  tool('update_template', 'Edit a template.', templateUpdateSchema.extend({ template_id: id }), mutating, ({ template_id, ...patch }) => updateTemplate(template_id, patch))
  tool('delete_template', 'Delete a template.', z.object({ template_id: id }), destructive, async ({ template_id }) => { await deleteTemplate(template_id); return { deleted: template_id } })
  tool('list_lead_magnets', 'Lead magnets: Markdown documents rendered to a personalized PDF and attached to a step or one-off email.', z.object({}), readOnly,
    () => listMagnets())
  tool('get_lead_magnet', 'Fetch a lead magnet including its Markdown body.', z.object({ lead_magnet_id: id }), readOnly, ({ lead_magnet_id }) => getMagnet(lead_magnet_id))
  tool('create_lead_magnet', 'Create a lead magnet from Markdown. Supports the same {{variables}} as steps.', magnetCreateSchema, mutating, (args) => createMagnet(args))
  tool('update_lead_magnet', 'Edit a lead magnet.', magnetUpdateSchema.extend({ lead_magnet_id: id }), mutating, ({ lead_magnet_id, ...patch }) => updateMagnet(lead_magnet_id, patch))
  tool('delete_lead_magnet', 'Delete a lead magnet.', z.object({ lead_magnet_id: id }), destructive, async ({ lead_magnet_id }) => { await deleteMagnet(lead_magnet_id); return { deleted: lead_magnet_id } })

  // ----- Campaigns, settings, AI ---------------------------------------------
  tool('list_campaigns', 'Campaigns are simple grouping tags for leads and sequences.', z.object({}), readOnly, () => listCampaigns())
  tool('create_campaign', 'Create a campaign tag.', campaignCreateSchema, mutating, (args) => createCampaign(args))
  tool('get_settings', 'Sender identity, default AI model, landing base URL, and which integrations are configured.', z.object({}), readOnly, () => getAllSettings())
  tool('update_settings', 'Update sender identity (from_name/from_email/reply_to/signature) or default AI model.',
    z.object({
      sender: z.object({ from_name: z.string(), from_email: z.string().email(), reply_to: z.string().email().nullable(), signature: z.string() }).partial().optional(),
      ai: z.object({ default_model: z.string() }).partial().optional(),
    }), mutating,
    async ({ sender, ai }) => {
      if (sender) await updateSetting('sender', sender)
      if (ai) await updateSetting('ai', ai)
      return getAllSettings()
    })
  tool('list_ai_models', 'Novita models available for step conditions. include_catalog=true fetches the full Novita list.', z.object({ include_catalog: z.boolean().default(false) }), readOnly,
    async ({ include_catalog }) => ({
      configured: novitaConfigured(),
      default_model: (await getAllSettings()).ai.default_model,
      presets: MODEL_PRESETS,
      ...(include_catalog && novitaConfigured() ? { catalog: await listNovitaModels() } : {}),
    }))
}
