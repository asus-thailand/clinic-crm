// ================================================================================
// BEAUTY CLINIC CRM - MAIN ORCHESTRATOR (PERFORMANCE ENHANCED & BUG FIXED)
// ================================================================================

const state = {
    currentUser: null,
    customers: [],
    salesList: [],
    activeFilters: { search: '', status: '', sales: '' },
    editingCell: null,
    contextMenuRowId: null,
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
// DASHBOARD STATISTICS CALCULATION
// ================================================================================

function updateDashboardStats() {
    const customers = state.customers;
    if (!customers) return;

    document.getElementById('totalCustomers').textContent = customers.length;

    const today = new Date().toISOString().split('T')[0];
    const todayCustomers = customers.filter(c => c.date === today).length;
    document.getElementById('todayCustomers').textContent = todayCustomers;

    const pendingCustomers = customers.filter(c => c.status_1 === 'ตามต่อ').length;
    document.getElementById('pendingCustomers').textContent = pendingCustomers;

    const closedDeals = customers.filter(c => c.status_1 === 'ปิดการขาย').length;
    document.getElementById('closedDeals').textContent = closedDeals;
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
        if (!session) {
            window.location.replace('login.html');
            return;
        }
        
        let userProfile = await api.getUserProfile(session.user.id);
        if (!userProfile) userProfile = await api.createDefaultUserProfile(session.user);
        
        state.currentUser = { id: session.user.id, ...userProfile };
        ui.updateUIAfterLogin(state.currentUser);

        const [customers, salesList] = await Promise.all([
            api.fetchAllCustomers(),
            api.fetchSalesList()
        ]);
        
        state.customers = customers || [];
        state.salesList = salesList || [];
        
        const statuses = [...new Set(state.customers.map(c => c.last_status).filter(Boolean))].sort();

        renderFullTable();
        ui.populateFilterDropdown('salesFilter', state.salesList);
        ui.populateFilterDropdown('statusFilter', statuses);

        ui.showStatus('โหลดข้อมูลสำเร็จ', false);
    } catch (error) {
        console.error('Initialization failed:', error);
        ui.showStatus('เกิดข้อผิดพลาด: ' + error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

// ================================================================================
// FILTERING & RENDERING (PERFORMANCE FOCUS)
// ================================================================================

function renderFullTable() {
    ui.renderTable(state.customers, state.currentUser);
    updateDashboardStats();
    applyFilters();
}

function applyFilters() {
    const { search, status, sales } = state.activeFilters;
    const lowerCaseSearch = search.toLowerCase();
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;

    const rows = tableBody.querySelectorAll('tr');
    let visibleRows = 0;

    rows.forEach(row => {
        const customer = state.customers.find(c => c.id == row.dataset.id);
        if (!customer) {
            row.classList.add('hidden');
            return;
        }

        const searchableText = `${customer.name || ''} ${customer.phone || ''} ${customer.lead_code || ''}`.toLowerCase();
        const matchesSearch = !search || searchableText.includes(lowerCaseSearch);
        const matchesStatus = !status || customer.last_status === status;
        const matchesSales = !sales || customer.sales === sales;

        if (matchesSearch && matchesStatus && matchesSales) {
            row.classList.remove('hidden');
            visibleRows++;
            const rowNumberCell = row.querySelector('.row-number');
            if(rowNumberCell) rowNumberCell.textContent = visibleRows;
        } else {
            row.classList.add('hidden');
        }
    });
}

// ================================================================================
// ✨ NEW: State Machine Logic for Status Transitions
// ================================================================================

/**
 * คำนวณสถานะถัดไปที่สามารถเลือกได้ตาม Logic ที่กำหนด
 * @param {string | null} currentStatus - สถานะปัจจุบันของลูกค้า
 * @returns {string[]} - Array ของสถานะที่สามารถเลือกได้
 */
function getAllowedNextStatuses(currentStatus) {
    const specialStatuses = ["ไม่สนใจ", "ปิดการขาย", "ตามต่อ"];
    
    if (!currentStatus || currentStatus.trim() === '') {
        return ["status 1", ...specialStatuses];
    }
    
    switch (currentStatus) {
        case "status 1":
            return ["status 2", ...specialStatuses];
        case "status 2":
            return ["status 3", ...specialStatuses];
        case "status 3":
            return ["status 4", ...specialStatuses];
        case "status 4":
            return [...specialStatuses]; // หลังจาก status 4 ไปได้แค่สถานะพิเศษ
        default:
            // ถ้าเป็นสถานะพิเศษอยู่แล้ว ก็ยังสามารถเปลี่ยนไปเป็นสถานะพิเศษอื่นๆ ได้
            if (specialStatuses.includes(currentStatus)) {
                return [...specialStatuses];
            }
            // Fallback สำหรับกรณีอื่นๆ
            return ["status 1", ...specialStatuses];
    }
}


// ================================================================================
// EDIT MODAL HANDLERS
// ================================================================================

function showEditModal(customerId) {
    const customer = state.customers.find(c => c.id == customerId);
    if (!customer) {
        ui.showStatus('ไม่พบข้อมูลลูกค้า', true);
        return;
    }
    
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
    const originalCustomer = state.customers.find(c => c.id == state.editingCustomerId);
    
    for (const [key, value] of formData.entries()) {
        updatedData[key] = value;
    }

    if (updatedData.status_1 === 'ปิดการขาย') {
        if (!updatedData.last_status || !updatedData.closed_amount) {
            ui.showStatus("สำหรับสถานะ 'ปิดการขาย' กรุณากรอก Last Status และ ยอดที่ปิดได้ ให้ครบถ้วน", true);
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
        
        if (historyPromises.length > 0) {
            await Promise.all(historyPromises);
        }
        
        const index = state.customers.findIndex(c => c.id == state.editingCustomerId);
        if (index !== -1) {
            state.customers[index] = updatedCustomer;
        }
        
        hideEditModal();
        renderFullTable();
        ui.showStatus('บันทึกข้อมูลสำเร็จ', false);
    } catch (error) {
        console.error('Save failed:', error);
        ui.showStatus('บันทึกข้อมูลไม่สำเร็จ: ' + error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

// ================================================================================
// USER ACTIONS
// ================================================================================

async function handleLogout() {
    if (confirm('ต้องการออกจากระบบหรือไม่?')) {
        await api.signOut();
        window.location.replace('login.html');
    }
}

async function handleAddCustomer() {
    ui.showLoading(true);
    try {
        const newCustomer = await api.addCustomer(state.currentUser?.username || 'N/A');
        state.customers.unshift(newCustomer);

        state.activeFilters = { search: '', status: '', sales: '' };
        document.getElementById('searchInput').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('salesFilter').value = '';
        
        renderFullTable();
        showEditModal(newCustomer.id);
        ui.showStatus('เพิ่มลูกค้าใหม่สำเร็จ กรุณากรอกข้อมูล', false);
    } catch (error) {
        ui.showStatus(error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

// ================================================================================
// TABLE INTERACTIONS & STATUS UPDATE
// ================================================================================

/**
 * ✨ NEW: ฟังก์ชันใหม่สำหรับเปิด Modal อัปเดตสถานะพร้อมสร้าง Dropdown แบบ Dynamic
 * @param {object} customer - ข้อมูลลูกค้าที่ต้องการอัปเดต
 */
function showUpdateStatusModal(customer) {
    const select = document.getElementById('modalStatusSelect');
    if (!select) return;

    // 1. หาตัวเลือกที่สามารถเลือกได้
    const allowedStatuses = getAllowedNextStatuses(customer.status_1);

    // 2. สร้าง Dropdown จากตัวเลือกที่ถูกต้องเท่านั้น
    select.innerHTML = '<option value="">-- เลือกสถานะ --</option>'; // เริ่มต้นด้วยตัวเลือกว่าง
    allowedStatuses.forEach(opt => {
        const optionEl = document.createElement('option');
        optionEl.value = opt;
        optionEl.textContent = opt;
        select.appendChild(optionEl);
    });

    // 3. แสดง Modal
    ui.showModal('statusUpdateModal', { 
        customerId: customer.id, 
        customerName: customer.name || customer.lead_code || 'N/A' 
    });
}

function handleTableClick(event) {
    const target = event.target;
    const action = target.dataset.action;
    if (!action) return;

    if (target.disabled) {
        return;
    }

    const id = target.closest('[data-id]')?.dataset.id;
    if (!id) return;

    const customer = state.customers.find(c => c.id == id);
    if (!customer) return;
    
    if (action === 'edit-customer') {
        showEditModal(id);
    }
    // ✨ UPDATED: เรียกใช้ฟังก์ชันใหม่ที่สร้าง Dropdown แบบ Dynamic
    if (action === 'update-status') {
        showUpdateStatusModal(customer);
    }
    if (action === 'view-history') {
        handleViewHistory(id, customer.name);
    }
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

// ✨ UPDATED: เพิ่ม Logic การตรวจสอบ "เหตุผล"
async function handleSubmitStatusUpdate() {
    const customerId = document.getElementById('modalCustomerId').value;
    const newStatus = document.getElementById('modalStatusSelect').value;
    const notes = document.getElementById('modalNotesText').value.trim();
    
    if (!newStatus) {
        return ui.showStatus('กรุณาเลือกสถานะ', true);
    }

    // ✨ VALIDATION: ตรวจสอบว่าต้องกรอกเหตุผลหรือไม่
    const requiresReason = ["status 1", "status 2", "status 3", "status 4"].includes(newStatus);
    if (requiresReason && !notes) {
        return ui.showStatus('สำหรับ Status 1-4 กรุณากรอกเหตุผล/บันทึกเพิ่มเติม', true);
    }

    ui.showLoading(true);

    try {
        const updateData = {
            status_1: newStatus,
            reason: notes,
            last_status: newStatus 
        };

        await api.addStatusUpdate(customerId, newStatus, notes, state.currentUser.id);

        const updatedCustomer = await api.updateCustomer(customerId, updateData);
        
        const index = state.customers.findIndex(c => c.id == updatedCustomer.id);
        if (index !== -1) {
            state.customers[index] = updatedCustomer;
        }
        
        renderFullTable();
        ui.hideModal('statusUpdateModal');
        ui.showStatus('อัปเดตสถานะสำเร็จ', false);

    } catch (error) {
        ui.showStatus("เกิดข้อผิดพลาดในการอัปเดต: " + error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

// ================================================================================
// CONTEXT MENU & OTHER FUNCTIONS
// ================================================================================

function handleContextMenu(event) {
    // ... (This function remains unchanged)
    const row = event.target.closest('tr');
    if (!row || !row.dataset.id) return;

    if (state.currentUser.role === 'sales') {
        event.preventDefault();
        return;
    }
    
    event.preventDefault();
    state.contextMenuRowId = row.dataset.id;
    ui.showContextMenu(event);
}

async function handleContextMenuItemClick(event) {
    // ... (This function remains unchanged)
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
                renderFullTable();
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

// REMOVED: The old populateStatusModalDropdown is no longer needed

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

    const tableBody = document.getElementById('tableBody');
    tableBody?.addEventListener('click', handleTableClick);
    tableBody?.addEventListener('contextmenu', handleContextMenu);
    
    const contextMenu = document.getElementById('contextMenu');
    contextMenu?.addEventListener('click', handleContextMenuItemClick);
    window.addEventListener('click', (event) => {
        if (contextMenu && !contextMenu.contains(event.target)) {
            ui.hideContextMenu();
        }
    });
    
    document.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.addEventListener('click', () => ui.hideModal(btn.dataset.modalClose));
    });
    
    document.getElementById('searchInput')?.addEventListener('input', e => {
        state.activeFilters.search = e.target.value;
        applyFilters();
    });
    document.getElementById('statusFilter')?.addEventListener('change', e => {
        state.activeFilters.status = e.target.value;
        applyFilters();
    });
    document.getElementById('salesFilter')?.addEventListener('change', e => {
        state.activeFilters.sales = e.target.value;
        applyFilters();
    });
}

// ================================================================================
// APPLICATION START
// ================================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});
