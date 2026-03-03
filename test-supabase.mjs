import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Read from .env
const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

if (!urlMatch || !keyMatch) {
    console.log("Could not find Supabase credentials in .env");
    process.exit(1);
}

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Testing Supabase connection...");
    const { data, error } = await supabase.from('customers').select('*');

    if (error) {
        console.log('Error fetching customers:', error);
    } else {
        console.log(`Successfully fetched ${data?.length} customers.`);
        if (data?.length > 0) {
            console.log('First customer sample:', data[0]);
        }
    }
}

test();
