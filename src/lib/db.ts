import Dexie, { type EntityTable } from 'dexie';
import type { Database } from './database.types';

type PublicTables = Database['public']['Tables'];

export type User = PublicTables['users']['Row'];
export type Customer = PublicTables['customers']['Row'];
export type Vehicle = PublicTables['vehicles']['Row'];
export type Service = PublicTables['services']['Row'];
export type Product = PublicTables['products']['Row'];
export type Employee = PublicTables['employees']['Row'];
export type QueueTicket = PublicTables['queue_tickets']['Row'];
export type TicketService = PublicTables['ticket_services']['Row'];
export type TicketProduct = PublicTables['ticket_products']['Row'];
export type Payment = PublicTables['payments']['Row'];
export type Debt = PublicTables['debts']['Row'];
export type FinancialTransaction = PublicTables['financial_transactions']['Row'];
export type Supplier = PublicTables['suppliers']['Row'];
export type Commission = PublicTables['commissions']['Row'];
export type PurchaseInvoice = PublicTables['purchase_invoices']['Row'];
export type StockMovement = PublicTables['stock_movements']['Row'];

export interface SyncQueueItem {
    id?: number; // auto-increment primary key for Dexie
    table: string;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    payload: any;
    created_at: string;
}

export const db = new Dexie('LavageVidaDB') as Dexie & {
    customers: EntityTable<Customer, 'id'>,
    vehicles: EntityTable<Vehicle, 'id'>,
    services: EntityTable<Service, 'id'>,
    products: EntityTable<Product, 'id'>,
    employees: EntityTable<Employee, 'id'>,
    queue_tickets: EntityTable<QueueTicket, 'id'>,
    ticket_services: EntityTable<TicketService, 'id'>,
    ticket_products: EntityTable<TicketProduct, 'id'>,
    payments: EntityTable<Payment, 'id'>,
    debts: EntityTable<Debt, 'id'>,
    financial_transactions: EntityTable<FinancialTransaction, 'id'>,
    suppliers: EntityTable<Supplier, 'id'>,
    users: EntityTable<User, 'id'>,
    commissions: EntityTable<Commission, 'id'>,
    purchase_invoices: EntityTable<PurchaseInvoice, 'id'>,
    stock_movements: EntityTable<StockMovement, 'id'>,
    sync_queue: EntityTable<SyncQueueItem, 'id'>
};

// Define local schema (indices used for querying locally)
db.version(2).stores({
    customers: 'id, full_name, phone, active',
    vehicles: 'id, customer_id, plate_number',
    services: 'id, name, active',
    products: 'id, name, category, barcode, active',
    employees: 'id, full_name, user_id, position, active',
    queue_tickets: 'id, ticket_number, customer_id, status, created_at',
    ticket_services: 'id, ticket_id, service_id',
    ticket_products: 'id, ticket_id, product_id',
    payments: 'id, ticket_id, customer_id, created_at',
    debts: 'id, customer_id, ticket_id, status',
    financial_transactions: 'id, type, created_at',
    suppliers: 'id, company_name, active',
    users: 'id, email, full_name, role, pin_code, active',
    commissions: 'id, employee_id, ticket_id, created_at',
    purchase_invoices: 'id, supplier_id, invoice_number, status, invoice_date',
    stock_movements: 'id, product_id, movement_type, reference_type, reference_id, created_at',
    sync_queue: '++id, table, operation, created_at'
});
