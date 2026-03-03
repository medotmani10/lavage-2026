/**
 * Type exports derived from the Supabase database schema.
 * This file no longer contains any Dexie/IndexedDB logic.
 * All data operations go through Supabase directly.
 */
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
