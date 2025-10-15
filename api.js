// ================================================================================
// API Layer - Handles all communication with the Supabase backend.
// (FINAL & COMPLETE VERSION)
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
        .select('role, username, full_name, is_active')
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
            role: 'sales',
            is_active: true
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

api.fetchPaginatedCustomers = async function(params) {
    const { filters, dateRange, sort, pagination } = params;
    const { currentPage, pageSize } = pagination;
    const offset = (currentPage - 1) * pageSize;

    let query = window.supabaseClient
        .from('customers')
        .select('*', { count: 'exact' });

    if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,lead_code.ilike.%${filters.search}%`);
    }
    if (filters.status) {
        query = query.eq('last_status', filters.status);
    }
    if (filters.sales) {
        query = query.eq('sales', filters.sales);
    }
    if (dateRange.startDate) {
        query = query.gte('date', dateRange.startDate);
    }
    if (dateRange.endDate) {
        query = query.lte('date', dateRange.endDate);
    }
    if (sort.column && sort.direction) {
        query = query.order(sort.column, { ascending: sort.direction === 'asc' });
    }
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;
    
    if (error) throw new Error('ไม่สามารถดึงข้อมูลลูกค้าได้: ' + error.message);
    return { data, count };
};

api.fetchAllCustomersForExport = async function() {
    const { data, error } = await window.supabaseClient
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw new Error('ไม่สามารถดึงข้อมูลทั้งหมดเพื่อ Export ได้: ' + error.message);
    return data;
};

api.fetchCustomerById = async function(customerId) {
    const { data, error } = await window.supabaseClient
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();
    if (error) throw new Error('ไม่สามารถดึงข้อมูลลูกค้ารายบุคคลได้: ' + error.message);
    return data;
};

api.addCustomer = async function(salesUsername) {
    const { data, error } = await window.supabaseClient.rpc('create_new_customer', {
        sales_username: salesUsername
    });
    if (error) {
        console.error('RPC Error in addCustomer:', error);
        throw new Error('ไม่สามารถเพิ่มลูกค้าใหม่ได้: ' + error.message);
    }
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

api.bulkInsertCustomers = async function(customers) {
    const { error } = await window.supabaseClient
        .from('customers')
        .insert(customers);
    if (error) throw new Error('การนำเข้าข้อมูลจำนวนมากผิดพลาด: ' + error.message);
};

// --- Status History & Dropdowns ---

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
        .select('*, users:created_by(username, role)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
    if (error) throw new Error('ไม่สามารถดึงข้อมูลประวัติได้: ' + error.message);
    return data;
};

api.fetchAllUniqueStatuses = async function() {
    const { data, error } = await window.supabaseClient
        .from('customers')
        .select('last_status');
    if (error) throw new Error('ไม่สามารถดึงสถานะได้: ' + error.message);
    const uniqueStatuses = [...new Set(data.map(item => item.last_status).filter(Boolean))].sort();
    return uniqueStatuses;
};

// --- Sales & Reports ---

api.fetchSalesList = async function() {
    try {
        const { data, error } = await window.supabaseClient
            .from('users')
            .select('username')
            .eq('role', 'sales')
            .eq('is_active', true);
        
        if (error) throw error;
        return data.map(u => u.username).sort();
    } catch (error) {
        throw new Error('ไม่สามารถดึงรายชื่อเซลล์ได้: ' + error.message);
    }
};

api.getSalesReport = async function(userId, startDate = null, endDate = null) {
    if (!userId) {
        throw new Error('User ID is required to get a sales report.');
    }
    const RPC_FUNCTION_NAME = 'get_full_sales_report';
    const params = { requesting_user_id: userId };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    try {
        const { data, error } = await window.supabaseClient.rpc(RPC_FUNCTION_NAME, params);
        if (error) throw error;
        return data;
    } catch (error) {
        console.error("API ERROR in getSalesReport:", error);
        throw new Error('Could not fetch sales report data: ' + error.message);
    }
};

api.getDashboardStats = async function(dateRange) {
    let todayQuery = window.supabaseClient.from('customers').select('id', { count: 'exact' }).eq('date', new Date().toISOString().split('T')[0]);
    let pendingQuery = window.supabaseClient.from('customers').select('id', { count: 'exact' }).eq('status_1', 'ตามต่อ');
    let closedQuery = window.supabaseClient.from('customers').select('id', { count: 'exact' }).eq('status_1', 'ปิดการขาย').eq('last_status', '100%').not('closed_amount', 'is', null);

    if (dateRange.startDate) {
        todayQuery = window.supabaseClient.from('customers').select('id', { count: 'exact' }).gte('date', dateRange.startDate).lte('date', dateRange.endDate);
        pendingQuery = pendingQuery.gte('date', dateRange.startDate);
        closedQuery = closedQuery.gte('date', dateRange.startDate);
    }
    if (dateRange.endDate) {
        pendingQuery = pendingQuery.lte('date', dateRange.endDate);
        closedQuery = closedQuery.lte('date', dateRange.endDate);
    }

    const [todayRes, pendingRes, closedRes] = await Promise.all([todayQuery, pendingQuery, closedQuery]);

    return {
        todayCustomers: todayRes.count,
        pendingCustomers: pendingRes.count,
        closedDeals: closedRes.count
    };
};

window.api = api;
