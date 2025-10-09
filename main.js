// ================================================================================
// BEAUTY CLINIC CRM - MAIN ORCHESTRATOR (PERFORMANCE ENHANCED & BUG FIXED)
// ================================================================================

// ✨ UPDATED: Add new state variables for pagination and date filters
const state = {
    currentUser: null,
    customers: [],        // Raw data from API
    filteredCustomers: [], // Data after all filters are applied
    salesList: [],
    activeFilters: { search: '', status: '', sales: '' },
    dateFilter: { startDate: null, endDate: null, preset: 'all' },
    pagination: { currentPage: 1, pageSize: 50 },
    editingCustomerId: null
};

const DROPDOWN_OPTIONS = {
    status_1: ["status 1", "status 2", "status 3", "status 4", "ไม่สนใจ", "ปิดการขาย", "ตามต่อ"],
    // ... (rest of the dropdown options remain the same)
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
        window.state = state; // Make state globally accessible for ui.js
        ui.updateUIAfterLogin(state.currentUser);

        const [customers, salesList] = await Promise.all([
            api.fetchAllCustomers(),
            api.fetchSalesList()
        ]);
        
        state.customers = customers || [];
        state.salesList = salesList || [];
        
        // Populate static dropdowns
        const statuses = [...new Set(state.customers.map(c => c.last_status).filter(Boolean))].sort();
        ui.populateFilterDropdown('salesFilter', state.salesList);
        ui.populateFilterDropdown('statusFilter', statuses);

        updateVisibleData(); // First render
        ui.showStatus('โหลดข้อมูลสำเร็จ', false);
    } catch (error) {
        console.error('Initialization failed:', error);
        ui.showStatus('เกิดข้อผิดพลาด: ' + error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

// ================================================================================
// ✨ NEW: MASTER DATA PROCESSING & RENDERING PIPELINE
// ================================================================================

function updateVisibleData() {
    // 1. Apply Date Filter
    let dateFiltered = state.customers;
    if (state.dateFilter.startDate && state.dateFilter.endDate) {
        dateFiltered = state.customers.filter(c => {
            if (!c.date) return false;
            const customerDate = new Date(c.date);
            return customerDate >= state.dateFilter.startDate && customerDate <= state.dateFilter.endDate;
        });
    }

    // 2. Apply Other Filters (Search, Status, Sales)
    const { search, status, sales } = state.activeFilters;
    const lowerCaseSearch = search.toLowerCase();

    state.filteredCustomers = dateFiltered.filter(customer => {
        const searchableText = `${customer.name || ''} ${customer.phone || ''} ${customer.lead_code || ''}`.toLowerCase();
        const matchesSearch = !search || searchableText.includes(lowerCaseSearch);
        const matchesStatus = !status || customer.last_status === status;
        const matchesSales = !sales || customer.sales === sales;
        return matchesSearch && matchesStatus && matchesSales;
    });

    // 3. Apply Pagination
    const { currentPage, pageSize } = state.pagination;
    const totalRecords = state.filteredCustomers.length;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedCustomers = state.filteredCustomers.slice(startIndex, endIndex);

    // 4. Render UI Components
    ui.renderTable(paginatedCustomers, currentPage, pageSize);
    ui.renderPaginationControls(totalPages, currentPage, totalRecords, pageSize);
    updateDashboardStats(); // Update stats based on filtered data
}

// ================================================================================
// DASHBOARD & FILTERS
// ================================================================================

function updateDashboardStats() {
    const dataSet = state.filteredCustomers; // Use filtered data for stats
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
    endDate.setHours(23, 59, 59, 999);

    switch(preset) {
        case '7d':
            startDate.setDate(today.getDate() - 6);
            break;
        case '30d':
            startDate.setDate(today.getDate() - 29);
            break;
        case 'today':
            // Already set
            break;
        case 'all':
            startDate = null;
            endDate = null;
            break;
    }
    
    state.dateFilter.startDate = startDate;
    state.dateFilter.endDate = endDate;
    state.dateFilter.preset = preset;

    // Update UI
    document.getElementById('startDateFilter').valueAsDate = startDate;
    document.getElementById('endDateFilter').valueAsDate = endDate;
    document.querySelectorAll('.btn-date-filter').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === preset);
    });
    if (preset === 'all') document.getElementById('clearDateFilter').classList.add('active');

    state.pagination.currentPage = 1;
    updateVisibleData();
}

// ================================================================================
// (All other functions from the previous version remain largely the same,
// with minor tweaks to call updateVisibleData() instead of applyFilters())
// ... The following is the rest of the complete file.
// ================================================================================

function getAllowedNextStatuses(currentStatus) {
    const specialStatuses = ["ไม่สนใจ", "ปิดการขาย", "ตามต่อ"];
    if (!currentStatus || currentStatus.trim() === '') return ["status 1", ...specialStatuses];
    switch (currentStatus) {
        case "status 1": return ["status 2", ...specialStatuses];
        case "status 2": return ["status 3", ...specialStatuses];
        case "status 3": return ["status 4", ...specialStatuses];
        case "status 4": return [...specialStatuses];
        default: if (specialStatuses.includes(currentStatus)) return [...specialStatuses];
            return ["status 1", ...specialStatuses];
    }
}

function showUpdateStatusModal(customer) {
    const select = document.getElementById('modalStatusSelect');
    if (!select) return;
    const allowedStatuses = getAllowedNextStatuses(customer.status_1);
    select.innerHTML = '<option value="">-- เลือกสถานะ --</option>';
    allowedStatuses.forEach(opt => {
        const optionEl = document.createElement('option');
        optionEl.value = opt;
        optionEl.textContent = opt;
        select.appendChild(optionEl);
    });
    ui.showModal('statusUpdateModal', { 
        customerId: customer.id, 
        customerName: customer.name || customer.lead_code || 'N/A' 
    });
}

function showEditModal(customerId) {
    const customer = state.customers.find(c => c.id == customerId);
    if (!customer) { ui.showStatus('ไม่พบข้อมูลลูกค้า', true); return; }
    state.editingCustomerId = customerId;
    ui.buildEditForm(customer, state.currentUser, SALES_EDITABLE_FIELDS, state.salesList, DROPDOWN_OPTIONS);
    document.getElementById('editCustomerModal').classList.add('show');
}

function hideEditModal() {
    state.editingCustomerId = null;
    document.getElementById('editCustomerModal').classList.remove('show');
}

async function handleSaveEditForm(event) {
    event.preventDefault();
    if (!state.editingCustomerId) return;
    
    const form = event.target;
    const formData = new FormData(form);
    const updatedData = {};
    for (const [key, value] of formData.entries()) { updatedData[key] = value; }
    const originalCustomer = state.customers.find(c => c.id == state.editingCustomerId);

    const isClosingAttempt = updatedData.last_status === '100%' || updatedData.status_1 === 'ปิดการขาย' || (updatedData.closed_amount && updatedData.closed_amount.trim() !== '');
    if (isClosingAttempt) {
        const isClosingComplete = updatedData.last_status === '100%' && updatedData.status_1 === 'ปิดการขาย' && (updatedData.closed_amount && updatedData.closed_amount.trim() !== '');
        if (!isClosingComplete) {
            ui.showStatus('การปิดการขายต้องกรอก: Last Status (100%), Status Sale (ปิดการขาย), และ ยอดที่ปิดได้ ให้ครบถ้วน', true);
            return;
        }
    }

    ui.showLoading(true);
    try {
        const updatedCustomer = await api.updateCustomer(state.editingCustomerId, updatedData);
        
        const historyPromises = [];
        for (const [key, value] of Object.entries(updatedData)) {
            if (String(originalCustomer[key] || '') !== String(value)) {
                const allFields = { ...ui.FIELD_MAPPING, 'Staus Sale': { field: 'status_1'}, 'เหตุผล': { field: 'reason'} };
                const header = Object.keys(allFields).find(h => allFields[h].field === key) || key;
                const logNote = `แก้ไข '${header}' จาก '${originalCustomer[key] || ''}' เป็น '${value}'`;
                historyPromises.push(api.addStatusUpdate(state.editingCustomerId, 'แก้ไขข้อมูล', logNote, state.currentUser.id));
            }
        }
        if (historyPromises.length > 0) { await Promise.all(historyPromises); }
        
        const index = state.customers.findIndex(c => c.id == state.editingCustomerId);
        if (index !== -1) { state.customers[index] = updatedCustomer; }
        
        hideEditModal();
        updateVisibleData();
        ui.showStatus('บันทึกข้อมูลสำเร็จ', false);
    } catch (error) {
        console.error('Save failed:', error);
        ui.showStatus('บันทึกข้อมูลไม่สำเร็จ: ' + error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

async function handleLogout() {
    if (confirm('ต้องการออกจากระบบหรือไม่?')) { await api.signOut(); window.location.replace('login.html'); }
}

async function handleAddCustomer() {
    ui.showLoading(true);
    try {
        const newCustomer = await api.addCustomer(state.currentUser?.username || 'N/A');
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

function handleTableClick(event) {
    const target = event.target;
    const action = target.dataset.action;
    if (!action || target.disabled) return;
    const id = target.closest('[data-id]')?.dataset.id;
    if (!id) return;
    const customer = state.customers.find(c => c.id == id);
    if (!customer) return;
    if (action === 'edit-customer') { showEditModal(id); }
    if (action === 'update-status') { showUpdateStatusModal(customer); }
    if (action === 'view-history') { handleViewHistory(id, customer.name); }
}

async function handleViewHistory(customerId, customerName) {
    ui.showModal('historyModal', { customerName });
    ui.showLoading(true);
    try {
        const historyData = await api.fetchStatusHistory(customerId);
        ui.renderHistoryTimeline(historyData);
    } catch (error) {
        ui.showStatus(error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

async function handleSubmitStatusUpdate() {
    const customerId = document.getElementById('modalCustomerId').value;
    const newStatus = document.getElementById('modalStatusSelect').value;
    const notes = document.getElementById('modalNotesText').value.trim();
    if (!newStatus) return ui.showStatus('กรุณาเลือกสถานะ', true);
    const requiresReason = ["status 1", "status 2", "status 3", "status 4"].includes(newStatus);
    if (requiresReason && !notes) { return ui.showStatus('สำหรับ Status 1-4 กรุณากรอกเหตุผล/บันทึกเพิ่มเติม', true); }
    ui.showLoading(true);
    try {
        const updateData = { status_1: newStatus, reason: notes, last_status: newStatus };
        await api.addStatusUpdate(customerId, newStatus, notes, state.currentUser.id);
        const updatedCustomer = await api.updateCustomer(customerId, updateData);
        const index = state.customers.findIndex(c => c.id == updatedCustomer.id);
        if (index !== -1) { state.customers[index] = updatedCustomer; }
        updateVisibleData();
        ui.hideModal('statusUpdateModal');
        ui.showStatus('อัปเดตสถานะสำเร็จ', false);
    } catch (error) {
        ui.showStatus("เกิดข้อผิดพลาดในการอัปเดต: " + error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

function handleContextMenu(event) {
    const row = event.target.closest('tr');
    if (!row || !row.dataset.id) return;
    if (state.currentUser.role === 'sales') { event.preventDefault(); return; }
    event.preventDefault();
    state.contextMenuRowId = row.dataset.id;
    ui.showContextMenu(event);
}

async function handleContextMenuItemClick(event) {
    const action = event.target.dataset.action;
    if (!action || !state.contextMenuRowId) return;
    ui.hideContextMenu();
    if (action === 'delete') {
        const customerToDelete = state.customers.find(c => c.id == state.contextMenuRowId);
        if (confirm(`คุณต้องการลบลูกค้า "${customerToDelete?.name || 'รายนี้'}" ใช่หรือไม่?`)) {
            ui.showLoading(true);
            try {
                await api.deleteCustomer(state.contextMenuRowId);
                state.customers = state.customers.filter(c => c.id != state.contextMenuRowId);
                updateVisibleData();
                ui.showStatus('ลบข้อมูลสำเร็จ', false);
            } catch (error) {
                ui.showStatus(error.message, true);
            } finally {
                ui.showLoading(false);
            }
        }
    }
    state.contextMenuRowId = null;
}

// ================================================================================
// EVENT LISTENERS SETUP
// ================================================================================

function setupEventListeners() {
    document.getElementById('logoutButton')?.addEventListener('click', handleLogout);
    document.getElementById('addUserButton')?.addEventListener('click', handleAddCustomer);
    document.getElementById('submitStatusUpdateBtn')?.addEventListener('click', handleSubmitStatusUpdate);
    document.getElementById('editCustomerForm')?.addEventListener('submit', handleSaveEditForm);
    document.getElementById('closeEditModalBtn')?.addEventListener('click', hideEditModal);
    document.getElementById('cancelEditBtn')?.addEventListener('click', hideEditModal);
    document.getElementById('refreshButton')?.addEventListener('click', initializeApp);
    
    // Main Filters
    document.getElementById('searchInput')?.addEventListener('input', e => { state.activeFilters.search = e.target.value; state.pagination.currentPage = 1; updateVisibleData(); });
    document.getElementById('statusFilter')?.addEventListener('change', e => { state.activeFilters.status = e.target.value; state.pagination.currentPage = 1; updateVisibleData(); });
    document.getElementById('salesFilter')?.addEventListener('change', e => { state.activeFilters.sales = e.target.value; state.pagination.currentPage = 1; updateVisibleData(); });

    // ✨ NEW: Date Filter Listeners
    document.querySelectorAll('.btn-date-filter[data-preset]').forEach(button => {
        button.addEventListener('click', () => setDateFilterPreset(button.dataset.preset));
    });
    document.getElementById('clearDateFilter')?.addEventListener('click', () => setDateFilterPreset('all'));
    document.getElementById('startDateFilter')?.addEventListener('change', () => {
        state.dateFilter.startDate = document.getElementById('startDateFilter').valueAsDate;
        if (state.dateFilter.endDate) { state.pagination.currentPage = 1; updateVisibleData(); }
    });
    document.getElementById('endDateFilter')?.addEventListener('change', () => {
        state.dateFilter.endDate = document.getElementById('endDateFilter').valueAsDate;
        if (state.dateFilter.startDate) { state.pagination.currentPage = 1; updateVisibleData(); }
    });

    // ✨ NEW: Pagination Listeners
    document.getElementById('paginationContainer')?.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (button && button.dataset.page) {
            const page = button.dataset.page;
            if (page === 'prev') {
                if (state.pagination.currentPage > 1) state.pagination.currentPage--;
            } else if (page === 'next') {
                const totalPages = Math.ceil(state.filteredCustomers.length / state.pagination.pageSize);
                if (state.pagination.currentPage < totalPages) state.pagination.currentPage++;
            } else {
                state.pagination.currentPage = parseInt(page);
            }
            updateVisibleData();
        }
    });
    document.getElementById('paginationContainer')?.addEventListener('change', event => {
        if (event.target.id === 'pageSize') {
            state.pagination.pageSize = parseInt(event.target.value);
            state.pagination.currentPage = 1; // Reset to first page
            updateVisibleData();
        }
    });

    // Other listeners
    const tableBody = document.getElementById('tableBody');
    tableBody?.addEventListener('click', handleTableClick);
    tableBody?.addEventListener('contextmenu', handleContextMenu);
    const contextMenu = document.getElementById('contextMenu');
    contextMenu?.addEventListener('click', handleContextMenuItemClick);
    window.addEventListener('click', (event) => { if (contextMenu && !contextMenu.contains(event.target)) { ui.hideContextMenu(); } });
    document.querySelectorAll('[data-modal-close]').forEach(btn => { btn.addEventListener('click', () => ui.hideModal(btn.dataset.modalClose)); });
}

// ================================================================================
// APPLICATION START
// ================================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});
