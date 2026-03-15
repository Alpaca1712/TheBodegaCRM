export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          avatar_url: string | null
          active_org_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          avatar_url?: string | null
          active_org_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          avatar_url?: string | null
          active_org_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      org_members: {
        Row: {
          id: string
          org_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member' | 'viewer'
          invited_by: string | null
          joined_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          invited_by?: string | null
          joined_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          invited_by?: string | null
          joined_at?: string
        }
      }
      org_invites: {
        Row: {
          id: string
          org_id: string
          email: string
          role: 'admin' | 'member' | 'viewer'
          invited_by: string
          token: string
          expires_at: string
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          email: string
          role?: 'admin' | 'member' | 'viewer'
          invited_by: string
          token?: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          email?: string
          role?: 'admin' | 'member' | 'viewer'
          invited_by?: string
          token?: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
      }
      email_accounts: {
        Row: {
          id: string
          user_id: string
          org_id: string | null
          provider: 'gmail'
          email_address: string
          access_token: string
          refresh_token: string
          token_expires_at: string
          sync_enabled: boolean
          last_synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          org_id?: string | null
          provider?: 'gmail'
          email_address: string
          access_token: string
          refresh_token: string
          token_expires_at: string
          sync_enabled?: boolean
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          org_id?: string | null
          provider?: 'gmail'
          email_address?: string
          access_token?: string
          refresh_token?: string
          token_expires_at?: string
          sync_enabled?: boolean
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      email_summaries: {
        Row: {
          id: string
          user_id: string
          org_id: string | null
          email_account_id: string
          gmail_message_id: string
          thread_id: string | null
          subject: string | null
          from_address: string
          to_addresses: string[] | null
          date: string
          snippet: string | null
          ai_summary: string | null
          ai_sentiment: 'positive' | 'neutral' | 'negative' | 'urgent' | null
          ai_action_items: string[] | null
          ai_suggested_stage: string | null
          ai_follow_up_draft: string | null
          lead_id: string | null
          is_read: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          org_id?: string | null
          email_account_id: string
          gmail_message_id: string
          thread_id?: string | null
          subject?: string | null
          from_address: string
          to_addresses?: string[] | null
          date: string
          snippet?: string | null
          ai_summary?: string | null
          ai_sentiment?: 'positive' | 'neutral' | 'negative' | 'urgent' | null
          ai_action_items?: string[] | null
          ai_suggested_stage?: string | null
          ai_follow_up_draft?: string | null
          lead_id?: string | null
          is_read?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          org_id?: string | null
          email_account_id?: string
          gmail_message_id?: string
          thread_id?: string | null
          subject?: string | null
          from_address?: string
          to_addresses?: string[] | null
          date?: string
          snippet?: string | null
          ai_summary?: string | null
          ai_sentiment?: 'positive' | 'neutral' | 'negative' | 'urgent' | null
          ai_action_items?: string[] | null
          ai_suggested_stage?: string | null
          ai_follow_up_draft?: string | null
          lead_id?: string | null
          is_read?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      email_templates: {
        Row: {
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
        Insert: {
          id?: string
          user_id: string
          org_id?: string | null
          name: string
          subject: string
          body: string
          category?: 'general' | 'follow_up' | 'intro' | 'pitch' | 'meeting_followup' | 'deal_update' | 'newsletter'
          is_shared?: boolean
          tags?: string[] | null
          usage_count?: number
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          org_id?: string | null
          name?: string
          subject?: string
          body?: string
          category?: 'general' | 'follow_up' | 'intro' | 'pitch' | 'meeting_followup' | 'deal_update' | 'newsletter'
          is_shared?: boolean
          tags?: string[] | null
          usage_count?: number
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reminders: {
        Row: {
          id: string
          user_id: string
          org_id: string | null
          type: 'stale_deal' | 'stale_contact' | 'overdue_activity' | 'upcoming_followup'
          title: string
          description: string | null
          entity_type: 'contact' | 'company' | 'deal' | 'activity' | 'investor' | 'lead'
          entity_id: string
          due_date: string | null
          is_read: boolean
          is_resolved: boolean
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          org_id?: string | null
          type: 'stale_deal' | 'stale_contact' | 'overdue_activity' | 'upcoming_followup'
          title: string
          description?: string | null
          entity_type: 'contact' | 'company' | 'deal' | 'activity' | 'investor' | 'lead'
          entity_id: string
          due_date?: string | null
          is_read?: boolean
          is_resolved?: boolean
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          org_id?: string | null
          type?: 'stale_deal' | 'stale_contact' | 'overdue_activity' | 'upcoming_followup'
          title?: string
          description?: string | null
          entity_type?: 'contact' | 'company' | 'deal' | 'activity' | 'investor' | 'lead'
          entity_id?: string
          due_date?: string | null
          is_read?: boolean
          is_resolved?: boolean
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type EmailSummary = Database['public']['Tables']['email_summaries']['Row']

export type Reminder = Database['public']['Tables']['reminders']['Row']

export type ReminderInsert = Database['public']['Tables']['reminders']['Insert']

export type ReminderUpdate = Database['public']['Tables']['reminders']['Update']
