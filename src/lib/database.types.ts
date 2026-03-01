// Generated types for Supabase Database
// These types should be regenerated after schema changes using:
// npx supabase gen types typescript --project-id your-project-id

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'manager' | 'cashier' | 'worker'
export type ProductCategory = 'tire' | 'oil' | 'accessory' | 'service_package' | 'other'
export type TicketStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type TicketPriority = 'normal' | 'priority' | 'vip'
export type PaymentMethod = 'cash' | 'card' | 'credit' | 'mixed'
export type DebtStatus = 'pending' | 'partial' | 'completed' | 'cancelled'
export type InvoiceStatus = 'pending' | 'partial' | 'completed' | 'cancelled'
export type TransactionType = 'revenue' | 'expense' | 'transfer' | 'adjustment'
export type MovementType = 'in' | 'out' | 'adjustment' | 'return' | 'damage'
export type LoyaltyTransactionType = 'earned' | 'redeemed' | 'adjusted' | 'expired'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: UserRole
          phone: string | null
          pin_code: string | null
          avatar_url: string | null
          active: boolean
          allowed_pages: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          role: UserRole
          phone?: string | null
          pin_code?: string | null
          avatar_url?: string | null
          active?: boolean
          allowed_pages?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: UserRole
          phone?: string | null
          pin_code?: string | null
          avatar_url?: string | null
          active?: boolean
          allowed_pages?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          full_name: string
          phone: string
          email: string | null
          address: string | null
          credit_limit: number
          current_balance: number
          loyalty_points: number
          notes: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          phone: string
          email?: string | null
          address?: string | null
          credit_limit?: number
          current_balance?: number
          loyalty_points?: number
          notes?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string
          email?: string | null
          address?: string | null
          credit_limit?: number
          current_balance?: number
          loyalty_points?: number
          notes?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          customer_id: string
          plate_number: string
          brand: string
          model: string
          year: number
          odometer: number
          vin: string | null
          color: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          plate_number: string
          brand: string
          model: string
          year: number
          odometer?: number
          vin?: string | null
          color?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          plate_number?: string
          brand?: string
          model?: string
          year?: number
          odometer?: number
          vin?: string | null
          color?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      services: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          cost: number
          duration_minutes: number
          commission_rate: number
          commission_fixed: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string | null
          price?: number
          cost?: number
          duration_minutes?: number
          commission_rate?: number
          commission_fixed?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name: string
          description: string | null
          price?: number
          cost?: number
          duration_minutes?: number
          commission_rate?: number
          commission_fixed?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          category: ProductCategory
          sku: string
          barcode: string | null
          stock_quantity: number
          min_stock: number
          unit_price: number
          cost_price: number
          supplier_id: string | null
          tire_width: number | null
          tire_height: number | null
          tire_diameter: number | null
          oil_viscosity: string | null
          oil_volume: number | null
          brand: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category?: ProductCategory
          sku: string
          barcode?: string | null
          stock_quantity?: number
          min_stock?: number
          unit_price?: number
          cost_price?: number
          supplier_id?: string | null
          tire_width?: number | null
          tire_height?: number | null
          tire_diameter?: number | null
          oil_viscosity?: string | null
          oil_volume?: number | null
          brand?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name: string
          category?: ProductCategory
          sku?: string
          barcode?: string | null
          stock_quantity?: number
          min_stock?: number
          unit_price?: number
          cost_price?: number
          supplier_id?: string | null
          tire_width?: number | null
          tire_height?: number | null
          tire_diameter?: number | null
          oil_viscosity?: string | null
          oil_volume?: number | null
          brand?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          company_name: string
          contact_person: string | null
          phone: string
          email: string | null
          address: string | null
          tax_id: string | null
          balance_owed: number
          credit_limit: number
          notes: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          contact_person?: string | null
          phone: string
          email?: string | null
          address?: string | null
          tax_id?: string | null
          balance_owed?: number
          credit_limit?: number
          notes?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          contact_person?: string | null
          phone?: string
          email?: string | null
          address?: string | null
          tax_id?: string | null
          balance_owed?: number
          credit_limit?: number
          notes?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          user_id: string | null
          full_name: string
          position: string
          phone: string
          emergency_contact: string | null
          base_salary: number
          commission_rate: number
          total_commissions: number
          paid_commissions: number
          pending_commissions: number
          hire_date: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          full_name: string
          position: string
          phone: string
          emergency_contact?: string | null
          base_salary?: number
          commission_rate?: number
          total_commissions?: number
          paid_commissions?: number
          pending_commissions?: number
          hire_date?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          full_name?: string
          position?: string
          phone?: string
          emergency_contact?: string | null
          base_salary?: number
          commission_rate?: number
          total_commissions?: number
          paid_commissions?: number
          pending_commissions?: number
          hire_date?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      attendance: {
        Row: {
          id: string
          employee_id: string
          check_in: string
          check_out: string | null
          date: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          check_in: string
          check_out?: string | null
          date?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          check_in?: string
          check_out?: string | null
          date?: string
          notes?: string | null
          created_at?: string
        }
      }
      queue_tickets: {
        Row: {
          id: string
          ticket_number: string
          customer_id: string | null
          vehicle_id: string | null
          guest_name: string | null
          guest_phone: string | null
          requested_service: string | null
          current_mileage: number | null
          next_oil_change: number | null
          filters_changed: Json | null
          service_ids: string[]
          product_items: Json
          status: TicketStatus
          priority: TicketPriority
          assigned_employee_id: string | null
          subtotal: number
          tax_rate: number
          tax_amount: number
          discount: number
          total_amount: number
          paid_amount: number
          payment_method: PaymentMethod | null
          notes: string | null
          internal_notes: string | null
          created_at: string
          started_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          cancelled_reason: string | null
        }
        Insert: {
          id?: string
          ticket_number?: string
          customer_id?: string | null
          vehicle_id?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          requested_service?: string | null
          current_mileage?: number | null
          next_oil_change?: number | null
          filters_changed?: Json | null
          service_ids?: string[]
          product_items?: Json
          status?: TicketStatus
          priority?: TicketPriority
          assigned_employee_id?: string | null
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          discount?: number
          total_amount?: number
          paid_amount?: number
          payment_method?: PaymentMethod | null
          notes?: string | null
          internal_notes?: string | null
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          cancelled_reason?: string | null
        }
        Update: {
          id?: string
          ticket_number?: string
          customer_id?: string | null
          vehicle_id?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          requested_service?: string | null
          current_mileage?: number | null
          next_oil_change?: number | null
          filters_changed?: Json | null
          service_ids?: string[]
          product_items?: Json
          status?: TicketStatus
          priority?: TicketPriority
          assigned_employee_id?: string | null
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          discount?: number
          total_amount?: number
          paid_amount?: number
          payment_method?: PaymentMethod | null
          notes?: string | null
          internal_notes?: string | null
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          cancelled_reason?: string | null
        }
      }
      ticket_services: {
        Row: {
          id: string
          ticket_id: string
          service_id: string
          quantity: number
          unit_price: number
          total_price: number
          employee_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          service_id: string
          quantity?: number
          unit_price: number
          total_price: number
          employee_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          service_id?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          employee_id?: string | null
          created_at?: string
        }
      }
      ticket_products: {
        Row: {
          id: string
          ticket_id: string
          product_id: string
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          product_id: string
          quantity?: number
          unit_price: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string
        }
      }
      commissions: {
        Row: {
          id: string
          employee_id: string
          ticket_id: string
          service_id: string | null
          amount: number
          calculation_method: string
          rate_applied: number
          paid: boolean
          paid_at: string | null
          paid_in_batch: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          ticket_id: string
          service_id?: string | null
          amount: number
          calculation_method?: string
          rate_applied?: number
          paid?: boolean
          paid_at?: string | null
          paid_in_batch?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          ticket_id?: string
          service_id?: string | null
          amount?: number
          calculation_method?: string
          rate_applied?: number
          paid?: boolean
          paid_at?: string | null
          paid_in_batch?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      debts: {
        Row: {
          id: string
          customer_id: string
          ticket_id: string | null
          original_amount: number
          paid_amount: number
          remaining_amount: number
          due_date: string | null
          status: DebtStatus
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          ticket_id?: string | null
          original_amount: number
          paid_amount?: number
          remaining_amount: number
          due_date?: string | null
          status?: DebtStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          ticket_id?: string | null
          original_amount?: number
          paid_amount?: number
          remaining_amount?: number
          due_date?: string | null
          status?: DebtStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          ticket_id: string | null
          debt_id: string | null
          customer_id: string
          amount: number
          payment_method: PaymentMethod
          reference_number: string | null
          received_by: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id?: string | null
          debt_id?: string | null
          customer_id: string
          amount: number
          payment_method: PaymentMethod
          reference_number?: string | null
          received_by?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string | null
          debt_id?: string | null
          customer_id?: string
          amount?: number
          payment_method?: PaymentMethod
          reference_number?: string | null
          received_by?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      purchase_invoices: {
        Row: {
          id: string
          supplier_id: string
          invoice_number: string
          invoice_date: string
          items: Json
          subtotal: number
          tax_amount: number
          total_amount: number
          paid_amount: number
          remaining_amount: number
          status: InvoiceStatus
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          supplier_id: string
          invoice_number: string
          invoice_date: string
          items?: Json
          subtotal?: number
          tax_amount?: number
          total_amount: number
          paid_amount?: number
          remaining_amount?: number
          status?: InvoiceStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          supplier_id?: string
          invoice_number?: string
          invoice_date?: string
          items?: Json
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          paid_amount?: number
          remaining_amount?: number
          status?: InvoiceStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      financial_transactions: {
        Row: {
          id: string
          type: TransactionType
          amount: number
          description: string
          reference_type: string | null
          reference_id: string | null
          category: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          type: TransactionType
          amount: number
          description: string
          reference_type?: string | null
          reference_id?: string | null
          category?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          type?: TransactionType
          amount?: number
          description: string
          reference_type?: string | null
          reference_id?: string | null
          category?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      stock_movements: {
        Row: {
          id: string
          product_id: string
          movement_type: MovementType
          quantity: number
          unit_cost: number | null
          reference_type: string | null
          reference_id: string | null
          performed_by: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          movement_type: MovementType
          quantity: number
          unit_cost?: number | null
          reference_type?: string | null
          reference_id?: string | null
          performed_by?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          movement_type?: MovementType
          quantity?: number
          unit_cost?: number | null
          reference_type?: string | null
          reference_id?: string | null
          performed_by?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      loyalty_transactions: {
        Row: {
          id: string
          customer_id: string
          ticket_id: string | null
          transaction_type: LoyaltyTransactionType
          points: number
          balance_after: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          ticket_id?: string | null
          transaction_type: LoyaltyTransactionType
          points: number
          balance_after: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          ticket_id?: string | null
          transaction_type?: LoyaltyTransactionType
          points?: number
          balance_after?: number
          notes?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      view_daily_revenue: {
        Row: {
          date: string | null
          ticket_count: number | null
          gross_revenue: number | null
          collected_amount: number | null
          pending_amount: number | null
        }
      }
      view_current_queue: {
        Row: {
          id: string | null
          ticket_number: string | null
          status: TicketStatus | null
          priority: TicketPriority | null
          customer_name: string | null
          customer_phone: string | null
          plate_number: string | null
          vehicle_name: string | null
          employee_name: string | null
          total_amount: number | null
          paid_amount: number | null
          created_at: string | null
          started_at: string | null
          wait_time_minutes: number | null
        }
      }
      view_low_stock_products: {
        Row: {
          id: string | null
          name: string | null
          category: ProductCategory | null
          sku: string | null
          stock_quantity: number | null
          min_stock: number | null
          shortage: number | null
        }
      }
      view_employee_commissions: {
        Row: {
          employee_id: string | null
          full_name: string | null
          position: string | null
          total_commissions: number | null
          paid_commissions: number | null
          pending_commissions: number | null
          due_commissions: number | null
        }
      }
      view_customer_debts: {
        Row: {
          customer_id: string | null
          full_name: string | null
          phone: string | null
          credit_limit: number | null
          current_balance: number | null
          loyalty_points: number | null
          debt_count: number | null
          total_remaining: number | null
        }
      }
      view_dashboard_stats: {
        Row: {
          daily_revenue: number | null
          completed_today: number | null
          current_queue_count: number | null
          pending_debts: number | null
          low_stock_count: number | null
          due_commissions: number | null
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'admin' | 'manager' | 'cashier' | 'worker'
      product_category: 'tire' | 'oil' | 'accessory' | 'service_package' | 'other'
      ticket_status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
      ticket_priority: 'normal' | 'priority' | 'vip'
      payment_method: 'cash' | 'card' | 'credit' | 'mixed'
      debt_status: 'pending' | 'partial' | 'completed' | 'cancelled'
      invoice_status: 'pending' | 'partial' | 'completed' | 'cancelled'
      transaction_type: 'revenue' | 'expense' | 'transfer' | 'adjustment'
      movement_type: 'in' | 'out' | 'adjustment' | 'return' | 'damage'
      loyalty_transaction_type: 'earned' | 'redeemed' | 'adjusted' | 'expired'
    }
  }
}
