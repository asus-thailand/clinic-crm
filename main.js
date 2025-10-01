// ================================================================================
// BEAUTY CLINIC CRM - MAIN ORCHESTRATOR (FINAL + MOBILE EDIT FORM)
// ================================================================================

const state = {
    currentUser: null,
    customers: [],
    salesList: [],
    activeFilters: { search: '', status: '', sales: '' },
    editingCell: null,
    contextMenuRowId: null,
    editingCustomerId: null // ID ของลูกค้าที่กำลังแก้ไข
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

async function initializeApp() {
    console.log('Starting app initialization...');
    ui.showLoading(true);
    try {
        if (!window.supabaseClient || !window.api || !window.ui) throw new Error('Dependencies not loaded');
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
        applyFiltersAndRender();
        ui.showStatus('โหลดข้อมูลสำเร็จ', false);
    } catch (error) {
        console.error('Initialization failed:', error);
        ui.showStatus('เกิดข้อผิดพลาด: ' + error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

function applyFiltersAndRender() {
    const { search, status, sales } = state.activeFilters;
    const lowerCaseSearch = search.toLowerCase();
    const filteredCustomers = state.customers.filter(customer => {
        const matchesSearch = !search || Object.values(customer).some(val => String(val).toLowerCase().includes(lowerCaseSearch));
        const matchesStatus = !status || customer.status_1 === status;
        const matchesSales = !sales || customer.sales === sales;
        return matchesSearch && matchesStatus && matchesSales;
    });
    ui.renderTable(filteredCustomers, state.currentUser, SALES_EDITABLE_FIELDS);
}

// --- LOGIC สำหรับฟอร์มแก้ไขข้อมูลบนมือถือ ---

function showEditModal(customerId) {
    const customer = state.customers.find(c => c.id == customerId);
    if (!customer) {
        ui.showStatus('ไม่พบข้อมูลลูกค้า', true);
        return;
    }
    state.editingCustomerId = customerId;

    const form = document.getElementById('editCustomerForm');
    form.innerHTML = ''; // Clear previous form

    // สร้างฟอร์มแบบไดนามิกจาก FIELD_MAPPING ใน ui.js
    Object.entries(ui.FIELD_MAPPING).forEach(([header, field]) => {
        if (!field) return; // ข้ามคอลัมน์ที่ไม่มี field (เช่น จัดการ, #)

        const value = customer[field] || '';
        const options = (field === 'sales') ? state.salesList : DROPDOWN_OPTIONS[field];
        const isSalesUser = state.currentUser.role === 'sales';
        const isEditable = !isSalesUser || (isSalesUser && SALES_EDITABLE_FIELDS.includes(field));

        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        
        let inputHtml = '';
        if (options) {
            inputHtml = `<select name="${field}" ${!isEditable ? 'disabled' : ''}><option value="">-- เลือก --</option>${options.map(opt => `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`).join('')}</select>`;
        } else {
            inputHtml = `<input type="text" name="${field}" value="${escapeHtml(value)}" ${!isEditable ? 'disabled' : ''}>`;
        }
        
        formGroup.innerHTML = `<label for="${field}">${header}</label>${inputHtml}`;
        form.appendChild(formGroup);
    });

    document.getElementById('editModalTitle').textContent = `แก้ไข: ${customer.name || 'ลูกค้าใหม่'}`;
    document.getElementById('editCustomerModal').classList.add('show');
}

function hideEditModal() {
    state.editingCustomerId = null;
    document.getElementById('editCustomerModal').classList.remove('show');
}

async function handleSaveEditForm(event) {
    event.preventDefault();
    if (!state.editingCustomerId) return;
    
    ui.showLoading(true);
    const form = event.target;
    const formData = new FormData(form);
    const updatedData = {};
    for (const [key, value] of formData.entries()) {
        updatedData[key] = value;
    }

    try {
        const updatedCustomer = await api.updateCustomer(state.editingCustomerId, updatedData);
        
        const index = state.customers.findIndex(c => c.id == state.editingCustomerId);
        if (index !== -1) {
            state.customers[index] = updatedCustomer;
        }
        
        hideEditModal();
        applyFiltersAndRender();
        ui.showStatus('บันทึกข้อมูลสำเร็จ', false);
    } catch (error) {
        console.error('Save failed:', error);
        ui.showStatus('บันทึกข้อมูลไม่สำเร็จ: ' + error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

// --- CORE ACTION HANDLERS ---

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
        applyFiltersAndRender();
        // เปิดฟอร์มแก้ไขสำหรับลูกค้าใหม่ทันที
        showEditModal(newCustomer.id);
        ui.showStatus('เพิ่มลูกค้าใหม่สำเร็จ กรุณากรอกข้อมูล', false);
    } catch (error) {
        ui.showStatus(error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

// --- Event Handlers for Table actions ---
function handleTableClick(event) {
    const target = event.target;
    const action = target.dataset.action;
    if (!action) return;

    // หา id จาก element ที่ใกล้ที่สุดที่มี data-id
    const id = target.closest('[data-id]')?.dataset.id;
    if (!id) return;

    const name = target.dataset.name;
    
    if (action === 'edit-customer') {
        showEditModal(id);
    }
    if (action === 'update-status') {
        ui.showModal('statusUpdateModal', { customerId: id, customerName: name });
    }
    if (action === 'view-history') {
        handleViewHistory(id, name);
    }
}

async function handleViewHistory(customerId, customerName) {
    ui.showModal('historyModal', { customerName });
    const historyData = await api.fetchStatusHistory(customerId);
    ui.renderHistoryTimeline(historyData);
}

async function handleSubmitStatusUpdate() {
    const customerId = document.getElementById('modalCustomerId').value;
    const newStatus = document.getElementById('modalStatusSelect').value;
    const notes = document.getElementById('modalNotesText').value.trim();
    if (!newStatus) return ui.showStatus('กรุณาเลือกสถานะ', true);

    ui.showLoading(true);
    try {
        await api.addStatusUpdate(customerId, newStatus, notes, state.currentUser.id);
        const updatedCustomer = await api.updateCustomerCell(customerId, 'last_status', newStatus);
        const index = state.customers.findIndex(c => c.id == updatedCustomer.id);
        if (index !== -1) state.customers[index] = { ...state.customers[index], ...updatedCustomer };
        applyFiltersAndRender();
        ui.hideModal('statusUpdateModal');
        ui.showStatus('อัปเดตสถานะสำเร็จ', false);
    } catch (error) {
        ui.showStatus(error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

function setupEventListeners() {
    const tableBody = document.getElementById('tableBody');
    const contextMenu = document.getElementById('contextMenu');
    
    document.getElementById('logoutButton')?.addEventListener('click', handleLogout);
    document.getElementById('addUserButton')?.addEventListener('click', handleAddCustomer);
    document.getElementById('submitStatusUpdateBtn')?.addEventListener('click', handleSubmitStatusUpdate);
    
    // Listeners for Mobile Edit Form
    document.getElementById('editCustomerForm')?.addEventListener('submit', handleSaveEditForm);
    document.getElementById('closeEditModalBtn')?.addEventListener('click', hideEditModal);
    document.getElementById('cancelEditBtn')?.addEventListener('click', hideEditModal);

    // Main table event listener
    tableBody?.addEventListener('click', handleTableClick);

    // Other listeners
    document.querySelectorAll('[data-modal-close]').forEach(b => b.addEventListener('click', () => ui.hideModal(b.dataset.modalClose)));
    document.getElementById('searchInput')?.addEventListener('input', e => {
        state.activeFilters.search = e.target.value;
        applyFiltersAndRender();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});
