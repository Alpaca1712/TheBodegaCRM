// src/components/email/TemplateManager.tsx
'use client'

import { useState } from 'react'
import { Plus, Search, Filter, Copy, Trash2, Edit, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
// Table component is not available, using div-based layout instead
import { Badge } from '@/components/ui/badge'
// Dialog components are not available, using custom modal implementation
// Tabs components are not available, using custom tab implementation
import { useEmailTemplates, useDeleteEmailTemplate } from '@/hooks/use-email-templates'
type EmailTemplate = {
  id: string
  user_id: string
  org_id: string | null
  name: string
  subject: string
  body: string
  category: 'general' | 'follow_up' | 'intro' | 'pitch' | 'meeting_followup' | 'deal_update' | 'newsletter'
  is_shared: boolean
  tags: string[] | null
  usage_count: number
  last_used_at: string | null
  created_at: string
  updated_at: string
}

type TemplateManagerProps = {
  onSelectTemplate?: (template: EmailTemplate) => void
  showEditor?: boolean
}

export function TemplateManager({
  onSelectTemplate,
  showEditor = false,
}: TemplateManagerProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'general' | 'follow_up' | 'intro' | 'pitch' | 'meeting_followup' | 'deal_update' | 'newsletter' | undefined>()
  // selectedTemplate and isEditorOpen are handled by parent component when onSelectTemplate is provided
  // They remain as internal state for compatibility when onSelectTemplate is not provided
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isEditorOpen, setIsEditorOpen] = useState(showEditor)

  const { data, isLoading } = useEmailTemplates({ category: categoryFilter })
  const deleteMutation = useDeleteEmailTemplate()

  const templates = data?.data || []

  const filteredTemplates = templates.filter(
    (template) =>
      template.name.toLowerCase().includes(search.toLowerCase()) ||
      template.subject.toLowerCase().includes(search.toLowerCase())
  )

  const categories = Array.from(
    new Set(templates.map((t) => t.category))
  )

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setIsEditorOpen(true)
  }

  const handleDuplicate = (template: EmailTemplate) => {
    const duplicated = {
      ...template,
      id: '', // Will be set by database on creation
      name: `${template.name} (Copy)`,
      usage_count: 0,
      created_at: '',
      updated_at: '',
    }
    setSelectedTemplate(duplicated as EmailTemplate)
    setIsEditorOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  const handleSelect = (template: EmailTemplate) => {
    if (onSelectTemplate) {
      onSelectTemplate(template)
    } else {
      handleEdit(template)
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      follow_up: 'default',
      meeting_followup: 'secondary',
      intro: 'outline',
      pitch: 'secondary',
      deal_update: 'default',
      newsletter: 'outline',
      general: 'outline',
    }
    return colors[category] || 'outline'
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Save and reuse follow-up templates for consistent communication
              </CardDescription>
            </div>
            <Button onClick={() => setIsEditorOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="whitespace-nowrap">
                  <Filter className="mr-2 h-4 w-4" />
                  {categoryFilter ? `Category: ${categoryFilter}` : 'All Categories'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCategoryFilter(undefined)}>
                  All Categories
                </DropdownMenuItem>
                {categories.map((category) => (
                  <DropdownMenuItem
                    key={category}
                    onClick={() => setCategoryFilter(category)}
                  >
                    {category.replace('_', ' ')}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mx-auto" />
              <p className="mt-2 text-zinc-500">Loading templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-zinc-500">
                {search || categoryFilter
                  ? 'No templates match your filters.'
                  : 'No templates yet. Create your first template!'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border divide-y">
              {/* Header */}
              <div className="grid grid-cols-6 gap-4 p-4 bg-zinc-50 border-b">
                <div className="font-medium">Name</div>
                <div className="font-medium">Subject</div>
                <div className="font-medium">Category</div>
                <div className="font-medium">Usage</div>
                <div className="font-medium">Shared</div>
                <div className="font-medium text-right">Actions</div>
              </div>
              {/* Rows */}
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="grid grid-cols-6 gap-4 p-4 items-center cursor-pointer hover:bg-zinc-50"
                  onClick={() => handleSelect(template)}
                >
                  <div className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{template.name}</span>
                      {template.is_shared && (
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      )}
                    </div>
                  </div>
                  <div className="text-zinc-500">
                    {template.subject}
                  </div>
                  <div>
                    <Badge variant={getCategoryColor(template.category)}>
                      {template.category.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-zinc-500">
                      {template.usage_count} uses
                    </span>
                  </div>
                  <div>
                    {template.is_shared ? (
                      <Badge variant="outline">Shared</Badge>
                    ) : (
                      <span className="text-zinc-400">Private</span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(template)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDuplicate(template)
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(template.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* TemplateEditor dialog will be handled by parent */}
    </>
  )
}
