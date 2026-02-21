'use client'

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Send, Edit2, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export interface FollowUpDraftProps {
  initialSubject: string
  initialBody: string
  contactName: string
  contactEmail: string
  onSend?: (subject: string, body: string) => void
  className?: string
}

export default function FollowUpDraft({
  initialSubject,
  initialBody,
  contactName,
  contactEmail,
  onSend,
  className,
}: FollowUpDraftProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [subject, setSubject] = useState(initialSubject)
  const [body, setBody] = useState(initialBody)
  const [copied, setCopied] = useState(false)
  
  const handleEdit = () => {
    setIsEditing(!isEditing)
  }
  
  const handleSend = () => {
    if (onSend) {
      onSend(subject, body)
    }
  }
  
  const handleCopy = () => {
    const emailText = `Subject: ${subject}\n\n${body}`
    navigator.clipboard.writeText(emailText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const handleReset = () => {
    setSubject(initialSubject)
    setBody(initialBody)
    setIsEditing(false)
  }
  
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Follow-up Draft</CardTitle>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-sm">
              To: {contactName} &lt;{contactEmail}&gt;
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Subject
          </label>
          {isEditing ? (
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full"
              placeholder="Email subject"
            />
          ) : (
            <div className="p-2.5 bg-zinc-50 rounded border text-zinc-700">
              {subject}
            </div>
          )}
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-zinc-700">
              Body
            </label>
            <span className="text-xs text-zinc-500">
              {isEditing ? 'Editing' : 'Read-only'}
            </span>
          </div>
          {isEditing ? (
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full min-h-[200px] font-mono text-sm"
              placeholder="Email body"
            />
          ) : (
            <div className="p-2.5 bg-zinc-50 rounded border text-zinc-700 whitespace-pre-line min-h-[200px]">
              {body}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between pt-0">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEdit}
            className="gap-1.5"
          >
            <Edit2 className="h-4 w-4" />
            {isEditing ? 'Preview' : 'Edit'}
          </Button>
          {isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
            >
              Reset
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-1.5"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSend}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
          >
            <Send className="h-4 w-4" />
            Send Email
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
