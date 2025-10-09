// ================================================================================
// BEAUTY CLINIC CRM - MAIN ORCHESTRATOR (PERFORMANCE ENHANCED & BUG FIXED)
// ================================================================================

const state = {
    currentUser: null,
    customers: [],        
    filteredCustomers: [], 
    salesList: [],
    activeFilters: { search: '', status: '', sales: '' },
    dateFilter: { startDate: null, endDate: null, preset: 'all' },
    pagination: { currentPage: 1, pageSize: 50 },
    editingCustomerId: null
};

const DROPDOWN_OPTIONS = {
    channel: ["-เพื่อนแนะนำ/", "-Walk-In/", "-PHONE-IN/", "-Line@/", "-Fbc By หมอธีร์ (ปลูกผม)", "-Fbc By หมอธีร์ (หัตถการอื่น)", "-FBC HAIR CLINIC", "-Fbc ตาสองชั้น ยกคิ้ว เสริมจมูก", "-Fbc ปรับรูปหน้า Botox Filler HIFU", "-เว็บไซต์", "-AGENCY", "-IG", "-Tiktok "],
    procedure: ["ตา Dr.T", "ตาทีมแพทย์", "ปลูกผม", "ปลูกหนวด/เครา", "ปลูกคิ้ว", "FaceLift", "จมูก/ปาก/คาง", "Thermage", "Ultraformer", "Filler", "BOTOX", "Laser กำจัดขน", "SKIN อื่น ๆ", "ตา Dr.T/ปลูกผม", "ตา/SKIN", "ผม/SKIN", "ตา/อื่นๆ", "ผม/อื่นๆ", "ตาทีมแพทย์/ปลูกผม"],
    confirm_y: ["Y", "N"],
    transfer_100: ["Y", "N"],
    status_1: ["status 1", "status 2", "status 3", "status 4", "ไม่สนใจ", "ปิดการขาย", "ตามต่อ"],
    cs_confirm: ["CSX", "CSY"],
    last_status: ["100%", "75%", "50%", "25%", "0%", "ONLINE", "เคส OFF"]
};

const SALES_EDITABLE_FIELDS = [
    'update_access', 'last_status', 'call_time', 'status_1', 'reason', 
    'etc', 'hn_customer', 'old_appointment', 'dr', 'closed_amount', 'appointment_date'
];

// ================================================================================
// INITIALIZATION
// ================================================================================

async function initializeApp() {
    console.log('Starting app initialization...');
    ui.showLoading(true);
    try {
        if (!window.supabaseClient || !window.api || !window.ui) throw new Error('Dependencies not loaded');
        
        ui.renderTableHeaders();

        const session = await api.getSession();
        if (!session) { window.location.replace('login.html'); return; }
        
        let userProfile = await api.getUserProfile(session.user.id);
        if (!userProfile) userProfile = await api.createDefaultUserProfile(session.user);
        
        state.currentUser = { id: session.user.id, ...userProfile };
        window.state = state; 
        ui.updateUIAfterLogin(state.currentUser);

        const [customers, salesList] = await Promise.all([
            api.fetchAllCustomers(),
            api.fetchSalesList()
        ]);
        
        state.customers = customers || [];
        state.salesList = salesList || [];
        
        const statuses = [...new Set(state.customers.map(c => c.last_status).filter(Boolean))].sort();
        ui.populateFilterDropdown('salesFilter', state.salesList);
        ui.populateFilterDropdown('statusFilter', statuses);

        updateVisibleData(); 
        ui.showStatus('โหลดข้อมูลสำเร็จ', false);
    } catch (error) {
        console.error('Initialization failed:', error);
        ui.showStatus('เกิดข้อผิดพลาด: ' + error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

// ================================================================================
// MASTER DATA PROCESSING & RENDERING PIPELINE
// ================================================================================

function updateVisibleData() {
    let dateFiltered = state.customers;
    if (state.dateFilter.startDate && state.dateFilter.endDate) {
        const localStartDate = state.dateFilter.startDate;
        const localEndDate = new Date(state.dateFilter.endDate);
        localEndDate.setHours(23, 59, 59, 999); 
        dateFiltered = state.customers.filter(c => {
            if (!c.date) return false;
            const customerDate = new Date(c.date + 'T00:00:00'); 
            return customerDate >= localStartDate && customerDate <= localEndDate;
        });
    }

    const { search, status, sales } = state.activeFilters;
    const lowerCaseSearch = search.toLowerCase();
    state.filteredCustomers = dateFiltered.filter(customer => {
        const searchableText = `${customer.name || ''} ${customer.phone || ''} ${customer.lead_code || ''}`.toLowerCase();
        const matchesSearch = !search || searchableText.includes(lowerCaseSearch);
        const matchesStatus = !status || customer.last_status === status;
        const matchesSales = !sales || customer.sales === sales;
        return matchesSearch && matchesStatus && matchesSales;
    });

    const { currentPage, pageSize } = state.pagination;
    const totalRecords = state.filteredCustomers.length;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedCustomers = state.filteredCustomers.slice(startIndex, endIndex);

    ui.renderTable(paginatedCustomers, currentPage, pageSize);
    ui.renderPaginationControls(totalPages, currentPage, totalRecords, pageSize);
    updateDashboardStats(); 
}

// ================================================================================
// DASHBOARD & FILTERS
// ================================================================================
function updateDashboardStats() {
    const dataSet = state.filteredCustomers; 
    document.getElementById('totalCustomers').textContent = dataSet.length;
    const today = new Date().toISOString().split('T')[0];
    const todayCustomers = dataSet.filter(c => c.date === today).length;
    document.getElementById('todayCustomers').textContent = todayCustomers;
    const pendingCustomers = dataSet.filter(c => c.status_1 === 'ตามต่อ').length;
    document.getElementById('pendingCustomers').textContent = pendingCustomers;
    const closedDeals = dataSet.filter(c => c.status_1 === 'ปิดการขาย' && c.last_status === '100%' && c.closed_amount).length;
    document.getElementById('closedDeals').textContent = closedDeals;
}

function setDateFilterPreset(preset) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let startDate = new Date(today);
    let endDate = new Date(today);
    switch(preset) {
        case '7d': startDate.setDate(today.getDate() - 6); break;
        case '30d': startDate.setDate(today.getDate() - 29); break;
        case 'today': break;
        case 'all': startDate = null; endDate = null; break;
    }
    state.dateFilter = { startDate, endDate, preset };
    document.getElementById('startDateFilter').valueAsDate = startDate;
    document.getElementById('endDateFilter').valueAsDate = endDate;
    document.querySelectorAll('.btn-date-filter').forEach(btn => btn.classList.toggle('active', btn.dataset.preset === preset));
    if (preset === 'all') document.getElementById('clearDateFilter').classList.add('active');
    state.pagination.currentPage = 1;
    updateVisibleData();
}

// ================================================================================
// USER ACTIONS & MODALS
// ================================================================================

/**
 * ✨ UPDATED: This function now generates the lead code automatically.
 */
async function handleAddCustomer() {
    ui.showLoading(true);
    try {
        // 1. Get today's lead count
        const todaysCount = await api.getTodaysLeadCount();
        const nextNumber = todaysCount + 1;

        // 2. Format the date part (e.g., 251009 for 2025-10-09)
        const now = new Date();
        const year = String(now.getFullYear()).slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const datePart = `${year}${month}${day}`;
        
        // 3. Format the number part (e.g., 001)
        const numberPart = String(nextNumber).padStart(3, '0');
        
        // 4. Combine to create the new lead code
        const newLeadCode = `${datePart}-${numberPart}`;

        // 5. Add customer with the new lead code
        const newCustomer = await api.addCustomer(state.currentUser?.username || 'N/A', newLeadCode);
        state.customers.unshift(newCustomer);
        
        updateVisibleData();
        showEditModal(newCustomer.id);
        ui.showStatus('เพิ่มลูกค้าใหม่สำเร็จ กรุณากรอกข้อมูล', false);
    } catch (error) {
        ui.showStatus(error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

// ... (The rest of the main.js file remains unchanged)
function getAllowedNextStatuses(currentStatus) { /* ... unchanged ... */ }
function showUpdateStatusModal(customer) { /* ... unchanged ... */ }
function showEditModal(customerId) { /* ... unchanged ... */ }
function hideEditModal() { /* ... unchanged ... */ }
async function handleSaveEditForm(event) { /* ... unchanged ... */ }
async function handleLogout() { /* ... unchanged ... */ }
function handleTableClick(event) { /* ... unchanged ... */ }
async function handleViewHistory(customerId, customerName) { /* ... unchanged ... */ }
async function handleSubmitStatusUpdate() { /* ... unchanged ... */ }
function handleContextMenu(event) { /* ... unchanged ... */ }
async function handleContextMenuItemClick(event) { /* ... unchanged ... */ }
function setupEventListeners() { /* ... unchanged ... */ }

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});
