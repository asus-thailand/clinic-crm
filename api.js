// ================================================================================
// BEAUTY CLINIC CRM - API LAYER (COMPLETE FIXED VERSION 100%)
// ================================================================================

const api = {};

// ... (โค้ดส่วน AUTH, USER PROFILE, CUSTOMER CRUD ยังคงเดิม) ...

// ================================================================================
// STATUS HISTORY APIs
// ================================================================================
api.fetchStatusHistory = async function(customerId) {
    try {
        const { data, error } = await window.supabaseClient.from('customer_status_history').select('*, users(username)').eq('customer_id', customerId).order('created_at', { ascending: false });
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
        // *** จุดที่แก้ไข: เปลี่ยนจาก return null; เป็น throw new Error; เพื่อป้องกัน Silent Failure ***
        throw new Error('Could not add status update.'); 
    }
}
