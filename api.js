// ================================================================================
// API Layer - Handles all communication with the Supabase backend.
// ================================================================================

// สร้าง Object 'api' ว่างๆ ขึ้นมาก่อน
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
    if (error && error.code !== 'PGRST116') { // Ignore "no rows found" error
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
    if (error) console.error('Failed to add status history:', error); // Log error but don't block main flow
};

api.fetchStatusHistory = async function(customerId) {
    const { data, error } = await window.supabaseClient
        .from('customer_status_history')
        .select('*, users(username)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
    
    if (error) throw new Error('ไม่สามารถดึงข้อมูลประวัติได้: ' + error.message);
    return data;
};


// --- Sales & Reports ---

api.fetchSalesList = async function() {
    const { data, error } = await window.supabaseClient
        .from('users')
        .select('username')
        .filter('username', 'is', 'not.null');
    
    if (error) throw new Error('ไม่สามารถดึงรายชื่อเซลล์ได้: ' + error.message);
    return data.map(u => u.username).sort();
};

/**
 * [CORRECTED VERSION]
 * ดึงข้อมูลรายงานการขาย โดยส่ง User ID ที่ได้รับมา ไปให้ฟังก์ชันในฐานข้อมูลอย่างถูกต้อง
 */
api.getSalesReport = async function(userId) {
    // 1. ตรวจสอบก่อนว่าได้รับ userId มาจริงหรือไม่
    if (!userId) {
        throw new Error('User ID is required to get a sales report.');
    }
    
    try {
        // 2. เรียกใช้ฟังก์ชัน rpc พร้อมส่ง userId ที่ได้รับมา ในรูปแบบที่ถูกต้อง
        // Supabase ต้องการ Object ที่มี key ตรงกับชื่อพารามิเตอร์ในฟังก์ชัน SQL
        const { data, error } = await window.supabaseClient.rpc('get_full_sales_report', {
            requesting_user_id: userId // <--- ส่ง userId ไปที่นี่
        });
        
        // 3. ถ้ามี error จาก Supabase ให้โยนออกไป
        if (error) {
            throw error;
        }
        
        // 4. ถ้าสำเร็จ ให้ส่งข้อมูลกลับไป
        return data;

    } catch (error) {
        // 5. หากเกิดข้อผิดพลาดใดๆ ในกระบวนการ ให้แสดงใน Console และโยน Error ออกไป
        console.error("API ERROR in getSalesReport:", error);
        throw new Error('Could not fetch sales report data.');
    }
};


// ทำให้ Object 'api' พร้อมใช้งานในไฟล์อื่น
window.api = api;
