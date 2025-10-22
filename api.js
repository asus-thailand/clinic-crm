// ================================================================================
// API Layer - Handles all communication with the Supabase backend.
// (FINAL VERSION 100% - UNMINIFIED with CSV Bulk Insert)
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
 * [FIXED] Gets the latest lead code, starting from 1235 if the table is empty.
 * @returns {Promise<number>} The latest lead code number (e.g., 1235 if empty, or highest existing number).
 */
api.getLatestLeadCode = async function() {
    const { data, error, count } = await window.supabaseClient
        .from('customers')
        .select('lead_code', { count: 'exact', head: false }) // Get count efficiently
        .order('lead_code', { ascending: false, nulls: 'last' })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('Error fetching latest lead code:', error);
        return 1235; // Default to 1235 if error occurs
    }

    // [NEW LOGIC] If the table is empty (count is 0 or data is null), start from 1235
    if (count === 0 || !data || !data.lead_code) {
        console.log("Customer table is empty or no valid lead_code found. Starting sequence from 1235.");
        return 1235; 
    }

    // If table is not empty, try to parse the latest code
    const latestCode = parseInt(data.lead_code, 10);

    // If parsing fails (e.g., "10-68-0002") OR if the latest code is less than 1235, return 1235
    if (isNaN(latestCode) || latestCode < 1235) {
         console.warn(`Latest lead_code '${data.lead_code}' is invalid or less than start sequence. Using 1235.`);
         return 1235;
    }

    // Otherwise, return the valid latest code found
    return latestCode;
};


/**
 * [FIXED] Adds a new customer record, allowing for a manual lead code OR auto-increment.
 * @param {string} salesUsername The username of the sales person creating the customer.
 * @param {string} [manualLeadCode=""] The lead code manually entered by the user (from prompt).
 * @returns {Promise<object>} The newly created customer object.
 */
api.addCustomer = async function(salesUsername, manualLeadCode = "") {

    let finalLeadCode;

    // 1. ตรวจสอบว่าผู้ใช้ป้อนค่าเข้ามาใน prompt หรือไม่
    if (manualLeadCode && manualLeadCode.trim() !== "") {
        // ถ้าป้อน (เช่น "1236") ให้ใช้ค่านั้นเลย
        finalLeadCode = manualLeadCode.trim();
    } else {
        // 2. ถ้าผู้ใช้เว้นว่าง (กด OK โดยไม่พิมพ์) ให้ใช้ระบบอัตโนมัติ
        // (ซึ่งตอนนี้จะเริ่มที่ 1236 ถ้าตารางว่าง)
        const latestCode = await api.getLatestLeadCode();
        finalLeadCode = (latestCode + 1).toString();
    }

    const newCustomerData = {
        lead_code: finalLeadCode, // ใช้ Lead Code ที่เราเลือก/คำนวณ
        sales: salesUsername,
        date: new Date().toISOString().split('T')[0]
    };

    const { data, error } = await window.supabaseClient
        .from('customers')
        .insert(newCustomerData)
        .select()
        .single();

    if (error) {
         // เพิ่มการตรวจสอบ Lead Code ซ้ำ
         if (error.message.includes('duplicate key value violates unique constraint') && error.message.includes('lead_code')) {
             throw new Error(`ไม่สามารถเพิ่มลูกค้าใหม่ได้: 'ลำดับที่' (Lead Code) "${finalLeadCode}" นี้ถูกใช้ไปแล้ว`);
         }
        throw new Error('ไม่สามารถเพิ่มลูกค้าใหม่ได้: ' + error.message);
    }
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

/**
 * [NEW] Function to handle bulk inserting customers from CSV.
 * @param {Array<object>} customers An array of customer objects to insert.
 */
api.bulkInsertCustomers = async function(customers) {
    if (!customers || customers.length === 0) {
        throw new Error("No customer data provided for bulk insert.");
    }
    const { error } = await window.supabaseClient
        .from('customers')
        .insert(customers); // Supabase handles bulk insert directly

    if (error) {
        // Provide more specific error feedback if possible
        if (error.message.includes('unique constraint') && error.message.includes('lead_code')) {
            throw new Error('นำเข้าไม่สำเร็จ: พบ Lead Code ซ้ำในระบบ');
        } else if (error.message.includes('unique constraint')) {
            throw new Error('นำเข้าไม่สำเร็จ: พบข้อมูลซ้ำ (Unique Constraint Violated)');
        }
        throw new Error('นำเข้าข้อมูลไม่สำเร็จ: ' + error.message);
    }
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
    // [FIXED] เปลี่ยนชื่อคอลัมน์เป็น 'created_by' เพื่อให้สอดคล้องกัน
    // นี่คือคอลัมน์ใน 'customer_status_history' ที่ลิงก์ไปยัง 'users.id'
    const createdByColumn = 'created_by';

    const historyData = {
        customer_id: customerId,
        status: status,
        notes: notes,
        [createdByColumn]: userId // ใช้ชื่อคอลัมน์ที่ถูกต้อง
    };

    const { error } = await window.supabaseClient
        .from('customer_status_history')
        .insert(historyData);

    if (error) console.error('Failed to add status history:', error.message);
};


/**
 * Fetches the status history for a customer, explicitly defining the relationship to 'users'.
 * @param {string} customerId The ID of the customer.
 * @returns {Promise<Array>} An array of history records.
 */
api.fetchStatusHistory = async function(customerId) {
    // [FIXED] เปลี่ยนชื่อคอลัมน์เป็น 'created_by' เพื่อให้สอดคล้องกัน
    // และเปลี่ยนชื่อตัวแปรให้ชัดเจนขึ้น
    const userForeignKeyColumn = 'created_by';

    const { data, error } = await window.supabaseClient
        .from('customer_status_history')
        // Explicitly tells Supabase to join 'users' via the specified foreign key
        .select(`*, users!${userForeignKeyColumn}(username, role)`)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

    if (error) throw new Error('ไม่สามารถดึงข้อมูลประวัติได้: ' + error.message);
    return data || []; // Return empty array if no history
};


// --- Sales & Reports ---

/**
 * Fetches a list of usernames for users with the 'sales' role.
 * @returns {Promise<Array>} A sorted array of sales usernames.
 */
api.fetchSalesList = async function() {
    try {
        const { data, error } = await window.supabaseClient
            .from('users')
            .select('username')
            .eq('role', 'sales'); // Filter for 'sales' role only

        if (error) throw error;
        // Ensure data is an array before mapping and sorting
        return Array.isArray(data) ? data.map(u => u.username).sort() : [];

    } catch (error) {
        throw new Error('ไม่สามารถดึงรายชื่อเซลล์ได้: ' + error.message);
    }
};

/**
 * Fetches the sales report data by calling a remote procedure call (RPC) in Supabase.
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
    const params = { requesting_user_id: userId };
    // Only add date parameters if they are non-empty strings
    if (startDate && typeof startDate === 'string' && startDate.trim() !== '') params.start_date = startDate;
    if (endDate && typeof endDate === 'string' && endDate.trim() !== '') params.end_date = endDate;

    try {
        const { data, error } = await window.supabaseClient.rpc(RPC_FUNCTION_NAME, params);
        if (error) throw error;
        return data;
    } catch (error) {
        console.error("API ERROR in getSalesReport:", error);
        throw new Error('Could not fetch sales report data: ' + error.message);
    }
};

// Make the 'api' object available globally
window.api = api;
