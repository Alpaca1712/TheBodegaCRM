export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          user_id: string
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
          title: string
          value: number
          currency: string
          stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
          contact_id: string | null
          company_id: string | null
          expected_close_date: string | null
          probability: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          value: number
          currency?: string
          stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
          contact_id?: string | null
          company_id?: string | null
          expected_close_date?: string | null
          probability?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          value?: number
          currency?: string
          stage?: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
          contact_id?: string | null
          company_id?: string | null
          expected_close_date?: string | null
          probability?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          user_id: string
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
          name: string
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
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
