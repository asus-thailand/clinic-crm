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
    // ... (unchanged)
};

const SALES_EDITABLE_FIELDS = [
    'update_access', 'last_status', 'call_time', 'status_1', 'reason', 
    'etc', 'hn_customer', 'old_appointment', 'dr', 'closed_amount', 'appointment_date'
];

function parseDateString(dateStr) {
    if (!dateStr) return null;
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            let year = parseInt(parts[2], 10);
            if (year > 2500) { year -= 543; }
            return new Date(year, month, day);
        }
    }
    const date = new Date(dateStr + 'T00:00:00');
    return isNaN(date.getTime()) ? null : date;
}

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
        const startTimestamp = state.dateFilter.startDate.getTime();
        const endTimestamp = new Date(state.dateFilter.endDate).setHours(23, 59, 59, 999);
        dateFiltered = state.customers.filter(c => {
            const customerDate = parseDateString(c.date);
            if (!customerDate) return false;
            const customerTimestamp = customerDate.getTime();
            return customerTimestamp >= startTimestamp && customerTimestamp <= endTimestamp;
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
// USER ACTIONS & MODALS
// ================================================================================

/**
 * ✨ UPDATED: This function now generates lead code in MM-BB-XXXX format.
 */
async function handleAddCustomer() {
    ui.showLoading(true);
    try {
        // 1. Get current month's lead count
        const monthlyCount = await api.getCurrentMonthLeadCount();
        const nextNumber = monthlyCount + 1;

        // 2. Format the date part (MM-BB)
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const buddhistYear = String(now.getFullYear() + 543).slice(-2);
        
        // 3. Format the number part (XXXX)
        const numberPart = String(nextNumber).padStart(4, '0');
        
        // 4. Combine to create the new lead code
        const newLeadCode = `${month}-${buddhistYear}-${numberPart}`;

        // 5. Add customer with the new lead code
        const newCustomer = await api.addCustomer(state.currentUser?.username || 'N/A', newLeadCode);
        
        if (newCustomer) {
            await api.addStatusUpdate(newCustomer.id, 'สร้างลูกค้าใหม่', `ระบบสร้าง Lead อัตโนมัติ`, state.currentUser.id);
        }
        
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        newCustomer.call_time = `${hours}:${minutes}`;

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

// ... (The rest of the file remains unchanged)
function updateDashboardStats() { /* ... */ }
function setDateFilterPreset(preset) { /* ... */ }
function getAllowedNextStatuses(currentStatus) { /* ... */ }
function showUpdateStatusModal(customer) { /* ... */ }
function showEditModal(customerId) { /* ... */ }
function hideEditModal() { /* ... */ }
async function handleSaveEditForm(event) { /* ... */ }
async function handleLogout() { /* ... */ }
function handleTableClick(event) { /* ... */ }
async function handleViewHistory(customerId, customerName) { /* ... */ }
async function handleSubmitStatusUpdate() { /* ... */ }
function handleContextMenu(event) { /* ... */ }
async function handleContextMenuItemClick(event) { /* ... */ }
function setupEventListeners() { /* ... */ }

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});
