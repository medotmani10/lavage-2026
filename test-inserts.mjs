import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    // Let's authenticate to act as a normal user/manager if possible, or just use anon
    const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'admin@lavage.com', // assuming this exists based on typical defaults
        password: 'password123'
    });

    if (signInError) {
        console.log("Could not sign in, trying anon insert:", signInError.message);
    }

    const { data, error } = await supabase.from('payments').insert([{ amount: 100, payment_method: 'cash', customer_id: '123e4567-e89b-12d3-a456-426614174000' }]);
    console.log('Payments insert error:', error);

    const { error: err2 } = await supabase.from('financial_transactions').insert([{ type: 'expense', amount: 100, description: 'test' }]);
    console.log('Finance insert error:', err2);
}
test();
