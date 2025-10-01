// ================================================================================
// BEAUTY CLINIC CRM - MAIN ORCHESTRATOR (FINAL + DYNAMIC DROPDOWNS)
// ================================================================================

const state = {
    currentUser: null,
    customers: [],
    salesList: [],
    activeFilters: { search: '', status: '', sales: '' },
    editingCell: null,
    contextMenuRowId: null
};

// 🟡 MODIFIED: เพิ่มและอัปเดตรายการ last_status
const DROPDOWN_OPTIONS = {
    channel: [
        "-เพื่อนแนะนำ/",
        "-Walk-In/",
        "-PHONE-IN/",
        "-Line@/",
        "-Fbc By หมอธีร์ (ปลูกผม)",
        "-Fbc By หมอธีร์ (หัตถการอื่น)",
        "-FBC HAIR CLINIC",
        "-Fbc ตาสองชั้น ยกคิ้ว เสริมจมูก",
        "-Fbc ปรับรูปหน้า Botox Filler HIFU",
        "-เว็บไซต์",
        "-AGENCY",
        "-IG",
        "-Tiktok "
    ],
    procedure: [
        "ตา Dr.T",
        "ตาทีมแพทย์",
        "ปลูกผม",
        "ปลูกหนวด/เครา",
        "ปลูกคิ้ว",
        "FaceLift",
        "จมูก/ปาก/คาง",
        "Thermage",
        "Ultraformer",
        "Filler",
        "BOTOX",
        "Laser กำจัดขน",
        "SKIN อื่น ๆ",
        "ตา Dr.T/ปลูกผม",
        "ตา/SKIN",
        "ผม/SKIN",
        "ตา/อื่นๆ",
        "ผม/อื่นๆ",
        "ตาทีมแพทย์/ปลูกผม"
    ],
    confirm_y: ["Y", "N"],
    transfer_100: ["Y", "N"],
    status_1: [
        "status 1",
        "status 2",
        "status 3",
        "status 4",
        "ไม่สนใจ",
        "ปิดการขาย",
        "ตามต่อ"
    ],
    cs_confirm: ["CSX", "CSY"],
    last_status: [
        "100%",
        "75%",
        "50%",
        "25%",
        "0%",
        "ONLINE",
        "เคส OFF"
    ]
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
        state.salesList = salesList || []; // ข้อมูล sales ทั้งหมดจะถูกเก็บไว้ที่นี่
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

function handleCellDoubleClick(event) {
    const cell = event.target.closest('td');
    if (!cell || cell.classList.contains('actions-cell') || cell.classList.contains('row-number') || state.editingCell) {
        return;
    }
    state.editingCell = cell;
    const originalValue = cell.textContent;
    const field = cell.dataset.field;

    let options;
    if (field === 'sales') {
        options = state.salesList;
    } else {
        options = DROPDOWN_OPTIONS[field];
    }

    ui.createCellEditor(cell, originalValue, options);

    const editor = cell.querySelector('input, select');
    editor.addEventListener('blur', () => handleCellEditSave(cell, originalValue));
    editor.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') editor.blur();
        if (e.key === 'Escape') {
             state.editingCell = null;
             ui.revertCellToText(cell, originalValue);
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

function handleContextMenu(event) {
    const row = event.target.closest('tr');
    if (!row || !row.dataset.id) return;
    event.preventDefault();
    state.contextMenuRowId = row.dataset.id;
    ui.showContextMenu(event);
