// ================================================================================
// Main Orchestrator - Handles UI logic and state management.
// (FINAL & COMPLETE VERSION)
// ================================================================================

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    ui.showStatus('เกิดข้อผิดพลาดที่ไม่คาดคิดในระบบ', true);
});

const state = {
    currentUser: null,
    salesList: [],
    activeFilters: { search: '', status: '', sales: '' },
    dateFilter: { startDate: null, endDate: null, preset: 'all' },
    pagination: { currentPage: 1, pageSize: 50, totalRecords: 0 },
    sort: { column: 'date', direction: 'desc' },
    editingCustomerId: null,
    contextMenuRowId: null,
};

const DROPDOWN_OPTIONS = {
    channel: ["-เพื่อนแนะนำ/", "-Walk-In/", "-PHONE-IN/", "-Line@/", "-Fbc By หมอธีร์ (ปลูกผม)", "-Fbc By หมอธีร์ (หัตถการอื่น)", "-FBC HAIR CLINIC", "-Fbc ตาสองชั้น ยกคิ้ว เสริมจิ้มูก", "-Fbc ปรับรูปหน้า Botox Filler HIFU", "-เว็บไซต์", "-AGENCY", "-IG", "-Tiktok "],
    procedure: ["ตา Dr.T", "ตาทีมแพทย์", "ปลูกผม", "ปลูกหนวด/เครา", "ปลูกคิ้ว", "FaceLift", "จมูก/ปาก/คาง", "Thermage", "Ultraformer", "Filler", "BOTOX", "Laser กำจัดขน", "SKIN อื่น ๆ", "ตา Dr.T/ปลูกผม", "ตา/SKIN", "ผม/SKIN", "ตา/อื่นๆ", "ผม/อื่นๆ", "ตาทีมแพทย์/ปลูกผม"],
    confirm_y: ["Y", "N"],
    status_1: ["status 1", "status 2", "status 3", "status 4", "ไม่สนใจ", "ปิดการขาย", "ตามต่อ"],
    cs_confirm: ["CSX", "CSY"],
    last_status: ["100%", "75%", "50%", "25%", "0%", "ONLINE", "เคส OFF"]
};

const SALES_EDITABLE_FIELDS = [
    'update_access', 'last_status', 'status_1', 'reason',
    'etc', 'hn_customer', 'old_appointment', 'dr', 'closed_amount', 'appointment_date'
];

function normalizeDateStringToYYYYMMDD(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            let year = parseInt(parts[2], 10);
            if (year > 2500) year -= 543; // Convert from Buddhist year
            return `${year}-${month}-${day}`;
        }
    }
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().split('T')[0];
    } catch (e) {
        return null;
    }
}

async function initializeApp() {
    ui.showLoading(true);
    try {
        if (!window.supabaseClient || !window.api || !window.ui) throw new Error('Dependencies not loaded');
        ui.renderTableHeaders();
        const session = await api.getSession();
        if (!session) { window.location.replace('login.html'); return; }
        
        let userProfile = await api.getUserProfile(session.user.id);
        if (!userProfile) userProfile = await api.createDefaultUserProfile(session.user);
        
        // Final check for active status during initialization
        if (userProfile && userProfile.is_active === false) {
             alert('บัญชีของคุณถูกปิดการใช้งานแล้ว กรุณาติดต่อผู้ดูแล');
             await api.signOut();
             window.location.replace('login.html');
             return;
        }

        state.currentUser = { id: session.user.id, ...userProfile };
        window.state = state;
        ui.updateUIAfterLogin(state.currentUser);
        
        const [salesList, statuses] = await Promise.all([
            api.fetchSalesList(),
            api.fetchAllUniqueStatuses()
        ]);
        
        state.salesList = salesList || [];
        ui.populateFilterDropdown('salesFilter', state.salesList);
        ui.populateFilterDropdown('statusFilter', statuses);
        
        await updateVisibleData();
        ui.showStatus('โหลดข้อมูลสำเร็จ', false);
    } catch (error) {
        console.error('Initialization failed:', error);
        ui.showStatus('เกิดข้อผิดพลาด: ' + error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

async function updateVisibleData() {
    ui.showLoading(true);
    try {
        const params = {
            filters: state.activeFilters,
            dateRange: state.dateFilter,
            sort: state.sort,
            pagination: state.pagination
        };
        const { data, count } = await api.fetchPaginatedCustomers(params);
        
        (data || []).forEach(c => {
            c.date = normalizeDateStringToYYYYMMDD(c.date);
            c.old_appointment = normalizeDateStringToYYYYMMDD(c.old_appointment);
            c.appointment_date = normalizeDateStringToYYYYMMDD(c.appointment_date);
        });

        state.pagination.totalRecords = count;
        const totalPages = Math.ceil(count / state.pagination.pageSize);
        
        ui.renderTable(data, state.pagination.currentPage, state.pagination.pageSize);
        ui.renderPaginationControls(totalPages, state.pagination.currentPage, count, state.pagination.pageSize);
        ui.updateSortIndicator(state.sort.column, state.sort.direction);
        updateDashboardStats();
    } catch (error) {
        console.error('Failed to update data:', error);
        ui.showStatus('ไม่สามารถโหลดข้อมูลได้: ' + error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

async function updateDashboardStats() {
    document.getElementById('totalCustomers').textContent = state.pagination.totalRecords;
    const stats = await api.getDashboardStats(state.dateFilter);
    document.getElementById('todayCustomers').textContent = stats.todayCustomers || 0;
    document.getElementById('pendingCustomers').textContent = stats.pendingCustomers || 0;
    document.getElementById('closedDeals').textContent = stats.closedDeals || 0;
}

function setDateFilterPreset(preset) {
    const today = new Date();
    let startDate, endDate;
    switch (preset) {
        case '7d':
            endDate = new Date(today);
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 6);
            break;
        case '30d':
            endDate = new Date(today);
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 29);
            break;
        case 'today':
            startDate = new Date(today);
            endDate = new Date(today);
            break;
        case 'all':
        default:
            startDate = null;
            endDate = null;
            break;
    }
    const startDateString = startDate ? startDate.toISOString().split('T')[0] : '';
    const endDateString = endDate ? endDate.toISOString().split('T')[0] : '';
    state.dateFilter = { startDate: startDateString, endDate: endDateString, preset };
    document.getElementById('startDateFilter').value = startDateString;
    document.getElementById('endDateFilter').value = endDateString;
    document.querySelectorAll('.btn-date-filter').forEach(btn => btn.classList.toggle('active', btn.dataset.preset === preset));
    if (preset === 'all') document.getElementById('clearDateFilter').classList.add('active');
    state.pagination.currentPage = 1;
    updateVisibleData();
}

function debounce(func, delay = 300) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => { func.apply(this, args); }, delay);
    };
}

// --- CSV Import/Export ---

function handleImportClick() {
    ui.showModal('importModal');
}

function robustCSVSplit(row) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (const char of row) {
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

async function handleProcessCSV() {
    const csvFileInput = document.getElementById('csvFile');
    const importStatus = document.getElementById('importStatus');
    if (!csvFileInput.files || csvFileInput.files.length === 0) {
        importStatus.textContent = 'กรุณาเลือกไฟล์ CSV'; return;
    }
    const file = csvFileInput.files[0];
    importStatus.textContent = 'กำลังประมวลผลไฟล์...';
    ui.showLoading(true);
    try {
        const fileContent = await file.text();
        const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) throw new Error('ไฟล์ CSV ต้องมีอย่างน้อย Header และข้อมูล 1 แถว');

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const requiredHeaders = ['name', 'phone', 'channel', 'sales'];
        for (const required of requiredHeaders) {
            if (!headers.includes(required)) throw new Error(`ไฟล์ CSV ขาด Header ที่จำเป็น: ${required}`);
        }
        const customersToInsert = [];
        for (let i = 1; i < lines.length; i++) {
            const values = robustCSVSplit(lines[i]).map(v => v.replace(/"/g, ''));
            if (values.length !== headers.length) continue;
            const customer = {};
            headers.forEach((header, index) => {
                if (['date', 'old_appointment', 'appointment_date'].includes(header)) {
                    customer[header] = normalizeDateStringToYYYYMMDD(values[index]) || new Date().toISOString().split('T')[0];
                } else {
                    customer[header] = values[index] || '';
                }
            });
            customer.date = customer.date || new Date().toISOString().split('T')[0];
            customersToInsert.push(customer);
        }
        if (customersToInsert.length === 0) throw new Error('ไม่พบข้อมูลลูกค้าที่สามารถนำเข้าได้');
        
        importStatus.textContent = `กำลังนำเข้าข้อมูล ${customersToInsert.length} รายการ...`;
        await api.bulkInsertCustomers(customersToInsert);
        
        ui.showStatus('นำเข้าข้อมูลสำเร็จ!', false);
        ui.hideModal('importModal');
        initializeApp();
    } catch (error) {
        console.error('CSV Import Error:', error);
        ui.showStatus(`นำเข้าไม่สำเร็จ: ${error.message}`, true);
        importStatus.textContent = `เกิดข้อผิดพลาด: ${error.message}`;
    } finally {
        ui.showLoading(false);
    }
}

async function handleExportToCSV() {
    ui.showLoading(true);
    ui.showStatus('กำลังเตรียมข้อมูลเพื่อ Export...', false);
    try {
        const customers = await api.fetchAllCustomersForExport();
        const headers = Object.keys(ui.FIELD_MAPPING).filter(h => ui.FIELD_MAPPING[h].field);
        const fields = headers.map(h => ui.FIELD_MAPPING[h].field);

        const escapeCSV = (str) => {
            if (str === null || str === undefined) return '';
            let result = String(str);
            if (result.includes(',') || result.includes('"') || result.includes('\n')) {
                result = '"' + result.replace(/"/g, '""') + '"';
            }
            return result;
        };

        let csvContent = "\uFEFF"; // UTF-8 BOM for Excel
        csvContent += headers.join(',') + '\r\n';
        customers.forEach(customer => {
            const row = fields.map(field => escapeCSV(customer[field]));
            csvContent += row.join(',') + '\r\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        const today = new Date().toISOString().slice(0, 10);
        link.setAttribute("href", url);
        link.setAttribute("download", `crm-export-${today}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        ui.showStatus('Export ข้อมูลสำเร็จ', false);
    } catch (error) {
        console.error('Export failed:', error);
        ui.showStatus('Export ข้อมูลไม่สำเร็จ: ' + error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

// --- Event Handlers & Setup ---
// ... (All event handlers like handleSort, handleSaveEditForm, etc. remain here)
// This section is long, but the logic inside is mostly correct and just needs to be present.
// I will ensure the functions are here.

function setupEventListeners() {
    document.getElementById('logoutButton')?.addEventListener('click', handleLogout);
    document.getElementById('addUserButton')?.addEventListener('click', handleAddCustomer);
    document.getElementById('submitStatusUpdateBtn')?.addEventListener('click', handleSubmitStatusUpdate);
    document.getElementById('editCustomerForm')?.addEventListener('submit', handleSaveEditForm);
    document.getElementById('closeEditModalBtn')?.addEventListener('click', hideEditModal);
    document.getElementById('cancelEditBtn')?.addEventListener('click', hideEditModal);

    document.getElementById('importButton')?.addEventListener('click', handleImportClick);
    document.getElementById('importBtn')?.addEventListener('click', handleProcessCSV);
    document.getElementById('exportButton')?.addEventListener('click', handleExportToCSV);
    
    document.getElementById('refreshButton')?.addEventListener('click', () => {
        document.getElementById('searchInput').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('salesFilter').value = '';
        state.activeFilters = { search: '', status: '', sales: '' };
        setDateFilterPreset('all');
    });
    
    document.getElementById('searchInput')?.addEventListener('input', debounce(e => {
        state.activeFilters.search = e.target.value;
        state.pagination.currentPage = 1;
        updateVisibleData();
    }, 500));
    document.getElementById('statusFilter')?.addEventListener('change', e => { state.activeFilters.status = e.target.value; state.pagination.currentPage = 1; updateVisibleData(); });
    document.getElementById('salesFilter')?.addEventListener('change', e => { state.activeFilters.sales = e.target.value; state.pagination.currentPage = 1; updateVisibleData(); });
    document.querySelectorAll('.btn-date-filter[data-preset]').forEach(button => { button.addEventListener('click', () => setDateFilterPreset(button.dataset.preset)); });
    document.getElementById('clearDateFilter')?.addEventListener('click', () => setDateFilterPreset('all'));
    const debouncedDateChange = debounce(handleCustomDateChange, 500);
    document.getElementById('startDateFilter')?.addEventListener('change', debouncedDateChange);
    document.getElementById('endDateFilter')?.addEventListener('change', debouncedDateChange);
    
    document.getElementById('paginationContainer')?.addEventListener('click', event => {
        const button = event.target.closest('button[data-page]');
        if (button) {
            const page = button.dataset.page;
            if (page === 'prev' && state.pagination.currentPage > 1) state.pagination.currentPage--;
            else if (page === 'next' && state.pagination.currentPage < Math.ceil(state.pagination.totalRecords / state.pagination.pageSize)) state.pagination.currentPage++;
            else if (!isNaN(page)) state.pagination.currentPage = parseInt(page);
            updateVisibleData();
        }
    });
    
    document.getElementById('paginationContainer')?.addEventListener('change', event => {
        if (event.target.id === 'pageSize') {
            state.pagination.pageSize = parseInt(event.target.value);
            state.pagination.currentPage = 1;
            updateVisibleData();
        }
    });

    const tableBody = document.getElementById('tableBody');
    tableBody?.addEventListener('click', handleTableClick);
    tableBody?.addEventListener('contextmenu', handleContextMenu);
    
    const contextMenu = document.getElementById('contextMenu');
    contextMenu?.addEventListener('click', handleContextMenuItemClick);
    window.addEventListener('click', (event) => { if (contextMenu && !contextMenu.contains(event.target)) { ui.hideContextMenu(); } });
    
    document.querySelectorAll('[data-modal-close]').forEach(btn => { btn.addEventListener('click', () => ui.hideModal(btn.dataset.modalClose)); });
    
    document.querySelector('#excelTable thead')?.addEventListener('click', (event) => {
        const headerCell = event.target.closest('th[data-sortable]');
        if (headerCell) handleSort(headerCell.dataset.sortable);
    });
}

function handleSort(column) {
    if (state.sort.column === column) {
        state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        state.sort.column = column;
        state.sort.direction = 'desc'; // Default to desc for new columns
    }
    updateVisibleData();
}

function handleCustomDateChange() {
    let start = document.getElementById('startDateFilter').value;
    let end = document.getElementById('endDateFilter').value;
    if (start && end && start <= end) {
        state.dateFilter = { startDate: start, endDate: end, preset: 'custom' };
        state.pagination.currentPage = 1;
        document.querySelectorAll('.btn-date-filter.active').forEach(btn => btn.classList.remove('active'));
        updateVisibleData();
    }
}

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
        await api.addStatusUpdate(newCustomer.id, 'สร้างลูกค้าใหม่', 'ระบบสร้าง Lead อัตโนมัติ', state.currentUser.id);
        await updateVisibleData();
        showEditModal(newCustomer.id);
        ui.showStatus('เพิ่มลูกค้าใหม่สำเร็จ กรุณากรอกข้อมูล', false);
    } catch (error) {
        ui.showStatus(error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

async function handleTableClick(event) {
    const target = event.target;
    const action = target.dataset.action;
    if (!action || target.disabled) return;
    const id = target.closest('[data-id]')?.dataset.id;
    if (!id) return;

    switch (action) {
        case 'edit-customer': showEditModal(id); break;
        case 'update-status': showUpdateStatusModal(id); break;
        case 'view-history': handleViewHistory(id, target.dataset.name); break;
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
    if (!newStatus) { ui.showStatus('กรุณาเลือกสถานะ', true); return; }
    
    ui.showLoading(true);
    try {
        await api.addStatusUpdate(customerId, newStatus, notes, state.currentUser.id);
        await api.updateCustomer(customerId, { status_1: newStatus, reason: notes });
        await updateVisibleData();
        ui.hideModal('statusUpdateModal');
        ui.showStatus('อัปเดตสถานะสำเร็จ', false);
    } catch (error) {
        ui.showStatus("เกิดข้อผิดพลาดในการอัปเดต: " + error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

function handleContextMenu(event) {
    const row = event.target.closest('tr[data-id]');
    if (!row) return;
    const userRole = (state.currentUser?.role || 'sales').toLowerCase();
    if (userRole === 'sales') return; // Sales cannot use context menu
    
    event.preventDefault();
    state.contextMenuRowId = row.dataset.id;
    ui.showContextMenu(event);
}

async function handleContextMenuItemClick(event) {
    const action = event.target.dataset.action;
    const customerId = state.contextMenuRowId;
    ui.hideContextMenu();
    if (!action || !customerId) return;
    
    if (action === 'delete') {
        if (confirm(`คุณต้องการลบลูกค้ารายนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
            ui.showLoading(true);
            try {
                await api.deleteCustomer(customerId);
                await updateVisibleData();
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

function getAllowedNextStatuses(currentStatus) {
    const specialStatuses = ["ไม่สนใจ", "ปิดการขาย", "ตามต่อ"];
    if (!currentStatus || currentStatus.trim() === '') return ["status 1", ...specialStatuses];
    switch (currentStatus) {
        case "status 1": return ["status 2", ...specialStatuses];
        case "status 2": return ["status 3", ...specialStatuses];
        case "status 3": return ["status 4", ...specialStatuses];
        case "status 4": return [...specialStatuses];
        default: return [...specialStatuses];
    }
}

async function showUpdateStatusModal(customerId) {
    const customer = await api.fetchCustomerById(customerId);
    if (!customer) { ui.showStatus('ไม่พบข้อมูลลูกค้า', true); return; }
    
    const userRole = (state.currentUser?.role || 'sales').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'administrator';
    const allowedStatuses = isAdmin ? DROPDOWN_OPTIONS.status_1 : getAllowedNextStatuses(customer.status_1);
    
    const select = document.getElementById('modalStatusSelect');
    select.innerHTML = '<option value="">-- เลือกสถานะ --</option>';
    allowedStatuses.forEach(opt => {
        const optionEl = document.createElement('option');
        optionEl.value = opt;
        optionEl.textContent = opt;
        select.appendChild(optionEl);
    });
    
    ui.showModal('statusUpdateModal', { customerId: customer.id, customerName: customer.name || customer.lead_code });
}

async function showEditModal(customerId) {
    const customer = await api.fetchCustomerById(customerId);
    if (!customer) { ui.showStatus('ไม่พบข้อมูลลูกค้า', true); return; }
    state.editingCustomerId = customerId;
    ui.buildEditForm(customer, state.currentUser, SALES_EDITABLE_FIELDS, state.salesList, DROPDOWN_OPTIONS);
    ui.showModal('editCustomerModal');
}

function hideEditModal() {
    state.editingCustomerId = null;
    ui.hideModal('editCustomerModal');
}

async function handleSaveEditForm(event) {
    event.preventDefault();
    if (!state.editingCustomerId) return;
    
    const formData = new FormData(event.target);
    const updatedData = Object.fromEntries(formData.entries());

    ui.showLoading(true);
    try {
        await api.updateCustomer(state.editingCustomerId, updatedData);
        hideEditModal();
        await updateVisibleData();
        ui.showStatus('บันทึกข้อมูลสำเร็จ', false);
    } catch (error) {
        console.error('Save failed:', error);
        ui.showStatus('บันทึกข้อมูลไม่สำเร็จ: ' + error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});
