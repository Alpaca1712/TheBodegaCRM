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
      contacts: {
        Row: {
          id: string
          user_id: string
          org_id: string | null
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          company_id: string | null
          title: string | null
          status: 'active' | 'inactive' | 'lead'
          source: string | null
          notes: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          org_id?: string | null
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          company_id?: string | null
          title?: string | null
          status?: 'active' | 'inactive' | 'lead'
          source?: string | null
          notes?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          org_id?: string | null
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          company_id?: string | null
          title?: string | null
          status?: 'active' | 'inactive' | 'lead'
          source?: string | null
          notes?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          user_id: string
          org_id: string | null
          name: string
          domain: string | null
          industry: string | null
          size: '1-10' | '11-50' | '51-200' | '201-500' | '500+' | null
          website: string | null
          phone: string | null
          address_line1: string | null
          address_city: string | null
          address_state: string | null
          address_country: string | null
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          org_id?: string | null
          name: string
          domain?: string | null
          industry?: string | null
          size?: '1-10' | '11-50' | '51-200' | '201-500' | '500+' | null
          website?: string | null
          phone?: string | null
          address_line1?: string | null
          address_city?: string | null
          address_state?: string | null
          address_country?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          org_id?: string | null
          name?: string
          domain?: string | null
          industry?: string | null
          size?: '1-10' | '11-50' | '51-200' | '201-500' | '500+' | null
          website?: string | null
          phone?: string | null
          address_line1?: string | null
          address_city?: string | null
          address_state?: string | null
          address_country?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      deals: {
        Row: {
          id: string
          user_id: string
          org_id: string | null
          title: string
          value: number | null
          currency: string
          stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
          contact_id: string | null
          company_id: string | null
          expected_close_date: string | null
          probability: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          org_id?: string | null
          title: string
          value?: number | null
          currency?: string
          stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
          contact_id?: string | null
          company_id?: string | null
          expected_close_date?: string | null
          probability?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          org_id?: string | null
          title?: string
          value?: number | null
          currency?: string
          stage?: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
          contact_id?: string | null
          company_id?: string | null
          expected_close_date?: string | null
          probability?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          user_id: string
          org_id: string | null
          type: 'call' | 'email' | 'meeting' | 'task' | 'note'
          title: string
          description: string | null
          contact_id: string | null
          company_id: string | null
          deal_id: string | null
          due_date: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          org_id?: string | null
          type: 'call' | 'email' | 'meeting' | 'task' | 'note'
          title: string
          description?: string | null
          contact_id?: string | null
          company_id?: string | null
          deal_id?: string | null
          due_date?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          org_id?: string | null
          type?: 'call' | 'email' | 'meeting' | 'task' | 'note'
          title?: string
          description?: string | null
          contact_id?: string | null
          company_id?: string | null
          deal_id?: string | null
          due_date?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          contact_id: string | null
          company_id: string | null
          deal_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content: string
          contact_id?: string | null
          company_id?: string | null
          deal_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          contact_id?: string | null
          company_id?: string | null
          deal_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          user_id: string
          org_id: string | null
          name: string
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          org_id?: string | null
          name: string
          color: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          org_id?: string | null
          name?: string
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
      contact_tags: {
        Row: {
          contact_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          contact_id: string
          tag_id: string
          created_at?: string
        }
        Update: {
          contact_id?: string
          tag_id?: string
          created_at?: string
        }
      }
      investors: {
        Row: {
          id: string
          user_id: string
          org_id: string | null
          name: string
          firm: string | null
          email: string | null
          phone: string | null
          website: string | null
          linkedin_url: string | null
          type: 'vc' | 'angel' | 'family_office' | 'corporate' | 'accelerator' | 'other'
          check_size_min: number | null
          check_size_max: number | null
          stage_preference: string[] | null
          thesis: string | null
          notes: string | null
          relationship_status: 'cold' | 'warm' | 'hot' | 'portfolio' | 'passed'
          last_contacted_at: string | null
          contact_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          org_id?: string | null
          name: string
          firm?: string | null
          email?: string | null
          phone?: string | null
          website?: string | null
          linkedin_url?: string | null
          type?: 'vc' | 'angel' | 'family_office' | 'corporate' | 'accelerator' | 'other'
          check_size_min?: number | null
          check_size_max?: number | null
          stage_preference?: string[] | null
          thesis?: string | null
          notes?: string | null
          relationship_status?: 'cold' | 'warm' | 'hot' | 'portfolio' | 'passed'
          last_contacted_at?: string | null
          contact_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          org_id?: string | null
          name?: string
          firm?: string | null
          email?: string | null
          phone?: string | null
          website?: string | null
          linkedin_url?: string | null
          type?: 'vc' | 'angel' | 'family_office' | 'corporate' | 'accelerator' | 'other'
          check_size_min?: number | null
          check_size_max?: number | null
          stage_preference?: string[] | null
          thesis?: string | null
          notes?: string | null
          relationship_status?: 'cold' | 'warm' | 'hot' | 'portfolio' | 'passed'
          last_contacted_at?: string | null
          contact_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      investments: {
        Row: {
          id: string
          user_id: string
          org_id: string | null
          investor_id: string
          round_name: string
          amount: number | null
          valuation_pre: number | null
          valuation_post: number | null
          equity_percentage: number | null
          instrument: 'equity' | 'safe' | 'convertible_note' | 'other'
          stage: 'intro' | 'pitch' | 'due_diligence' | 'term_sheet' | 'negotiation' | 'closed' | 'passed'
          pitch_date: string | null
          close_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          org_id?: string | null
          investor_id: string
          round_name: string
          amount?: number | null
          valuation_pre?: number | null
          valuation_post?: number | null
          equity_percentage?: number | null
          instrument?: 'equity' | 'safe' | 'convertible_note' | 'other'
          stage?: 'intro' | 'pitch' | 'due_diligence' | 'term_sheet' | 'negotiation' | 'closed' | 'passed'
          pitch_date?: string | null
          close_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          org_id?: string | null
          investor_id?: string
          round_name?: string
          amount?: number | null
          valuation_pre?: number | null
          valuation_post?: number | null
          equity_percentage?: number | null
          instrument?: 'equity' | 'safe' | 'convertible_note' | 'other'
          stage?: 'intro' | 'pitch' | 'due_diligence' | 'term_sheet' | 'negotiation' | 'closed' | 'passed'
          pitch_date?: string | null
          close_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
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
          contact_id: string | null
          deal_id: string | null
          investor_id: string | null
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
          contact_id?: string | null
          deal_id?: string | null
          investor_id?: string | null
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
          contact_id?: string | null
          deal_id?: string | null
          investor_id?: string | null
          is_read?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      acquisition_costs: {
        Row: {
          id: string
          user_id: string
          org_id: string | null
          source: string
          period_start: string
          period_end: string
          spend: number
          leads_generated: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          org_id?: string | null
          source: string
          period_start: string
          period_end: string
          spend?: number
          leads_generated?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          org_id?: string | null
          source?: string
          period_start?: string
          period_end?: string
          spend?: number
          leads_generated?: number
          notes?: string | null
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
