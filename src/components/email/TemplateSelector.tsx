// src/components/email/TemplateSelector.tsx
'use client'

import { useState } from 'react'
import { Search, Copy, Check, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useEmailTemplates, usePopularTemplates } from '@/hooks/use-email-templates'
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

type TemplateSelectorProps = {
  onSelectTemplate: (template: EmailTemplate) => void
  disabled?: boolean
  buttonText?: string
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive'
  buttonSize?: 'default' | 'sm' | 'lg'
}

// Dialog component not available, using custom modal implementation
const ModalWrapper = ({ children, isOpen }: { children: React.ReactNode, isOpen: boolean }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
    <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[80vh] w-full overflow-hidden">
      {children}
    </div>
  </div>
);

export function TemplateSelector({
  onSelectTemplate,
  disabled = false,
  buttonText = 'Select Template',
  buttonVariant = 'outline',
  buttonSize = 'default',
}: TemplateSelectorProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'general' | 'follow_up' | 'intro' | 'pitch' | 'meeting_followup' | 'deal_update' | 'newsletter' | undefined>()
  const [isOpen, setIsOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { data: templatesData } = useEmailTemplates({ category: selectedCategory })
  const { data: popularData } = usePopularTemplates(5)

  const templates = templatesData?.data || []
  const popularTemplates = popularData?.data || []

  const categories = Array.from(new Set(templates.map((t) => t.category)))

  const filteredTemplates = templates.filter(
    (template) =>
      template.name.toLowerCase().includes(search.toLowerCase()) ||
      template.subject.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (template: EmailTemplate) => {
    onSelectTemplate(template)
    setIsOpen(false)
    setSearch('')
    setSelectedCategory(undefined)
  }

  const handleCopy = async (template: EmailTemplate) => {
    try {
      const text = `Subject: ${template.subject}\n\n${template.body}`
      await navigator.clipboard.writeText(text)
      setCopiedId(template.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
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
      <Button 
        variant={buttonVariant} 
        size={buttonSize} 
        disabled={disabled}
        onClick={() => setIsOpen(true)}
      >
        {buttonText}
      </Button>
      
      {isOpen && (
        <ModalWrapper isOpen={isOpen}>
          <div className="p-6 overflow-y-auto max-h-[80vh]">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold">Select Email Template</h2>
                <p className="text-zinc-500">
                  Choose from your saved templates or create a new one
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0"
              >
                ×
              </Button>
            </div>

        <div className="space-y-6">
          {/* Search and Filter */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === undefined ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(undefined)}
              >
                All Categories
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>

          {/* Popular Templates */}
          {popularTemplates.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                Most Used Templates
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {popularTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="rounded-lg border p-4 hover:border-zinc-300 hover:bg-zinc-50 cursor-pointer transition-colors"
                    onClick={() => handleSelect(template)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h5 className="font-medium">{template.name}</h5>
                        <p className="text-sm text-zinc-500 truncate">
                          {template.subject}
                        </p>
                      </div>
                      <Badge variant={getCategoryColor(template.category)}>
                        {template.category.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-xs text-zinc-400 flex items-center justify-between">
                      <span>{template.usage_count} uses</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopy(template)
                        }}
                      >
                        {copiedId === template.id ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Templates */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium">All Templates</h4>
              <span className="text-sm text-zinc-500">
                {filteredTemplates.length} templates
              </span>
            </div>
            
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                {search ? (
                  <p>No templates match your search.</p>
                ) : selectedCategory ? (
                  <p>No templates in this category.</p>
                ) : (
                  <p>No templates available.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="rounded-lg border p-4 hover:border-zinc-300 hover:bg-zinc-50 cursor-pointer transition-colors"
                    onClick={() => handleSelect(template)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h5 className="font-medium">{template.name}</h5>
                        <p className="text-sm text-zinc-500">
                          {template.subject}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getCategoryColor(template.category)}>
                          {template.category.replace('_', ' ')}
                        </Badge>
                        {template.is_shared && (
                          <Badge variant="outline" className="text-xs">
                            Shared
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-400 flex items-center justify-between">
                      <div className="flex gap-2">
                        {template.tags?.slice(0, 2).map((tag: string) => (
                          <span key={tag} className="bg-zinc-100 px-2 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                        {template.tags && template.tags.length > 2 && (
                          <span className="text-zinc-400">
                            +{template.tags.length - 2} more
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopy(template)
                        }}
                      >
                        {copiedId === template.id ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

            <div className="pt-4 border-t mt-6">
              <p className="text-sm text-zinc-500 text-center">
                Need a custom template? Use AI to generate one based on your context.
              </p>
            </div>
          </div>
        </ModalWrapper>
      )}
    </>
  )
}
