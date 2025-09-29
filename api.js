// ================================================================================
// BEAUTY CLINIC CRM - API LAYER (ADVANCED DEBUG VERSION)
// ================================================================================
import { supabase } from './config.js';

export async function getSession() {
    console.log("API: Attempting to get session...");
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        console.log("API: Get session successful.");
        return data.session;
    } catch (error) {
        console.error("API ERROR in getSession:", error);
        throw new Error('Could not get session.');
    }
}

export async function getUserProfile(userId) {
    console.log(`API: Attempting to get profile for user ${userId}...`);
    try {
        const { data, error } = await supabase
            .from('users')
            .select('role, username, full_name')
            .eq('id', userId)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        console.log("API: Get user profile successful.", data);
        return data;
    } catch (error) {
        console.error("API ERROR in getUserProfile:", error);
        throw new Error('Could not get user profile.');
    }
}

export async function createDefaultUserProfile(user) {
    console.log("API: Attempting to create default profile...");
    try {
        const username = user.email.split('@')[0];
        const { data, error } = await supabase
            .from('users')
            .insert({ id: user.id, username, full_name: username, role: 'sales' })
            .select()
            .single();
        if (error) throw error;
        console.log("API: Create default profile successful.");
        return data;
    } catch (error) {
        console.error("API ERROR in createDefaultUserProfile:", error);
        throw new Error('Failed to create user profile.');
    }
}

export async function signOut() {
    console.log("API: Attempting to sign out...");
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        console.log("API: Sign out successful.");
    } catch (error) {
        console.error("API ERROR in signOut:", error);
        throw new Error('Failed to sign out.');
    }
}

export async function fetchAllCustomers() {
    console.log("API: Attempting to fetch all customers...");
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        console.log(`API: Fetched ${data ? data.length : 0} customers successfully.`);
        return data || [];
    } catch (error) {
        console.error("API ERROR in fetchAllCustomers:", error);
        throw new Error('Could not fetch customer data.');
    }
}

export async function fetchSalesList() {
    console.log("API: Attempting to fetch sales list...");
    try {
        const { data, error } = await supabase
            .from('users')
            .select('username')
            .not('username', 'is', null);
        if (error) throw error;
        console.log(`API: Fetched ${data ? data.length : 0} sales users successfully.`);
        return (data || []).map(u => u.username);
    } catch (error) {
        console.error("API ERROR in fetchSalesList:", error);
        throw new Error('Could not fetch sales list.');
    }
}

// ... (ฟังก์ชันอื่น ๆ ใน api.js ก็ควรจะมี try...catch ในลักษณะเดียวกัน) ...
