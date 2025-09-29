// ================================================================================
// BEAUTY CLINIC CRM - API LAYER (FINAL VERSION)
// ================================================================================
import { supabase } from './config.js';

// ---- User & Auth Functions ----
export async function getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error('Could not get session.');
    return data.session;
}

export async function getUserProfile(userId) {
    const { data, error } = await supabase
        .from('users')
        .select('role, username')
        .eq('id', userId)
        .single();
    if (error) {
        console.warn('User profile not found, will create a default one.', error.message);
        return null;
    }
    return data;
}

export async function createDefaultUserProfile(user) {
    const username = user.email.split('@')[0];
    const { data, error } = await supabase
        .from('users')
        .insert({ id: user.id, username: username, role: 'sales' })
        .select()
        .single();
    if (error) throw new Error('Failed to create user profile.');
    return data;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error('Failed to sign out.');
}

// ---- Customer Data Functions ----
export async function fetchAllCustomers() {
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw new Error('Could not fetch customer data.');
    return data || [];
}

export async function fetchSalesList() {
    const { data, error } = await supabase
        .from('users')
        .select('username')
        .not('username', 'is', null);
    if (error) throw new Error('Could not fetch sales list.');
    return (data || []).map(u => u.username);
}
