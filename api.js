// ================================================================================
// API Layer - Handles all communication with the Supabase backend.
// (COMPLETE & DEBUGGED VERSION)
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
        .select('*, users(username, role)') // ดึง role มาด้วยเพื่อการแสดงผลที่ดีขึ้น
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
 * [CRITICAL FIX & ENHANCED DEBUGGING]
 * แก้ไขและเพิ่มคำอธิบายสำหรับส่วนที่เกิด Error บ่อย
 * ดึงข้อมูลรายงานการขายโดยการเรียกฟังก์ชัน (RPC) ในฐานข้อมูล Supabase
 */
api.getSalesReport = async function(userId) {
    if (!userId) {
        throw new Error('User ID is required to get a sales report.');
    }

    // ============================ 🎯 จุดตรวจสอบ 🎯 ============================
    // Error ที่เกิดขึ้นในภาพหน้าจอ มาจาก 2 จุดนี้เป็นหลัก:
    //
    // 1. RPC_FUNCTION_NAME:
    //    ชื่อฟังก์ชันในฐานข้อมูลของคุณ ต้องตรงกับ 'get_full_sales_report' ทุกตัวอักษร
    //    ให้เข้าไปเช็คที่ Supabase Dashboard > Database > Functions
    //
    // 2. PARAMETER_NAME:
    //    ชื่อพารามิเตอร์ (ตัวรับค่า) ที่ฟังก์ชันในฐานข้อมูลต้องการ ต้องตรงกับ 'requesting_user_id'
    //
    // หากชื่อใดชื่อหนึ่งไม่ตรงกัน ให้แก้ไขในโค้ดด้านล่างนี้ให้ถูกต้อง
    // ======================================================================
    const RPC_FUNCTION_NAME = 'get_full_sales_report';
    const PARAMETER_NAME = 'requesting_user_id';
    
    try {
        const { data, error } = await window.supabaseClient.rpc(RPC_FUNCTION_NAME, {
            [PARAMETER_NAME]: userId
        });
        
        // หากเกิด Error, ให้โยน Error นั้นออกไปเพื่อให้ catch ด้านล่างทำงาน
        if (error) {
            throw error;
        }
        
        return data;

    } catch (error) {
        console.error("API ERROR in getSalesReport:", error);

        // [ENHANCED] เพิ่มการตรวจสอบ Error Code เพื่อให้คำแนะนำที่เฉพาะเจาะจงมากขึ้น
        if (error.code === '42883') { // "function does not exist" error code
            throw new Error(
                `ไม่พบฟังก์ชันในฐานข้อมูล! \n\n` +
                `กรุณาตรวจสอบว่า:\n` +
                `1. ชื่อฟังก์ชัน RPC ใน Supabase คือ '${RPC_FUNCTION_NAME}' หรือไม่?\n` +
                `2. พารามิเตอร์ของฟังก์ชันชื่อ '${PARAMETER_NAME}' หรือไม่?\n\n` +
                `(Original Error: ${error.message})`
            );
        }
        
        // Error อื่นๆ ทั่วไป
        throw new Error('Could not fetch sales report data: ' + error.message);
    }
};

// ทำให้ Object 'api' พร้อมใช้งานในไฟล์อื่น
window.api = api;
