import { z } from 'zod'
import { campaignCreateSchema, campaignUpdateSchema, magnetCreateSchema, magnetUpdateSchema, templateCreateSchema, templateUpdateSchema } from '@/lib/content/service'
import { emailListQuerySchema, emailUpdateSchema, inboxQuerySchema, sendEmailSchema } from '@/lib/email/service'
import { leadBulkSchema, leadCreateSchema, leadListQuerySchema, leadUpdateSchema } from '@/lib/leads/schemas'
import { enrollSchema, enrollmentActionSchema, enrollmentListQuerySchema, reorderStepsSchema, sequenceCreateSchema, sequenceListQuerySchema, sequenceUpdateSchema, stepInputSchema, stepUpdateSchema } from '@/lib/sequences/schemas'

type Json = Record<string, unknown>

function schema(zodSchema: z.ZodTypeAny): Json {
  const json = z.toJSONSchema(zodSchema, { target: 'draft-2020-12', io: 'input', unrepresentable: 'any' }) as Json
  delete json.$schema
  return json
}

function queryParams(zodSchema: z.ZodObject<z.ZodRawShape>) {
  const json = schema(zodSchema) as { properties?: Record<string, Json>; required?: string[] }
  return Object.entries(json.properties || {}).map(([name, prop]) => ({
    name,
    in: 'query',
    required: json.required?.includes(name) || false,
    schema: prop,
  }))
}

function body(zodSchema: z.ZodTypeAny) {
  return { required: true, content: { 'application/json': { schema: schema(zodSchema) } } }
}

const ok = (description: string) => ({ 200: { description }, 401: { description: 'Missing or invalid API key' } })
const createdRes = (description: string) => ({ 201: { description }, 400: { description: 'Validation failed' }, 409: { description: 'Conflict' } })
const idParam = (name = 'id', description = 'UUID') => ({ name, in: 'path', required: true, schema: { type: 'string' }, description })
const seqParam = { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Sequence UUID or slug' }

export function buildOpenApiSpec(baseUrl: string) {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Bodega CRM API',
      version: '2.0.0',
      description: [
        "Pigeon Labs' API-first cold email CRM. Authenticate every request with `Authorization: Bearer bdg_...`.",
        'Template variables in step/magnet bodies: {{first_name}}, {{last_name}}, {{full_name}}, {{title}}, {{company_name}}, {{company_domain}}, {{research.<key>}}; use {{first_name|there}} for a fallback.',
        'A lead may be in only one live (active/paused) sequence at a time. Replies, bounces, complaints, and unsubscribes end the enrollment automatically.',
      ].join('\n\n'),
    },
    servers: [{ url: `${baseUrl}/api/v1` }],
    security: [{ bearerAuth: [] }],
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', description: 'Bodega API key (bdg_...)' } } },
    paths: {
      '/stats': { get: { summary: 'Pipeline overview', tags: ['Overview'], responses: ok('Overview stats') } },

      '/leads': {
        get: { summary: 'List leads', tags: ['Leads'], parameters: queryParams(leadListQuerySchema), responses: ok('Paginated leads') },
        post: { summary: 'Create lead', tags: ['Leads'], requestBody: body(leadCreateSchema), responses: createdRes('Lead') },
      },
      '/leads/bulk': { post: { summary: 'Bulk create/update leads', tags: ['Leads'], requestBody: body(leadBulkSchema), responses: ok('Import summary') } },
      '/leads/{id}': {
        get: { summary: 'Get lead (with live enrollment)', tags: ['Leads'], parameters: [idParam()], responses: ok('Lead') },
        patch: { summary: 'Update lead', tags: ['Leads'], parameters: [idParam()], requestBody: body(leadUpdateSchema), responses: ok('Lead') },
        delete: { summary: 'Delete lead', tags: ['Leads'], parameters: [idParam()], responses: { 204: { description: 'Deleted' } } },
      },
      '/leads/{id}/emails': { get: { summary: 'Lead email thread', tags: ['Leads'], parameters: [idParam()], responses: ok('Emails oldest first') } },
      '/leads/{id}/find-email': {
        post: {
          summary: 'Hunter Email Finder for this lead', tags: ['Enrichment'], parameters: [idParam()],
          requestBody: { required: false, content: { 'application/json': { schema: schema(z.object({ first_name: z.string().optional(), last_name: z.string().optional(), domain: z.string().optional(), company: z.string().optional(), apply: z.boolean().default(true) })) } } },
          responses: ok('Finder result and updated lead'),
        },
      },
      '/leads/{id}/verify-email': { post: { summary: 'Hunter Email Verifier for this lead', tags: ['Enrichment'], parameters: [idParam()], responses: ok('Verifier result and updated lead') } },
      '/leads/{id}/enroll': {
        post: {
          summary: 'Enroll lead in a sequence', tags: ['Sequences'], parameters: [idParam()],
          requestBody: body(z.object({ sequence_id: z.string(), replace_existing: z.boolean().default(false), start_at: z.string().datetime({ offset: true }).optional() })),
          responses: ok('Enrollment result'),
        },
      },
      '/enrichment/find-email': {
        post: { summary: 'Hunter Email Finder', tags: ['Enrichment'], requestBody: body(z.object({ first_name: z.string(), last_name: z.string(), domain: z.string().optional(), company: z.string().optional() })), responses: ok('Finder result') },
      },
      '/enrichment/verify-email': { post: { summary: 'Hunter Email Verifier', tags: ['Enrichment'], requestBody: body(z.object({ email: z.string().email() })), responses: ok('Verifier result') } },

      '/campaigns': {
        get: { summary: 'List campaigns (grouping tags)', tags: ['Campaigns'], responses: ok('Campaigns with counts') },
        post: { summary: 'Create campaign', tags: ['Campaigns'], requestBody: body(campaignCreateSchema), responses: createdRes('Campaign') },
      },
      '/campaigns/{id}': {
        get: { summary: 'Get campaign', tags: ['Campaigns'], parameters: [idParam('id', 'UUID or slug')], responses: ok('Campaign') },
        patch: { summary: 'Update campaign', tags: ['Campaigns'], parameters: [idParam('id', 'UUID or slug')], requestBody: body(campaignUpdateSchema), responses: ok('Campaign') },
        delete: { summary: 'Delete campaign', tags: ['Campaigns'], parameters: [idParam('id', 'UUID or slug')], responses: { 204: { description: 'Deleted' } } },
      },

      '/sequences': {
        get: { summary: 'List sequences with stats', tags: ['Sequences'], parameters: queryParams(sequenceListQuerySchema), responses: ok('Sequences') },
        post: { summary: 'Create sequence (steps may be inlined)', tags: ['Sequences'], requestBody: body(sequenceCreateSchema), responses: createdRes('Sequence with steps') },
      },
      '/sequences/{id}': {
        get: { summary: 'Get sequence with steps and stats', tags: ['Sequences'], parameters: [seqParam], responses: ok('Sequence') },
        patch: { summary: 'Update sequence / change status', tags: ['Sequences'], parameters: [seqParam], requestBody: body(sequenceUpdateSchema), responses: ok('Sequence') },
        delete: { summary: 'Delete sequence', tags: ['Sequences'], parameters: [seqParam], responses: { 204: { description: 'Deleted' } } },
      },
      '/sequences/{id}/steps': {
        get: { summary: 'List steps', tags: ['Sequences'], parameters: [seqParam], responses: ok('Steps') },
        post: { summary: 'Add step', tags: ['Sequences'], parameters: [seqParam], requestBody: body(stepInputSchema), responses: createdRes('Step') },
      },
      '/sequences/{id}/steps/reorder': { post: { summary: 'Reorder steps', tags: ['Sequences'], parameters: [seqParam], requestBody: body(reorderStepsSchema), responses: ok('Steps') } },
      '/sequences/{id}/steps/{stepId}': {
        get: { summary: 'Get step', tags: ['Sequences'], parameters: [seqParam, idParam('stepId')], responses: ok('Step') },
        patch: { summary: 'Update step', tags: ['Sequences'], parameters: [seqParam, idParam('stepId')], requestBody: body(stepUpdateSchema), responses: ok('Step') },
        delete: { summary: 'Delete step', tags: ['Sequences'], parameters: [seqParam, idParam('stepId')], responses: { 204: { description: 'Deleted' } } },
      },
      '/sequences/{id}/enrollments': {
        get: { summary: 'List enrollments', tags: ['Sequences'], parameters: [seqParam, ...queryParams(enrollmentListQuerySchema)], responses: ok('Enrollments') },
        post: { summary: 'Enroll leads', tags: ['Sequences'], parameters: [seqParam], requestBody: body(enrollSchema), responses: createdRes('Enrolled + skipped') },
      },
      '/sequences/{id}/enrollments/{enrollmentId}': {
        get: { summary: 'Get enrollment with step executions', tags: ['Sequences'], parameters: [seqParam, idParam('enrollmentId')], responses: ok('Enrollment') },
        patch: { summary: 'pause | resume | exit | skip_step | reschedule', tags: ['Sequences'], parameters: [seqParam, idParam('enrollmentId')], requestBody: body(enrollmentActionSchema), responses: ok('Enrollment') },
        delete: { summary: 'Exit enrollment', tags: ['Sequences'], parameters: [seqParam, idParam('enrollmentId')], responses: ok('Enrollment') },
      },
      '/sequences/{id}/preview': {
        get: {
          summary: 'Render every step for a lead', tags: ['Sequences'],
          parameters: [seqParam, { name: 'lead_id', in: 'query', schema: { type: 'string' } }, { name: 'email', in: 'query', schema: { type: 'string' } }],
          responses: ok('Rendered steps with schedule and unresolved tokens'),
        },
      },
      '/sequences/{id}/run': {
        post: { summary: 'Process due steps now', tags: ['Sequences'], parameters: [seqParam, { name: 'force', in: 'query', schema: { type: 'boolean' }, description: 'Ignore send window' }], responses: ok('Run summary') },
      },

      '/emails': { get: { summary: 'Delivery log', tags: ['Email'], parameters: queryParams(emailListQuerySchema), responses: ok('Emails') } },
      '/emails/send': { post: { summary: 'Send a one-off email or reply', tags: ['Email'], requestBody: body(sendEmailSchema), responses: createdRes('Email') } },
      '/emails/{id}': {
        get: { summary: 'Get email', tags: ['Email'], parameters: [idParam()], responses: ok('Email') },
        patch: { summary: 'Mark read / handled', tags: ['Email'], parameters: [idParam()], requestBody: body(emailUpdateSchema), responses: ok('Email') },
      },
      '/threads/{threadId}': { get: { summary: 'Get thread', tags: ['Email'], parameters: [idParam('threadId')], responses: ok('Emails oldest first') } },
      '/inbox': { get: { summary: 'Inbound replies', tags: ['Email'], parameters: queryParams(inboxQuerySchema), responses: ok('Inbound emails') } },

      '/templates': {
        get: { summary: 'List templates', tags: ['Content'], parameters: [{ name: 'category', in: 'query', schema: { type: 'string' } }, { name: 'q', in: 'query', schema: { type: 'string' } }], responses: ok('Templates') },
        post: { summary: 'Create template', tags: ['Content'], requestBody: body(templateCreateSchema), responses: createdRes('Template') },
      },
      '/templates/{id}': {
        get: { summary: 'Get template', tags: ['Content'], parameters: [idParam()], responses: ok('Template') },
        patch: { summary: 'Update template', tags: ['Content'], parameters: [idParam()], requestBody: body(templateUpdateSchema), responses: ok('Template') },
        delete: { summary: 'Delete template', tags: ['Content'], parameters: [idParam()], responses: { 204: { description: 'Deleted' } } },
      },
      '/lead-magnets': {
        get: { summary: 'List lead magnets', tags: ['Content'], responses: ok('Lead magnets') },
        post: { summary: 'Create lead magnet (Markdown → PDF)', tags: ['Content'], requestBody: body(magnetCreateSchema), responses: createdRes('Lead magnet') },
      },
      '/lead-magnets/{id}': {
        get: { summary: 'Get lead magnet', tags: ['Content'], parameters: [idParam()], responses: ok('Lead magnet') },
        patch: { summary: 'Update lead magnet', tags: ['Content'], parameters: [idParam()], requestBody: body(magnetUpdateSchema), responses: ok('Lead magnet') },
        delete: { summary: 'Delete lead magnet', tags: ['Content'], parameters: [idParam()], responses: { 204: { description: 'Deleted' } } },
      },
      '/lead-magnets/{id}/preview': {
        get: { summary: 'Render personalized PDF', tags: ['Content'], parameters: [idParam(), { name: 'lead_id', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'application/pdf' } } },
      },

      '/ai/models': { get: { summary: 'Novita model presets (and catalog with ?all=true)', tags: ['Settings'], parameters: [{ name: 'all', in: 'query', schema: { type: 'boolean' } }], responses: ok('Models') } },
      '/settings': {
        get: { summary: 'Sender identity, AI default model, integrations', tags: ['Settings'], responses: ok('Settings') },
        patch: { summary: 'Update settings', tags: ['Settings'], requestBody: body(z.object({ ai: z.object({ default_model: z.string() }).partial().optional(), sender: z.object({ from_name: z.string(), from_email: z.string().email(), reply_to: z.string().email().nullable(), signature: z.string() }).partial().optional() })), responses: ok('Settings') },
      },
      '/api-keys': {
        get: { summary: 'List API keys (console session only)', tags: ['Settings'], responses: ok('Keys') },
        post: { summary: 'Create API key (console session only)', tags: ['Settings'], requestBody: body(z.object({ name: z.string() })), responses: createdRes('Key (plaintext returned once)') },
      },
      '/api-keys/{id}': { delete: { summary: 'Revoke API key (console session only)', tags: ['Settings'], parameters: [idParam()], responses: ok('Revoked key') } },
    },
  }
}
