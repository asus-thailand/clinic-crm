// ================================================================================
// API Layer - (VERSION 100% with Date Logic)
// ================================================================================

const api = {};

// --- Authentication & User Profile ---

api.getSession = async function() {
    const { data, error } = await window.supabaseClient.auth.getSession();
    if (error) {
        console.error('Error getting session:', error);
        return null;
    }
    return data.session;
};

api.getUserProfile = async function(userId) {
    const { data, error } = await window.supabaseClient
        .from('users')
        .select('role, username, full_name')
        .eq('id', userId)
        .single();
    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
    }
    return data;
};

api.createDefaultUserProfile = async function(user) {
    const username = user.email.split('@')[0];
    const { data, error } = await window.supabaseClient
        .from('users')
        .insert({
            id: user.id,
            username: username,
            full_name: username,
            role: 'sales'
        })
        .select()
        .single();
    if (error) {
        console.error('Error creating default user profile:', error);
    }
    return data;
};

api.signOut = async function() {
    await window.supabaseClient.auth.signOut();
};


// --- Customer Data ---

api.fetchAllCustomers = async function() {
    const { data, error } = await window.supabaseClient
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw new Error('ไม่สามารถดึงข้อมูลลูกค้าได้: ' + error.message);
    return data;
};

api.addCustomer = async function(salesUsername) {
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

api.deleteCustomer = async function(customerId) {
    const { error } = await window.supabaseClient
        .from('customers')
        .delete()
        .eq('id', customerId);

    if (error) throw new Error('ลบข้อมูลลูกค้าไม่สำเร็จ: ' + error.message);
};


// --- Status History ---

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

api.fetchStatusHistory = async function(customerId) {
    const { data, error } = await window.supabaseClient
        .from('customer_status_history')
        .select('*, users(username, role)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
    
    if (error) throw new Error('ไม่สามารถดึงข้อมูลประวัติได้: ' + error.message);
    return data;
};


// --- Sales & Reports ---

api.fetchSalesList = async function() {
    try {
        const { data, error } = await window.supabaseClient
            .from('users')
            .select('username')
            .not('username', 'is', null);
        
        if (error) throw error;
        return data.map(u => u.username).sort();

    } catch (error) {
        throw new Error('ไม่สามารถดึงรายชื่อเซลล์ได้: ' + error.message);
    }
};

/**
 * [MODIFIED] ดึงข้อมูลรายงานการขาย โดยเพิ่มความสามารถในการส่ง start_date และ end_date
 */
api.getSalesReport = async function(userId, startDate = null, endDate = null) {
    if (!userId) {
        throw new Error('User ID is required to get a sales report.');
    }

    const RPC_FUNCTION_NAME = 'get_full_sales_report';

    // สร้าง object พารามิเตอร์ที่จะส่งไป
    const params = {
        requesting_user_id: userId
    };
    
    // เพิ่มวันที่เข้าไป ถ้ามีค่าเท่านั้น
    if (startDate) {
        params.start_date = startDate;
    }
    if (endDate) {
        params.end_date = endDate;
    }
    
    try {
        // ส่งพารามิเตอร์ทั้งหมดไปพร้อมกัน
        const { data, error } = await window.supabaseClient.rpc(RPC_FUNCTION_NAME, params);
        
        if (error) throw error;
        
        return data;

    } catch (error) {
        console.error("API ERROR in getSalesReport:", error);
        if (error.code === '42883') {
            throw new Error(`ไม่พบฟังก์ชันในฐานข้อมูล! กรุณาตรวจสอบว่าชื่อฟังก์ชัน RPC คือ '${RPC_FUNCTION_NAME}' หรือไม่?`);
        }
        throw new Error('Could not fetch sales report data: ' + error.message);
    }
};

// ทำให้ Object 'api' พร้อมใช้งานในไฟล์อื่น
window.api = api;
