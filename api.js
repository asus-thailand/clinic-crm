// ================================================================================
// BEAUTY CLINIC CRM - API LAYER (COMPLETE FIXED VERSION 100%)
// ================================================================================

const api = {};

// ================================================================================
// AUTHENTICATION APIs
// ================================================================================

api.getSession = async function() {
    try {
        const { data, error } = await window.supabaseClient.auth.getSession();
        if (error) throw error;
        return data.session;
    } catch (error) {
        console.error("API ERROR in getSession:", error);
        throw new Error('Could not get session.');
    }
}

api.signOut = async function() {
    try {
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) throw error;
    } catch (error) {
        console.error("API ERROR in signOut:", error);
        throw new Error('Failed to sign out.');
    }
}

// ================================================================================
// USER PROFILE APIs
// ================================================================================

api.getUserProfile = async function(userId) {
    try {
        const { data, error } = await window.supabaseClient.from('users').select('role, username, full_name').eq('id', userId).single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    } catch (error) {
        console.error("API ERROR in getUserProfile:", error);
        throw new Error('Could not get user profile.');
    }
}

api.createDefaultUserProfile = async function(user) {
    try {
        const username = user.email.split('@')[0];
        const { data, error } = await window.supabaseClient.from('users').insert({ id: user.id, username, full_name: username, role: 'sales' }).select().single();
        if (error) throw error;
        return data;
    } catch (error) {
        console.error("API ERROR in createDefaultUserProfile:", error);
        throw new Error('Failed to create user profile.');
    }
}

api.fetchSalesList = async function() {
    try {
        const { data, error } = await window.supabaseClient.from('users').select('username').eq('role', 'sales').not('username', 'is', null);
        if (error) throw error;
        return (data || []).map(u => u.username);
    } catch (error) {
        console.error("API ERROR in fetchSalesList:", error);
        throw new Error('Could not fetch sales list.');
    }
}

// ================================================================================
// CUSTOMER APIs
// ================================================================================

api.fetchAllCustomers = async function() {
    try {
        const { data, error } = await window.supabaseClient.from('customers').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("API ERROR in fetchAllCustomers:", error);
        throw new Error('Could not fetch customer data.');
    }
}

api.getCurrentMonthLeadCount = async function() {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const firstDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];

    try {
        const { count, error } = await window.supabaseClient
            .from('customers')
            .select('*', { count: 'exact', head: true })
            .gte('date', firstDayOfMonth)
            .lt('date', firstDayOfNextMonth);
        
        if (error) throw error;
        return count || 0;
    } catch (error) {
        console.error("API ERROR in getCurrentMonthLeadCount:", error);
        throw new Error('Could not get current month\'s lead count.');
    }
}

api.addCustomer = async function(salesName, leadCode) {
    try {
        const { data, error } = await window.supabaseClient
            .from('customers')
            .insert({
                sales: salesName,
                date: new Date().toISOString().split('T')[0],
                lead_code: leadCode
            })
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error("API ERROR in addCustomer:", error);
        throw new Error('Could not add a new customer.');
    }
}

api.updateCustomer = async function(customerId, customerData) {
    try {
        delete customerData.id;
        delete customerData.created_at;
        const { data, error } = await window.supabaseClient.from('customers').update(customerData).eq('id', customerId).select().single();
        if (error) throw error;
        return data;
    } catch (error) {
        console.error("API ERROR in updateCustomer:", error);
        throw new Error('Could not update customer data.');
    }
}

api.deleteCustomer = async function(customerId) {
    try {
        const { error } = await window.supabaseClient.from('customers').delete().eq('id', customerId);
        if (error) throw error;
        return true;
    } catch (error) {
        console.error("API ERROR in deleteCustomer:", error);
        throw new Error('Could not delete customer.');
    }
}

// ================================================================================
// STATUS HISTORY APIs
// ================================================================================
api.fetchStatusHistory = async function(customerId) {
    try {
        // *** จุดที่แก้ไข: เพิ่มการดึง 'role' จากตาราง 'users' ***
        const { data, error } = await window.supabaseClient
            .from('customer_status_history')
            .select('*, users(username, role)') 
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("API ERROR in fetchStatusHistory:", error);
        throw new Error('Could not fetch status history.');
    }
}

api.addStatusUpdate = async function(customerId, status, notes, userId) {
    try {
        const insertData = { customer_id: customerId, status: status, notes: notes };
        if (userId) { insertData.updated_by = userId; }
        const { data, error } = await window.supabaseClient.from('customer_status_history').insert(insertData).select().single();
        if (error) throw error;
        return data;
    } catch (error) {
        console.error("API ERROR in addStatusUpdate:", error);
        throw new Error('Could not add status update.');
    }
}

window.api = api;
