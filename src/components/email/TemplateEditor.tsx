// src/components/email/TemplateEditor.tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, Copy, Mail, Eye, EyeOff, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
// Separator component not available, using custom divider
// Toast functionality not available in current UI setup
import { generateFollowUp } from '@/lib/api/ai'
import {
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
  useEmailTemplate,
  useIncrementTemplateUsage,
} from '@/hooks/use-email-templates'
// EmailTemplate type from database
import { cn } from '@/lib/utils'

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  category: z.string().default('general'),
  is_shared: z.boolean().default(false),
  tags: z.string().optional(),
})

type TemplateFormValues = z.infer<typeof templateSchema>

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  category: 'general' | 'follow_up' | 'meeting_followup' | 'intro' | 'pitch' | 'deal_update' | 'newsletter'
  tags: string[] | null
  is_shared: boolean
  created_at: string
  updated_at: string
  user_id: string
  org_id: string | null
  last_used_at: string | null
}

type TemplateEditorProps = {
  template?: Partial<EmailTemplate> | null
  onClose: () => void
  onSave?: (template: EmailTemplate) => void
}

export function TemplateEditor({
  template,
  onClose,
  onSave,
}: TemplateEditorProps) {
  // Toast functionality not available in current UI setup
  const [previewMode, setPreviewMode] = useState(false)
  const [variables] = useState([
    { label: 'Contact Name', value: '{{contact_name}}' },
    { label: 'Company Name', value: '{{company_name}}' },
    { label: 'Deal Title', value: '{{deal_title}}' },
    { label: 'Your Name', value: '{{your_name}}' },
    { label: 'Your Company', value: '{{your_company}}' },
    { label: 'Action Item 1', value: '{{action_item_1}}' },
    { label: 'Action Item 2', value: '{{action_item_2}}' },
    { label: 'Meeting Date', value: '{{meeting_date}}' },
    { label: 'Follow-up Days', value: '{{follow_up_days}}' },
  ])

  const createMutation = useCreateEmailTemplate()
  const updateMutation = useUpdateEmailTemplate()
  const incrementUsage = useIncrementTemplateUsage()
  const { data: existingTemplate } = useEmailTemplate(template?.id)

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      subject: '',
      body: '',
      category: 'general',
      is_shared: false,
      tags: '',
    },
  })

  // Update form when template changes
  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        subject: template.subject,
        body: template.body,
        category: template.category,
        is_shared: template.is_shared,
        tags: template.tags?.join(', ') || '',
      })
    } else {
      form.reset({
        name: '',
        subject: '',
        body: '',
        category: 'general',
        is_shared: false,
        tags: '',
      })
    }
  }, [template, form])

  const onSubmit = async (values: TemplateFormValues) => {
    try {
      const templateData = {
        ...values,
        tags: values.tags
          ? values.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
          : [],
        category: values.category as 'general' | 'follow_up' | 'intro' | 'pitch' | 'meeting_followup' | 'deal_update' | 'newsletter',
        org_id: null,
        last_used_at: null
      }

      if (template?.id) {
        const { data } = await updateMutation.mutateAsync({
          id: template.id,
          updates: { ...templateData, id: template.id },
        })
        if (data) {
          // Toast functionality not available
          console.log('Template updated:', data)
          onSave?.(data)
        }
      } else {
        const { data } = await createMutation.mutateAsync({
          ...templateData,
          org_id: null,
          last_used_at: null
        })
        if (data) {
          // Toast functionality not available
          console.log('Template created:', data)
          onSave?.(data)
        }
      }
      onClose()
    } catch (error) {
      console.error('Failed to save template:', error)
      // Toast functionality not available
    }
  }

  const handleGenerateAI = async () => {
    const subject = form.getValues('subject')
    const body = form.getValues('body')
    
    if (!subject && !body) {
      console.error('Cannot generate: Please provide at least a subject or some content')
      return
    }

    try {
      const result = await generateFollowUp({
        contactName: 'Contact Name',
        contactEmail: 'contact@example.com',
        daysSinceLastContact: 7,
        userName: 'Your Name',
      })

      if (result) {
        const { subject: aiSubject, body: aiBody } = result
        if (aiSubject) form.setValue('subject', aiSubject)
        if (aiBody) form.setValue('body', aiBody)
        
        console.log('AI Generated: Follow-up template generated successfully.')
      }
    } catch (error) {
      console.error('Generation failed: Unable to generate template. Please try again.', error)
    }
  }

  const handleInsertVariable = (variable: string) => {
    const currentBody = form.getValues('body')
    const cursorPos = (document.activeElement as HTMLTextAreaElement)?.selectionStart || currentBody.length
    
    const newBody = 
      currentBody.slice(0, cursorPos) + 
      variable + 
      currentBody.slice(cursorPos)
    
    form.setValue('body', newBody)
    
    // Focus back on textarea
    const textarea = document.querySelector('textarea[name="body"]') as HTMLTextAreaElement
    if (textarea) {
      textarea.focus()
      const newCursorPos = cursorPos + variable.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }
  }

  const handleUseTemplate = async () => {
    if (template?.id) {
      await incrementUsage.mutateAsync(template.id)
    }
  }

  const previewBody = form.watch('body')
  const previewSubject = form.watch('subject')

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Template Name
            </label>
            <Input placeholder="e.g., Follow-up after meeting" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm font-medium text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Subject
            </label>
            <Input placeholder="e.g., Following up on our meeting" {...form.register('subject')} />
            {form.formState.errors.subject && (
              <p className="text-sm font-medium text-red-500">{form.formState.errors.subject.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Category
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...form.register('category')}
            >
              <option value="general">General</option>
              <option value="follow_up">Follow-up</option>
              <option value="meeting_followup">Meeting Follow-up</option>
              <option value="intro">Introduction</option>
              <option value="pitch">Pitch</option>
              <option value="deal_update">Deal Update</option>
              <option value="newsletter">Newsletter</option>
            </select>
            {form.formState.errors.category && (
              <p className="text-sm font-medium text-red-500">{form.formState.errors.category.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Body
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  {previewMode ? (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" />
                      Edit
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateAI}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI Generate
                </Button>
              </div>
            </div>
            {previewMode ? (
              <div className="rounded-md border bg-slate-50 p-4 min-h-[200px]">
                <div className="font-semibold text-slate-900 mb-2">
                  Subject: {previewSubject}
                </div>
                <div className="prose prose-sm max-w-none">
                  {previewBody.split('\n').map((line, i) => {
                    const parts = []
                    let lastIndex = 0
                    const regex = /\{\{[^}]+\}\}/g
                    let match
                    while ((match = regex.exec(line)) !== null) {
                      if (match.index > lastIndex) {
                        parts.push(line.substring(lastIndex, match.index))
                      }
                      parts.push(
                        <Badge key={`${i}-${match.index}`} variant="outline" className="mx-1">
                          {match[0]}
                        </Badge>
                      )
                      lastIndex = match.index + match[0].length
                    }
                    if (lastIndex < line.length) {
                      parts.push(line.substring(lastIndex))
                    }
                    return (
                      <p key={i} className="mb-2">
                        {parts}
                      </p>
                    )
                  })}
                </div>
              </div>
            ) : (
              <Textarea
                placeholder="Write your email template here..."
                className="min-h-[200px] font-mono text-sm"
                {...form.register('body')}
              />
            )}
            {form.formState.errors.body && (
              <p className="text-sm font-medium text-red-500">{form.formState.errors.body.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Use {'{{variables}}'} to insert dynamic content
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Variables
            </label>
            <div className="flex flex-wrap gap-2">
              {variables.map((variable) => (
                <Badge
                  key={variable.value}
                  variant="outline"
                  className="cursor-pointer hover:bg-slate-100"
                  onClick={() => handleInsertVariable(variable.value)}
                >
                  {variable.label}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Click to insert variable at cursor position
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <label className="text-base font-medium leading-none">Shared with team</label>
              <p className="text-sm text-muted-foreground">
                Make this template available to other members of your organization
              </p>
            </div>
            <Switch
              checked={form.watch('is_shared')}
              onCheckedChange={(checked) => form.setValue('is_shared', checked)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Tags
            </label>
            <Input placeholder="e.g., follow-up, meeting, investor" {...form.register('tags')} />
            {form.formState.errors.tags && (
              <p className="text-sm font-medium text-red-500">{form.formState.errors.tags.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Comma-separated tags for organization
            </p>
          </div>

          <div className="h-px w-full bg-slate-200 my-4" />

          <div className="space-y-4">
            <h4 className="font-medium">Template Stats</h4>
            {template?.id && existingTemplate?.data && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Usage Count</span>
                  <span className="font-medium">
                    {existingTemplate.data.usage_count}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Last Used</span>
                  <span className="font-medium">
                    {existingTemplate.data.last_used_at
                      ? new Date(existingTemplate.data.last_used_at).toLocaleDateString()
                      : 'Never'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Created</span>
                  <span className="font-medium">
                    {new Date(existingTemplate.data.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {template?.id && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleUseTemplate}
              disabled={incrementUsage.isPending}
            >
              <Copy className="mr-2 h-4 w-4" />
              Use This Template
            </Button>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {template?.id ? 'Update Template' : 'Create Template'}
          </Button>
        </div>
      </form>
  )
}
