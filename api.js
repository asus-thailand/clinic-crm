// ================================================================================
// BEAUTY CLINIC CRM - API LAYER (ADVANCED DEBUG VERSION)
// ================================================================================

// ใช้ตัวแปร global จาก config.js
const api = {};

api.getSession = async function() {
    console.log("API: Attempting to get session...");
    try {
        const { data, error } = await window.supabaseClient.auth.getSession();
        if (error) throw error;
        console.log("API: Get session successful.");
        return data.session;
    } catch (error) {
        console.error("API ERROR in getSession:", error);
        throw new Error('Could not get session.');
    }
}

api.getUserProfile = async function(userId) {
    console.log(`API: Attempting to get profile for user ${userId}...`);
    try {
        const { data, error } = await window.supabaseClient
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

api.createDefaultUserProfile = async function(user) {
    console.log("API: Attempting to create default profile...");
    try {
        const username = user.email.split('@')[0];
        const { data, error } = await window.supabaseClient
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

api.signOut = async function() {
    console.log("API: Attempting to sign out...");
    try {
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) throw error;
        console.log("API: Sign out successful.");
    } catch (error) {
        console.error("API ERROR in signOut:", error);
        throw new Error('Failed to sign out.');
    }
}

api.fetchAllCustomers = async function() {
    console.log("API: Attempting to fetch all customers...");
    try {
        const { data, error } = await window.supabaseClient
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

api.fetchSalesList = async function() {
    console.log("API: Attempting to fetch sales list...");
    try {
        const { data, error } = await window.supabaseClient
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

api.fetchStatusHistory = async function(customerId) {
    console.log(`API: Fetching status history for customer ${customerId}...`);
    try {
        const { data, error } = await window.supabaseClient
            .from('status_history')
            .select('*, users(username)')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        console.log(`API: Fetched ${data ? data.length : 0} history records.`);
        return data || [];
    } catch (error) {
        console.error("API ERROR in fetchStatusHistory:", error);
        throw new Error('Could not fetch status history.');
    }
}


api.addStatusUpdate = async function(customerId, status, notes, userId) {
    console.log("API: Adding status update...");
    try {
        const { data, error } = await window.supabaseClient
            .from('status_history')
            .insert({
                customer_id: customerId,
                status: status,
                notes: notes,
                updated_by: userId
            })
            .select()
            .single();
        if (error) throw error;
        console.log("API: Status update added successfully.");
        return data;
    } catch (error) {
        console.error("API ERROR in addStatusUpdate:", error);
        throw new Error('Could not add status update.');
    }
}

api.updateCustomerCell = async function(customerId, field, value) {
    console.log(`API: Updating customer ${customerId}, field ${field} with value "${value}"...`);
    try {
        const updateData = {};
        updateData[field] = value;
        
        const { data, error } = await window.supabaseClient
            .from('customers')
            .update(updateData)
            .eq('id', customerId)
            .select()
            .single();
        if (error) throw error;
        console.log("API: Customer updated successfully.");
        return data;
    } catch (error) {
        console.error("API ERROR in updateCustomerCell:", error);
        throw new Error('Could not update customer.');
    }
}

api.addCustomer = async function(salesName) {
    console.log("API: Attempting to add a new customer...");
    try {
        const { data, error } = await window.supabaseClient
            .from('customers')
            .insert({
                sales: salesName,
                date: new Date().toISOString().split('T')[0]
            })
            .select()
            .single();
        
        if (error) throw error;
        console.log("API: New customer added successfully.", data);
        return data;
    } catch (error) {
        console.error("API ERROR in addCustomer:", error);
        throw new Error('Could not add a new customer.');
    }
}

// 🟢 ADDED: ฟังก์ชันสำหรับลบข้อมูลลูกค้า
api.deleteCustomer = async function(customerId) {
    console.log(`API: Attempting to delete customer ${customerId}...`);
    try {
        const { error } = await window.supabaseClient
            .from('customers')
            .delete()
            .eq('id', customerId);

        if (error) throw error;
        console.log("API: Customer deleted successfully.");
        return true;
    } catch (error) {
        console.error("API ERROR in deleteCustomer:", error);
        throw new Error('Could not delete customer.');
    }
}

// ทำให้ API พร้อมใช้งานแบบ global
window.api = api;
