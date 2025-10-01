// ================================================================================
// BEAUTY CLINIC CRM - MAIN ORCHESTRATOR (FINAL + EDIT/DELETE FEATURES)
// ================================================================================

const state = {
    currentUser: null,
    customers: [],
    salesList: [],
    activeFilters: { search: '', status: '', sales: '' },
    // 🟢 ADDED: State สำหรับจัดการการแก้ไขและเมนูคลิกขวา
    editingCell: null,
    contextMenuRowId: null
};

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

function applyFiltersAndRender() {
    const { search, status, sales } = state.activeFilters;
    const lowerCaseSearch = search.toLowerCase();
    const filteredCustomers = state.customers.filter(customer => {
        const matchesSearch = !search || Object.values(customer).some(val => String(val).toLowerCase().includes(lowerCaseSearch));
        const matchesStatus = !status || customer.status_1 === status;
        const matchesSales = !sales || customer.sales === sales;
        return matchesSearch && matchesStatus && matchesSales;
    });
    ui.renderTable(filteredCustomers);
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
        ui.showStatus('เพิ่มลูกค้าใหม่สำเร็จ', false);
    } catch (error) {
        ui.showStatus(error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

// 🟢 ADDED: ฟังก์ชันจัดการการแก้ไขข้อมูลในเซลล์ (ดับเบิลคลิก)
function handleCellDoubleClick(event) {
    const cell = event.target.closest('td');
    if (!cell || cell.classList.contains('actions-cell') || cell.classList.contains('row-number') || state.editingCell) {
        return;
    }
    state.editingCell = cell;
    const originalValue = cell.textContent;
    ui.createCellEditor(cell, originalValue);

    const input = cell.querySelector('input');
    input.addEventListener('blur', () => handleCellEditSave(cell, originalValue));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') ui.revertCellToText(cell, originalValue);
    });
}

async function handleCellEditSave(cell, originalValue) {
    if (!state.editingCell) return;
    state.editingCell = null;
    const input = cell.querySelector('input');
    const newValue = input.value.trim();

    if (newValue === originalValue) {
        ui.revertCellToText(cell, originalValue);
        return;
    }

    const rowId = cell.parentElement.dataset.id;
    const field = cell.dataset.field;

    ui.showLoading(true);
    try {
        await api.updateCustomerCell(rowId, field, newValue);
        const customerIndex = state.customers.findIndex(c => c.id == rowId);
        if (customerIndex !== -1) {
            state.customers[customerIndex][field] = newValue;
        }
        ui.revertCellToText(cell, newValue);
        ui.showStatus('แก้ไขข้อมูลสำเร็จ', false);
    } catch (error) {
        ui.showStatus(error.message, true);
        ui.revertCellToText(cell, originalValue); // คืนค่าเดิมถ้า error
    } finally {
        ui.showLoading(false);
    }
}

// 🟢 ADDED: ฟังก์ชันจัดการเมนูคลิกขวา
function handleContextMenu(event) {
    const row = event.target.closest('tr');
    if (!row || !row.dataset.id) return;
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
        const confirmMessage = `คุณต้องการลบลูกค้า "${customerToDelete?.name || 'รายนี้'}" ใช่หรือไม่?`;

        if (confirm(confirmMessage)) {
            ui.showLoading(true);
            try {
                await api.deleteCustomer(state.contextMenuRowId);
                state.customers = state.customers.filter(c => c.id != state.contextMenuRowId);
                ui.removeRow(state.contextMenuRowId);
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

// --- SETUP & OTHER HANDLERS ---

function handleTableClick(event) {
    const action = event.target.dataset.action;
    if (!action) return;
    const id = event.target.dataset.id;
    const name = event.target.dataset.name;
    if (action === 'update-status') ui.showModal('statusUpdateModal', { customerId: id, customerName: name });
    if (action === 'view-history') handleViewHistory(id, name);
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
    
    // Event หลักๆ
    document.getElementById('logoutButton')?.addEventListener('click', handleLogout);
    document.getElementById('addUserButton')?.addEventListener('click', handleAddCustomer);
    document.getElementById('submitStatusUpdateBtn')?.addEventListener('click', handleSubmitStatusUpdate);
    
    // 🟢 ADDED: Event Listeners สำหรับการแก้ไขและลบ
    tableBody?.addEventListener('dblclick', handleCellDoubleClick);
    tableBody?.addEventListener('contextmenu', handleContextMenu);
    contextMenu?.addEventListener('click', handleContextMenuItemClick);
    window.addEventListener('click', ui.hideContextMenu); // ซ่อนเมนูเมื่อคลิกที่อื่น

    // Event ทั่วไป
    tableBody?.addEventListener('click', handleTableClick);
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
