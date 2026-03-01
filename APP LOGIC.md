# Lavage & Vidange ERP - Core Business Logic Document
**Version:** 2.1 (Strictly Internal POS & Management System)
**CRITICAL AI CONTEXT:** This document represents the absolute Source of Truth for the application's business logic. It is strictly forbidden to propose architectural changes, database refactoring, or UI modifications that violate these established workflows. This system is an entirely closed ecosystem and operates exclusively within the physical station (POS) via authenticated cashiers and managers.

## 1. Data Architecture & Hierarchy
The database has been streamlined to minimize POS friction and maximize speed:
* **Customer-Centric Model:** The `Customer` is the primary entity. 
* **Vehicle Integration:** There is NO standalone vehicle management module. Vehicles are strictly child entities bound to a `customer_id`. Whenever a customer is selected, their associated vehicles are fetched automatically.
* **Service Categories:** Services are strictly divided into distinct categories (e.g., 'Lavage' for washing, 'Vidange' for oil change). Each category operates as an independent queue entity.

## 2. Queue & Ticketing Logic
The unified queue has been replaced by category-specific queues to prevent operational bottlenecks:
* **Prefixed Ticket Sequences:** Tickets do not use random IDs for display. They use a prefix based on the service category followed by an independent sequence.
  * Examples: `L-001`, `L-002` (for Lavage/Washing).
  * Examples: `V-001`, `V-002` (for Vidange/Oil Change).
* **Queue Management:** The POS queue interface visually separates or sorts tickets by their category. Complex oil changes are never mixed with quick washes in the workflow timeline.

## 3. POS Workflow (Ticket Lifecycle)
The POS flow is designed for rapid execution:
1. **Reception:** The cashier selects the required service category (Lavage or Vidange).
2. **Customer Binding:** The cashier selects an existing customer (or quick-adds a new one). This immediately displays the customer's vehicles for selection.
3. **Employee Assignment:** The ticket is assigned to one or more employees for commission tracking.
4. **Products (Optional):** Inventory items (e.g., air fresheners, extra oil) can be added to the ticket.
5. **Checkout:** Transitioning the ticket to payment triggers specific conditional flows (see Fiche Vidange below).

## 4. Fiche Vidange (Maintenance Card) Logic
This is the critical technical core for oil change services, designed for customer retention:
* **Conditional Trigger:** The "Fiche Vidange" modal/form MUST NEVER appear during 'Lavage' (washing) checkouts. It is strictly triggered as a mandatory pre-checkout step ONLY if the ticket contains a 'Vidange' category service.
* **Data Binding & Updates:** Data entered into the Fiche Vidange (Current Mileage, Next Oil Change Mileage, Replaced Filters) is saved in the ticket's history AND automatically updates the selected vehicle's current status in the database.
* **Retention Goal:** When the customer returns, the POS automatically retrieves the previous mileage and filter data to inform the cashier.

## 5. Finance & Inventory Logic
Every POS transaction impacts finances and physical stock in real-time:
* **Auto-Deduction:** Any physical product added to a ticket is immediately deducted from the `Inventory` table upon successful checkout.
* **Credit & Debt System:** * During checkout, the cashier can split payment (Paid Amount vs. Total Amount).
  * Any unpaid remainder is automatically added to the customer's profile as "Debt".
  * The system must respect and block transactions that exceed the customer's predefined `credit_limit`.
* **Cash Drawer:** Only the actual "Paid Amount" is registered in the daily cash drawer/revenue dashboard.

## 6. Employee Commissions
Payroll is fully automated based on ticket closures:
* Employees have specific commission structures (Percentage % or Fixed Amount).
* Upon ticket closure, commissions are calculated instantly based ONLY on the services rendered (products do not yield commissions unless explicitly defined).
* Commissions accumulate in the employee's balance for later clearance.

## 7. STRICT RULES FOR AI AGENTS & DEVELOPERS
1. **Never Break the Checkout Flow:** Do not bypass or alter the conditional trigger for the `Fiche Vidange` modal.
2. **Vehicles Belong to Customers:** All vehicle queries must be filtered by `customer_id`. Do not create orphaned vehicle management interfaces.
3. **Preserve Ticket Prefixes:** Ensure the correct category prefix (L- or V-) is generated during ticket creation.
4. **Closed Ecosystem:** The system is exclusively an internal POS. Do not write or assume logic for external bookings, guest requests, or unverified public endpoints. All data is generated directly by the cashier inside the station.