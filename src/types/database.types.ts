export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      company_settings: {
        Row: {
          id: string
          company_name: string
          tagline: string | null
          address: string | null
          phone: string | null
          email: string | null
          gstin: string | null
          state_code: string | null
          state_name: string | null
          bank_name: string | null
          bank_account_no: string | null
          bank_ifsc: string | null
          bank_branch: string | null
          upi_id: string | null
          logo_url: string | null
          signature_url: string | null
          stamp_url: string | null
          invoice_prefix: string | null
          financial_year: string | null
          default_gst_rate: number | null
          terms_and_conditions: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['company_settings']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['company_settings']['Insert']>
      }
      users: {
        Row: {
          id: string
          user_id: string
          username: string
          full_name: string
          role: string
          email: string | null
          phone: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Database['public']['Tables']['users']['Row']
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      role_permissions: {
        Row: {
          id: string
          role: string
          permission_key: string
          is_granted: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['role_permissions']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['role_permissions']['Insert']>
      }
      user_permissions: {
        Row: {
          id: string
          user_id: string
          permission_key: string
          is_granted: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_permissions']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_permissions']['Insert']>
      }
      customers: {
        Row: {
          id: string
          customer_id: string
          full_name: string
          phone: string
          email: string | null
          address: string | null
          gstin: string | null
          state_code: string | null
          emergency_contact: string | null
          outstanding_balance: number | null
          advance_balance: number | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['customers']['Insert']>
      }
      pets: {
        Row: {
          id: string
          pet_id: string
          customer_id: string
          customer_name: string | null
          pet_name: string
          species: string | null
          breed: string | null
          age: string | null
          gender: string | null
          vaccination_status: string | null
          medical_notes: string | null
          feeding_preferences: string | null
          microchip_id: string | null
          barcode: string | null
          is_boarding_now: boolean | null
          check_in_date: string | null
          check_out_date: string | null
          room_no: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['pets']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['pets']['Insert']>
      }
      catalog_items: {
        Row: {
          id: string
          item_id: string
          item_name: string
          item_type: string | null
          hsn_sac: string | null
          unit_price: number
          gst_rate: number
          unit: string | null
          is_active: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['catalog_items']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['catalog_items']['Insert']>
      }
      invoices: {
        Row: {
          id: string
          internal_invoice_id: string
          invoice_number: string
          financial_year: string
          invoice_date: string
          due_date: string | null
          customer_id: string
          customer_name: string
          customer_phone: string | null
          customer_email: string | null
          customer_gstin: string | null
          pet_id: string | null
          pet_name: string | null
          place_of_supply: string | null
          is_inter_state: boolean | null
          sub_total: number
          total_discount: number | null
          taxable_amount: number
          cgst_total: number | null
          sgst_total: number | null
          igst_total: number | null
          total_gst: number | null
          round_off: number | null
          grand_total: number
          paid_amount: number | null
          balance_due: number | null
          payment_status: string | null
          payment_mode: string | null
          notes: string | null
          created_by_role: string | null
          created_by_name: string | null
          is_cancelled: boolean | null
          cancelled_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>
      }
      invoice_items: {
        Row: {
          id: string
          line_item_id: string
          internal_invoice_id: string
          invoice_number: string
          catalog_item_id: string | null
          item_type: string | null
          item_name: string
          hsn_sac: string | null
          price: number
          quantity: number
          discount_percent: number | null
          discount_amount: number | null
          taxable_value: number
          gst_rate: number | null
          cgst_amount: number | null
          sgst_amount: number | null
          igst_amount: number | null
          item_total: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['invoice_items']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['invoice_items']['Insert']>
      }
      payments: {
        Row: {
          id: string
          payment_id: string
          internal_invoice_id: string
          invoice_number: string
          customer_id: string
          customer_name: string
          amount: number
          payment_date: string
          payment_mode: string | null
          transaction_ref: string | null
          notes: string | null
          received_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
      audit_logs: {
        Row: {
          id: string
          log_id: string
          timestamp: string
          user_id: string
          username: string
          role: string
          action: string
          details: string | null
          ip_address: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
      }
    }
  }
}
