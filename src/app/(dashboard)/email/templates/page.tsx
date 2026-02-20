// src/app/(dashboard)/email/templates/page.tsx
import { Metadata } from 'next'
import { TemplateManager } from '@/components/email/TemplateManager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Sparkles } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Email Templates | TheBodegaCRM',
  description: 'Manage your reusable email templates for follow-ups and communications',
}

export default function EmailTemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-slate-500">
            Save and reuse email templates for consistent communication with contacts and investors
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/email">
            <Button variant="outline">
              <Sparkles className="mr-2 h-4 w-4" />
              AI Email Hub
            </Button>
          </Link>
          <Link href="/email/compose">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Compose Email
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TemplateManager />
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How to Use Templates</CardTitle>
              <CardDescription>
                Tips for effective email templates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Variables</h4>
                <p className="text-sm text-slate-600">
                  Use {'{{contact_name}}'}, {'{{company_name}}'}, and other variables to personalize emails.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">AI Generation</h4>
                <p className="text-sm text-slate-600">
                  Use AI to generate templates based on your context and tone preferences.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Sharing</h4>
                <p className="text-sm text-slate-600">
                  Share templates with your team for consistent messaging across the organization.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/email/compose?template=new">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  New Template from AI
                </Button>
              </Link>
              <Link href="/contacts">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Email All Contacts
                </Button>
              </Link>
              <Link href="/investors">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Email All Investors
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
