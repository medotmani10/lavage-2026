// User roles
export type UserRole = 'admin' | 'manager' | 'cashier' | 'worker';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  pin_code?: string;
  active?: boolean;
  allowed_pages?: string[] | null;
  created_at: string;
  updated_at: string;
}

// Customer
export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  address?: string;
  credit_limit: number;
  current_balance: number;
  loyalty_points: number;
  created_at: string;
  updated_at: string;
}

// Vehicle
export interface Vehicle {
  id: string;
  customer_id: string;
  plate_number: string;
  brand: string;
  model: string;
  year: number;
  odometer: number;
  vin?: string;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

// Service
export type ServiceCategory = 'lavage' | 'vidange' | 'pneumatique';

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  description?: string;
  price: number;
  duration_minutes: number;
  commission_rate: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Product (Inventory)
export type ProductCategory = 'tire' | 'oil' | 'accessory' | 'other';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  sku: string;
  stock_quantity: number;
  min_stock: number;
  unit_price: number;
  cost_price: number;
  supplier_id?: string;
  // Tire specific
  tire_width?: number;
  tire_height?: number;
  tire_diameter?: number;
  // Oil specific
  oil_viscosity?: string;
  oil_volume?: number;
  created_at: string;
  updated_at: string;
}

// Supplier
export interface Supplier {
  id: string;
  company_name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  address?: string;
  balance_owed: number;
  credit_limit?: number;
  created_at: string;
  updated_at: string;
}

// Employee
export interface Employee {
  id: string;
  user_id: string;
  position: string;
  phone: string;
  base_salary?: number;
  commission_rate: number;
  total_commissions: number;
  paid_commissions: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  user?: User;
}

// Attendance
export interface Attendance {
  id: string;
  employee_id: string;
  check_in: string;
  check_out?: string;
  date: string;
  created_at: string;
  employee?: Employee;
}

// Queue Ticket
export type TicketStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TicketPriority = 'normal' | 'priority' | 'vip';

export interface QueueTicket {
  id: string;
  ticket_number: string;
  customer_id: string | null;
  vehicle_id: string | null;
  // Guest fields (kiosk visitors not yet converted)
  guest_name?: string | null;
  guest_phone?: string | null;
  requested_service?: string | null;
  // Vidange tracking
  current_mileage?: number | null;
  next_oil_change?: number | null;
  filters_changed?: string[] | null;
  service_ids: string[];
  product_ids: { product_id: string; quantity: number }[];
  status: TicketStatus;
  priority: TicketPriority;
  assigned_employee_id?: string;
  total_amount: number;
  paid_amount: number;
  payment_method?: 'cash' | 'card' | 'credit';
  notes?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  customer?: Customer;
  vehicle?: Vehicle;
  services?: Service[];
  products?: Product[];
  assigned_employee?: Employee;
}

// Commission
export interface Commission {
  id: string;
  employee_id: string;
  ticket_id: string;
  amount: number;
  paid: boolean;
  paid_at?: string;
  created_at: string;
  employee?: Employee;
  ticket?: QueueTicket;
}

// Debt/Credit
export interface Debt {
  id: string;
  customer_id: string;
  ticket_id: string;
  original_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date?: string;
  status: 'pending' | 'partial' | 'completed';
  created_at: string;
  updated_at: string;
  customer?: Customer;
  ticket?: QueueTicket;
}

// Payment
export interface Payment {
  id: string;
  ticket_id?: string;
  debt_id?: string;
  customer_id: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'credit';
  notes?: string;
  created_at: string;
  created_by: string;
  customer?: Customer;
  ticket?: QueueTicket;
}

// Purchase Invoice
export interface PurchaseInvoice {
  id: string;
  supplier_id: string;
  invoice_number: string;
  items: { product_id: string; quantity: number; unit_cost: number }[];
  total_amount: number;
  paid_amount: number;
  status: 'pending' | 'partial' | 'completed';
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
}

// Financial Transaction
export type TransactionType = 'revenue' | 'expense' | 'transfer';

export interface FinancialTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  reference_type?: string;
  reference_id?: string;
  created_by: string;
  created_at: string;
}

// Dashboard Stats
export interface DashboardStats {
  daily_revenue: number;
  total_revenue: number;
  pending_tickets: number;
  completed_tickets: number;
  pending_debts: number;
  low_stock_products: number;
  employee_commissions_due: number;
}

// Language
export type Language = 'fr' | 'ar';
