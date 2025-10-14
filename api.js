// ================================================================================
// API Layer - Handles all communication with the Supabase backend.
// (FINAL VERSION 100% - UNMINIFIED)
// ================================================================================

const api = {};

// --- Authentication & User Profile ---

/**
 * Retrieves the current user session from Supabase.
 * @returns {Promise<object|null>} The session object or null if not logged in.
 */
api.getSession = async function() {
    const { data, error } = await window.supabaseClient.auth.getSession();
    if (error) {
        console.error('Error getting session:', error);
        return null;
    }
    return data.session;
};

/**
 * Fetches the profile of a specific user from the 'users' table.
 * @param {string} userId The UUID of the user.
 * @returns {Promise<object|null>} The user profile object.
 */
api.getUserProfile = async function(userId) {
    const { data, error } = await window.supabaseClient
        .from('users')
        .select('role, username, full_name')
        .eq('id', userId)
        .single();
    if (error && error.code !== 'PGRST116') { // Ignore "no rows found" error
        console.error('Error fetching user profile:', error);
    }
    return data;
};

/**
 * Creates a default user profile if one doesn't exist upon first login.
 * @param {object} user The user object from Supabase Auth.
 * @returns {Promise<object|null>} The newly created user profile.
 */
api.createDefaultUserProfile = async function(user) {
    const username = user.email.split('@')[0];
    const { data, error } = await window.supabaseClient
        .from('users')
        .insert({
            id: user.id,
            username: username,
            full_name: username,
            role: 'sales' // Default role is 'sales'
        })
        .select()
        .single();
    if (error) {
        console.error('Error creating default user profile:', error);
    }
    return data;
};

/**
 * Signs the current user out.
 */
api.signOut = async function() {
    await window.supabaseClient.auth.signOut();
};


// --- Customer Data ---

/**
 * Fetches all customer records from the 'customers' table.
 * @returns {Promise<Array>} An array of customer objects.
 */
api.fetchAllCustomers = async function() {
    const { data, error } = await window.supabaseClient
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw new Error('ไม่สามารถดึงข้อมูลลูกค้าได้: ' + error.message);
    return data;
};

/**
 * Adds a new customer record.
 * @param {string} salesUsername The username of the sales person creating the customer.
 * @returns {Promise<object>} The newly created customer object.
 */
api.addCustomer = async function(salesUsername) {
    // Get the latest lead code to generate the next one
    const { data: latestLead } = await window.supabaseClient
        .from('customers')
        .select('lead_code')
        .order('lead_code', { ascending: false })
        .limit(1)
        .single();

    const nextLeadCode = (latestLead?.lead_code) ? parseInt(latestLead.lead_code) + 1 : 1001;

    const newCustomerData = {
        lead_code: nextLeadCode.toString(),
        sales: salesUsername,
        date: new Date().toISOString().split('T')[0]
    };
    
    const { data, error } = await window.supabaseClient
        .from('customers')
        .insert(newCustomerData)
        .select()
        .single();

    if (error) throw new Error('ไม่สามารถเพิ่มลูกค้าใหม่ได้: ' + error.message);
    return data;
};

/**
 * Updates an existing customer record.
 * @param {string} customerId The ID of the customer to update.
 * @param {object} updatedData An object containing the fields to update.
 * @returns {Promise<object>} The updated customer object.
 */
api.updateCustomer = async function(customerId, updatedData) {
    const { data, error } = await window.supabaseClient
        .from('customers')
        .update(updatedData)
        .eq('id', customerId)
        .select()
        .single();

    if (error) throw new Error('อัปเดตข้อมูลลูกค้าไม่สำเร็จ: ' + error.message);
    return data;
};

/**
 * Deletes a customer record.
 * @param {string} customerId The ID of the customer to delete.
 */
api.deleteCustomer = async function(customerId) {
    const { error } = await window.supabaseClient
        .from('customers')
        .delete()
        .eq('id', customerId);

    if (error) throw new Error('ลบข้อมูลลูกค้าไม่สำเร็จ: ' + error.message);
};


// --- Status History ---

/**
 * Adds a new entry to the customer status history.
 * @param {string} customerId The ID of the related customer.
 * @param {string} status The new status.
 * @param {string} notes Additional notes.
 * @param {string} userId The ID of the user performing the update.
 */
api.addStatusUpdate = async function(customerId, status, notes, userId) {
    const { error } = await window.supabaseClient
        .from('customer_status_history')
        .insert({
            customer_id: customerId,
            status: status,
            notes: notes,
            created_by: userId
        });
    if (error) console.error('Failed to add status history:', error);
};

/**
 * [FINAL FIX] Fetches the status history for a customer, explicitly defining the relationship to 'users'.
 * @param {string} customerId The ID of the customer.
 * @returns {Promise<Array>} An array of history records.
 */
api.fetchStatusHistory = async function(customerId) {
    const { data, error } = await window.supabaseClient
        .from('customer_status_history')
        // Explicitly tells Supabase to join 'users' via the 'created_by' foreign key
        .select('*, users:created_by(username, role)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
    
    if (error) throw new Error('ไม่สามารถดึงข้อมูลประวัติได้: ' + error.message);
    return data;
};


// --- Sales & Reports ---

/**
 * [FINAL] Fetches a list of usernames for users with the 'sales' role.
 * @returns {Promise<Array>} A sorted array of sales usernames.
 */
api.fetchSalesList = async function() {
    try {
        const { data, error } = await window.supabaseClient
            .from('users')
            .select('username')
            .eq('role', 'sales'); // Filter for 'sales' role only
        
        if (error) throw error;
        return data.map(u => u.username).sort();

    } catch (error) {
        throw new Error('ไม่สามารถดึงรายชื่อเซลล์ได้: ' + error.message);
    }
};

/**
 * [FINAL] Fetches the sales report data by calling a remote procedure call (RPC) in Supabase.
 * Can filter the report by a date range.
 * @param {string} userId The ID of the user requesting the report.
 * @param {string|null} startDate The start date for the filter (YYYY-MM-DD).
 * @param {string|null} endDate The end date for the filter (YYYY-MM-DD).
 * @returns {Promise<object>} The report data object.
 */
api.getSalesReport = async function(userId, startDate = null, endDate = null) {
    if (!userId) {
        throw new Error('User ID is required to get a sales report.');
    }

    const RPC_FUNCTION_NAME = 'get_full_sales_report';

    // Prepare parameters object for the RPC
    const params = {
        requesting_user_id: userId
    };
    
    // Only add date parameters if they are provided
    if (startDate) {
        params.start_date = startDate;
    }
    if (endDate) {
        params.end_date = endDate;
    }
    
    try {
        // Call the RPC with all parameters
        const { data, error } = await window.supabaseClient.rpc(RPC_FUNCTION_NAME, params);
        
        if (error) {
            throw error;
        }
        
        return data;

    } catch (error) {
        console.error("API ERROR in getSalesReport:", error);
        throw new Error('Could not fetch sales report data: ' + error.message);
    }
};

// Make the 'api' object available globally
window.api = api;
