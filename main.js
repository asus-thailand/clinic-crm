// ================================================================================
// BEAUTY CLINIC CRM - MAIN ORCHESTRATOR (COMPLETE FIXED VERSION 100%)
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
// INITIALIZATION
// ================================================================================

async function initializeApp() {
    console.log('Starting app initialization...');
    ui.showLoading(true);
    try {
        if (!window.supabaseClient || !window.api || !window.ui) {
            throw new Error('Dependencies not loaded');
        }
        
        const session = await api.getSession();
        if (!session) {
            window.location.replace('login.html');
            return;
        }
        
        let userProfile = await api.getUserProfile(session.user.id);
        if (!userProfile) {
            userProfile = await api.createDefaultUserProfile(session.user);
        }
        
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

// ================================================================================
// FILTERING & RENDERING
// ================================================================================

function applyFiltersAndRender() {
    const { search, status, sales } = state.activeFilters;
    const lowerCaseSearch = search.toLowerCase();
    
    const filteredCustomers = state.customers.filter(customer => {
        const matchesSearch = !search || Object.values(customer).some(val => 
            String(val).toLowerCase().includes(lowerCaseSearch)
        );
        const matchesStatus = !status || customer.status_1 === status;
        const matchesSales = !sales || customer.sales === sales;
        return matchesSearch && matchesStatus && matchesSales;
    });
    
    ui.renderTable(filteredCustomers, state.currentUser, SALES_EDITABLE_FIELDS);
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
    const form = document.getElementById('editCustomerForm');
    form.innerHTML = ''; 

    Object.entries(ui.FIELD_MAPPING).forEach(([header, field]) => {
        if (!field) return; 

        const value = customer[field] || '';
        const options = (field === 'sales') ? state.salesList : DROPDOWN_OPTIONS[field];
        const isSalesUser = state.currentUser.role === 'sales';
        const isEditable = !isSalesUser || (isSalesUser && SALES_EDITABLE_FIELDS.includes(field));

        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        
        let inputHtml = '';
        if (options) {
            const optionsHtml = options.map(opt => 
                `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`
            ).join('');
            inputHtml = `<select name="${field}" ${!isEditable ? 'disabled' : ''}>
                <option value="">-- เลือก --</option>${optionsHtml}
            </select>`;
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

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[m]);
}

// ✅ FIXED: ปรับปรุง async loop และให้ refresh UI แม้ history ล้มเหลว
async function handleSaveEditForm(event) {
    event.preventDefault();
    if (!state.editingCustomerId) return;
    
    ui.showLoading(true);
    const form = event.target;
    const formData = new FormData(form);
    const updatedData = {};
    const originalCustomer = state.customers.find(c => c.id == state.editingCustomerId);
    
    for (const [key, value] of formData.entries()) {
        updatedData[key] = value;
    }

    try {
        // อัปเดตข้อมูลลูกค้าก่อน
        const updatedCustomer = await api.updateCustomer(state.editingCustomerId, updatedData);
        
        // อัปเดต state ทันที
        const index = state.customers.findIndex(c => c.id == state.editingCustomerId);
        if (index !== -1) {
            state.customers[index] = updatedCustomer;
        }
        
        // ✅ FIXED: บันทึก history แบบไม่บล็อก - ถ้า error ก็ไม่เป็นไร
        const historyPromises = [];
        for (const key in updatedData) {
            if (originalCustomer[key] !== updatedData[key]) {
                const fieldLabel = Object.keys(ui.FIELD_MAPPING).find(h => ui.FIELD_MAPPING[h] === key) || key;
                const logNote = `แก้ไข '${fieldLabel}' จาก '${originalCustomer[key] || ''}' เป็น '${updatedData[key]}'`;
                historyPromises.push(
                    api.addStatusUpdate(state.editingCustomerId, 'แก้ไขข้อมูล', logNote, state.currentUser.id)
                );
            }
        }
        
        // พยายามบันทึก history แต่ไม่ throw error ถ้าล้มเหลว
        if (historyPromises.length > 0) {
            try {
                await Promise.all(historyPromises);
            } catch (historyError) {
                console.warn('Could not save history:', historyError);
                // ไม่แสดง error ให้ user เพราะข้อมูลหลักบันทึกสำเร็จแล้ว
            }
        }
        
        // ✅ ปิด modal และ refresh UI เสมอ
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
        applyFiltersAndRender();
        showEditModal(newCustomer.id);
        ui.showStatus('เพิ่มลูกค้าใหม่สำเร็จ กรุณากรอกข้อมูล', false);
    } catch (error) {
        ui.showStatus(error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

// ================================================================================
// ✅ FIXED: เพิ่มฟังก์ชันที่หายไป - INLINE CELL EDITING
// ================================================================================

async function handleCellDoubleClick(event) {
    const cell = event.target.closest('td');
    
    // ไม่ให้แก้ไข cell พิเศษ
    if (!cell || cell.classList.contains('row-number') || cell.classList.contains('actions-cell')) {
        return;
    }

    // ตรวจสอบว่า cell นี้แก้ไขได้หรือไม่ (สำหรับ Sales)
    if (cell.classList.contains('non-editable')) {
        ui.showStatus('คุณไม่มีสิทธิ์แก้ไขฟิลด์นี้', true);
        return;
    }

    // ถ้ามี cell อื่นกำลังแก้ไขอยู่ ให้ยกเลิกก่อน
    if (state.editingCell && state.editingCell !== cell) {
        const oldValue = state.editingCell.dataset.originalValue;
        ui.revertCellToText(state.editingCell, oldValue);
        state.editingCell = null;
    }

    const field = cell.dataset.field;
    const currentValue = cell.textContent.trim();
    
    // เก็บค่าเดิมไว้สำหรับการยกเลิก
    cell.dataset.originalValue = currentValue;
    state.editingCell = cell;

    // สร้าง editor ตามประเภทของ field
    const options = (field === 'sales') ? state.salesList : DROPDOWN_OPTIONS[field];
    ui.createCellEditor(cell, currentValue, options);

    const editor = cell.querySelector('input, select');
    if (!editor) return;

    // จัดการเมื่อกด Enter หรือ blur
    const handleSave = () => {
        if (state.editingCell === cell) {
            handleCellEditSave(cell, currentValue);
        }
    };

    const handleCancel = () => {
        if (state.editingCell === cell) {
            ui.revertCellToText(cell, currentValue);
            state.editingCell = null;
        }
    };

    editor.addEventListener('blur', handleSave);
    editor.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    });
}

async function handleCellEditSave(cell, originalValue) {
    if (!state.editingCell) return;
    
    const editor = cell.querySelector('input, select');
    const newValue = editor.value.trim();
    state.editingCell = null;

    if (newValue === originalValue) {
        ui.revertCellToText(cell, originalValue);
        return;
    }

    const rowId = cell.parentElement.dataset.id;
    const field = cell.dataset.field;

    ui.showLoading(true);
    try {
        await api.updateCustomerCell(rowId, field, newValue);
        
        const fieldLabel = Object.keys(ui.FIELD_MAPPING).find(key => ui.FIELD_MAPPING[key] === field) || field;
        const logNote = `แก้ไขข้อมูล '${fieldLabel}' จาก '${originalValue}' เป็น '${newValue}'`;
        await api.addStatusUpdate(rowId, 'แก้ไขข้อมูล', logNote, state.currentUser.id);

        const customerIndex = state.customers.findIndex(c => c.id == rowId);
        if (customerIndex !== -1) {
            state.customers[customerIndex][field] = newValue;
        }
        
        ui.revertCellToText(cell, newValue);
        ui.showStatus('แก้ไขข้อมูลสำเร็จ', false);
    } catch (error) {
        ui.showStatus(error.message, true);
        ui.revertCellToText(cell, originalValue);
    } finally {
        ui.showLoading(false);
    }
}

// ================================================================================
// TABLE INTERACTIONS
// ================================================================================

function handleTableClick(event) {
    const target = event.target;
    const action = target.dataset.action;
    if (!action) return;

    const id = target.closest('[data-id]')?.dataset.id;
    if (!id) return;

    const customer = state.customers.find(c => c.id == id);
    const name = customer ? (customer.name || customer.lead_code || customer.phone || 'N/A') : 'N/A';
    
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
    
    if (!newStatus) {
        return ui.showStatus('กรุณาเลือกสถานะ', true);
    }

    ui.showLoading(true);
    try {
        await api.addStatusUpdate(customerId, newStatus, notes, state.currentUser.id);
        const updatedCustomer = await api.updateCustomerCell(customerId, 'last_status', newStatus);
        
        const index = state.customers.findIndex(c => c.id == updatedCustomer.id);
        if (index !== -1) {
            state.customers[index].last_status = newStatus;
        }
        
        applyFiltersAndRender();
        ui.hideModal('statusUpdateModal');
        ui.showStatus('อัปเดตสถานะสำเร็จ', false);
    } catch (error) {
        ui.showStatus(error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

// ================================================================================
// CONTEXT MENU
// ================================================================================

function handleContextMenu(event) {
    const row = event.target.closest('tr');
    if (!row || !row.dataset.id) return;

    if (state.currentUser.role === 'sales') {
        ui.showStatus('คุณไม่มีสิทธิ์ใช้งานเมนูนี้', true);
        event.preventDefault();
        return;
    }
    
    event.preventDefault();
    state.contextMenuRowId = row.dataset.id;
    ui.showContextMenu(event);
}

async function handleContextMenuItemClick(event) {
    const action = event.target.dataset.action;
    if (!action || !state.contextMenuRowId) return;
    ui.hideContextMenu();

    if (action === 'delete') {
        if (state.currentUser.role === 'sales') {
            ui.showStatus('คุณไม่มีสิทธิ์ลบข้อมูล', true);
            return;
        }
        
        const customerToDelete = state.customers.find(c => c.id == state.contextMenuRowId);
        if (confirm(`คุณต้องการลบลูกค้า "${customerToDelete?.name || 'รายนี้'}" ใช่หรือไม่?`)) {
            ui.showLoading(true);
            try {
                await api.deleteCustomer(state.contextMenuRowId);
                state.customers = state.customers.filter(c => c.id != state.contextMenuRowId);
                applyFiltersAndRender();
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
    const tableBody = document.getElementById('tableBody');
    const contextMenu = document.getElementById('contextMenu');
    
    // Header buttons
    document.getElementById('logoutButton')?.addEventListener('click', handleLogout);
    document.getElementById('addUserButton')?.addEventListener('click', handleAddCustomer);
    document.getElementById('submitStatusUpdateBtn')?.addEventListener('click', handleSubmitStatusUpdate);
    
    // Edit modal
    document.getElementById('editCustomerForm')?.addEventListener('submit', handleSaveEditForm);
    document.getElementById('closeEditModalBtn')?.addEventListener('click', hideEditModal);
    document.getElementById('cancelEditBtn')?.addEventListener('click', hideEditModal);

    // Table interactions
    tableBody?.addEventListener('click', handleTableClick);
    tableBody?.addEventListener('dblclick', handleCellDoubleClick);
    tableBody?.addEventListener('contextmenu', handleContextMenu);
    
    // Context menu
    contextMenu?.addEventListener('click', handleContextMenuItemClick);
    window.addEventListener('click', (event) => {
        if (contextMenu && !contextMenu.contains(event.target)) {
            ui.hideContextMenu();
        }
    });
    
    // Modal close buttons
    document.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.addEventListener('click', () => ui.hideModal(btn.dataset.modalClose));
    });
    
    // Search input
    document.getElementById('searchInput')?.addEventListener('input', e => {
        state.activeFilters.search = e.target.value;
        applyFiltersAndRender();
    });
}

// ================================================================================
// APPLICATION START
// ================================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});
