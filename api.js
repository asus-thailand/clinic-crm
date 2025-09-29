// ================================================================================
// BEAUTY CLINIC CRM - API LAYER (NEW)
// ไฟล์นี้ทำหน้าที่จัดการการสื่อสารกับ Supabase ทั้งหมด
// ทำให้โค้ดส่วนอื่นไม่ต้องยุ่งกับ Logic ของ Database โดยตรง
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
        .select('role, username, full_name')
        .eq('id', userId)
        .single();
    if (error) {
        console.warn('User profile not found, will create a default one.', error.message);
        return null; // ส่ง null กลับไปเพื่อให้รู้ว่าไม่เจอ profile
    }
    return data;
}

export async function createDefaultUserProfile(user) {
    const username = user.email.split('@')[0];
    const { data, error } = await supabase
        .from('users')
        .insert({ id: user.id, username, full_name: username, role: 'sales' })
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

export async function addNewCustomer(newRowData) {
    const { data, error } = await supabase
        .from('customers')
        .insert(newRowData)
        .select()
        .single();
    if (error) throw new Error(`Failed to add new customer: ${error.message}`);
    return data;
}

export async function getLatestLeadCode() {
    const { data, error } = await supabase
      .from('customers')
      .select('lead_code')
      .order('lead_code', { ascending: false, nullsFirst: false })
      .limit(1)
      .single();
    // ไม่ throw error ถ้าไม่เจอข้อมูล แต่จะ return null
    if (error && error.code !== 'PGRST116') { // PGRST116 = single row not found
        console.error('Error fetching latest lead code:', error);
    }
    return data ? parseInt(data.lead_code, 10) : 1000;
}


export async function updateCustomerCell(rowId, field, value) {
    const { data, error } = await supabase
        .from('customers')
        .update({ [field]: value })
        .eq('id', rowId)
        .select()
        .single();
    if (error) throw new Error(`Failed to update cell: ${error.message}`);
    return data;
}

export async function deleteCustomerById(rowId) {
    const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', rowId);
    if (error) throw new Error(`Failed to delete row: ${error.message}`);
}

// ---- Status History Functions ----
export async function addStatusUpdate(customerId, newStatus, notes, userId) {
    const { error } = await supabase
        .from('customer_status_history')
        .insert({ customer_id: customerId, status: newStatus, notes: notes, created_by: userId });
    if (error) throw new Error(`Failed to add status history: ${error.message}`);
}

export async function fetchStatusHistory(customerId) {
    const { data, error } = await supabase
        .from('customer_status_history')
        .select('*, users(username)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
    if (error) throw new Error('Could not fetch status history.');
    return data || [];
}