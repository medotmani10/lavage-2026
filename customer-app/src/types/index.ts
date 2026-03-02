export interface Customer {
    id: string;
    auth_id: string;
    full_name: string;
    phone: string;
    loyalty_points?: number;
    total_spent?: number;
    created_at: string;
}

export interface Vehicle {
    id: string;
    customer_id: string;
    plate_number: string;
    make: string;
    model: string;
    type: 'voiture' | 'moto' | 'utilitaire' | 'camion';
    created_at: string;
}

export interface Ticket {
    id: string;
    ticket_number: string;
    customer_id?: string;
    vehicle_id?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    requested_service: 'lavage' | 'vidange' | 'lustrage';
    guest_name?: string;
    guest_phone?: string;
    payment_status: 'pending' | 'partial' | 'paid';
    total_amount: number;
    paid_amount: number;
    created_at: string;
    completed_at?: string;
    current_mileage?: number;
    next_oil_change?: number;
}
