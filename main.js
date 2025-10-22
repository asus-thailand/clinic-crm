// ================================================================================
// BEAUTY CLINIC CRM - MAIN ORCHESTRATOR (FINAL VERSION with CSV Import & Updated Dropdowns)
// ================================================================================

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    ui.showStatus('เกิดข้อผิดพลาดที่ไม่คาดคิดในระบบ', true);
});

const state = {
    currentUser: null,
    customers: [],
    filteredCustomers: [],
    salesList: [],
    activeFilters: { search: '', status: '', sales: '' },
    dateFilter: { startDate: null, endDate: null, preset: 'all' },
    pagination: { currentPage: 1, pageSize: 50 },
    sort: { column: 'date', direction: 'desc' },
    editingCustomerId: null
};

// [FIXED] ลบเครื่องหมาย / (slash) ที่ต่อท้ายตัวเลือก channel ทั้งหมด
const DROPDOWN_OPTIONS = {
    channel: [
        "เพื่อนแนะนำ", // [FIXED] ลบ / ออก
        "Walk-In",     // [FIXED] ลบ / ออก
        "PHONE-IN",    // [FIXED] ลบ / ออก
        "Line@",       // [FIXED] ลบ / ออก
        "Fbc By หมอธีร์ (ปลูกผม)", // [FIXED] ลบ / ออก
        "Fbc By หมอธีร์ (หัตถการอื่น)", // [FIXED] ลบ / ออก
        "FBC HAIR CLINIC", // [FIXED] ลบ / ออก
        "Fbc ตาสองชั้น ยกคิ้ว เสริมจมูก", // [FIXED] ลบ / ออก
        "Fbc ปรับรูปหน้า Botox Filler HIFU", // [FIXED] ลบ / ออก
        "เว็บไซต์",     // [FIXED] ลบ / ออก
        "AGENCY",       // [FIXED] ลบ / ออก
        "IG",           // [FIXED] ลบ / ออก
        "Tiktok ",      // (อันนี้มี space ต่อท้าย แต่ไม่มี /)
        "FMBC"
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
    // [FIXED] ลบบรรทัด 'transfer_100' ออกตามที่ร้องขอ
    // transfer_100: ["Y", "N"],
    status_1: ["status 1", "status 2", "status 3", "status 4", "ไม่สนใจ", "ปิดการขาย", "ตามต่อ"],
    cs_confirm: ["CSX", "CSY"],
    last_status: ["100%", "75%", "50%", "25%", "0%", "ONLINE", "เคส OFF"]
};

// [NEW] เพิ่ม closed_date ให้ Sales แก้ไขได้
const SALES_EDITABLE_FIELDS = [
    'update_access', 'last_status', 'status_1', 'reason',
    'etc', 'hn_customer', 'old_appointment', 'dr', 'closed_amount', 'appointment_date',
    'closed_date'
];


/**
 * [REFACTORED & FIXED] ฟังก์ชันแปลง Date String ที่ปลอดภัยต่อ Timezone
 * จะแปลงเฉพาะ format ที่รู้จัก (YYYY-MM-DD หรือ DD/MM/YYYY)
 * และไม่ใช้ new Date() ในการ parse เพื่อป้องกัน Timezone Bug
 * @param {string} dateStr The date string.
 * @returns {string|null} YYYY-MM-DD format or null if invalid.
 */
function normalizeDateStringToYYYYMMDD(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;

    dateStr = dateStr.trim();

    // 1. ถ้าเป็น YYYY-MM-DD อยู่แล้ว (เช่น '2024-10-21')
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {

        // [FIXED] Timezone Bug (Oct 2025)
        // ต้องเติม 'Z' เพื่อบังคับให้ new Date() สร้างเวลาเป็น UTC
        // มิฉะนั้น .toISOString() จะแปลงเวลาท้องถิ่น (เช่น GMT+7) กลับไป UTC ทำให้วันที่ผิดเพี้ยน 1 วัน
        const date = new Date(dateStr + 'T00:00:00Z');

        if (!isNaN(date.getTime()) && date.toISOString().startsWith(dateStr)) {
             return dateStr;
        }
    }

    // 2. ถ้าเป็น DD/MM/YYYY (เช่น '21/10/2567' หรือ '21/10/2024')
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            let year = parseInt(parts[2], 10);

            // แปลงจาก พ.ศ. ถ้าจำเป็น
            if (year > 2500) year -= 543;

            // [FIXED] ขยายช่วงปีให้กว้างขึ้น เพื่อป้องกัน Data Loss
            // จากเดิม 1900-2100 เปลี่ยนเป็น 1800-2200
            if (year < 1800 || year > 2200) return null;

            const formattedDate = `${year}-${month}-${day}`;
            // ตรวจสอบความถูกต้องอีกครั้ง (ต้องเติม Z ที่นี่ด้วย)
            const date = new Date(formattedDate + 'T00:00:00Z');
            if (!isNaN(date.getTime()) && date.toISOString().startsWith(formattedDate)) {
                 return formattedDate;
            }
        }
    }

    // 3. ถ้าเป็น format อื่นๆ ที่ new Date() อาจจะ parse ผิดพลาด
    // เราเลือกที่จะไม่รองรับ ดีกว่าการบันทึกข้อมูลผิด (Fail-fast)
    // การใช้ new Date(dateStr) ถูกลบออกไปเพื่อป้องกัน Timezone Bug

    console.warn(`Invalid or unhandled date format: ${dateStr}. Returning null.`);
    return null; // ถ้าไม่ตรง format ที่รองรับ ให้คืนค่า null
}


async function initializeApp() {
    console.log('Starting app initialization...');
    ui.showLoading(true);
    try {
        if (!window.supabaseClient || !window.api || !window.ui) throw new Error('Dependencies not loaded');
        ui.renderTableHeaders(); // เรียก render header ก่อน
        const session = await api.getSession();
        if (!session) { window.location.replace('login.html'); return; }
        let userProfile = await api.getUserProfile(session.user.id);
        if (!userProfile) userProfile = await api.createDefaultUserProfile(session.user);
        state.currentUser = { id: session.user.id, ...userProfile };
        window.state = state; // ทำให้ state ใช้ได้ทั่วโลก (จำเป็นสำหรับ ui.js)
        ui.updateUIAfterLogin(state.currentUser);
        const [customers, salesList] = await Promise.all([api.fetchAllCustomers(), api.fetchSalesList()]);
        (customers || []).forEach(c => {
            // Normalize วันที่ทุกช่อง รวมถึง closed_date
            c.date = normalizeDateStringToYYYYMMDD(c.date);
            c.old_appointment = normalizeDateStringToYYYYMMDD(c.old_appointment);
            c.appointment_date = normalizeDateStringToYYYYMMDD(c.appointment_date);
            c.closed_date = normalizeDateStringToYYYYMMDD(c.closed_date); // [NEW]
        });
        state.customers = customers || [];
        state.salesList = salesList || [];
        const statuses = [...new Set(state.customers.map(c => c.last_status).filter(Boolean))].sort();
        ui.populateFilterDropdown('salesFilter', state.salesList);
        ui.populateFilterDropdown('statusFilter', statuses);
        setDateFilterPreset('all'); // Set default date filter
        updateVisibleData();
        ui.showStatus('โหลดข้อมูลสำเร็จ', false);
    } catch (error) {
        console.error('Initialization failed:', error);
        // [FIXED] แก้ไข SyntaxError '...' ที่ผมเผลอใส่เข้าไป
        ui.showStatus('เกิดข้อผิดพลาด: ' + error.message, true);
        document.body.innerHTML = `<div style="color: red; padding: 20px;">Initialization failed: ${error.message}. Please check console or contact support.</div>`;
    } finally {
        ui.showLoading(false);
    }
}


function updateVisibleData() {
    const customers = Array.isArray(state.customers) ? state.customers : [];

    // --- Sorting ---
    const sortedCustomers = [...customers].sort((a, b) => {
        const { column, direction } = state.sort;
        const valA = a[column] || '';
        const valB = b[column] || '';

        // Sort by date columns correctly
        if (['date', 'closed_date'].includes(column)) { // [NEW] เพิ่ม closed_date
            const dateA = new Date(valA);
            const dateB = new Date(valB);
            // Handle invalid dates (put them at the end when descending, start when ascending)
            if (isNaN(dateA) && isNaN(dateB)) return 0;
            if (isNaN(dateA)) return direction === 'desc' ? 1 : -1;
            if (isNaN(dateB)) return direction === 'desc' ? -1 : 1;
            // Valid date comparison
            if (dateA < dateB) return direction === 'asc' ? -1 : 1;
            if (dateA > dateB) return direction === 'asc' ? 1 : -1;
            return 0;
        }

        // Default string/number sort
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    // --- Date Range Filtering ---
    let dateFiltered = sortedCustomers;
    if (state.dateFilter.startDate && state.dateFilter.endDate) {
        dateFiltered = sortedCustomers.filter(c => {
            if (!c.date) return false; // Filter based on 'date' column
            return c.date >= state.dateFilter.startDate && c.date <= state.dateFilter.endDate;
        });
    }

    // --- Text/Dropdown Filtering ---
    const { search, status, sales } = state.activeFilters;
    const lowerCaseSearch = search.toLowerCase();

    state.filteredCustomers = dateFiltered.filter(customer => {
        const searchableText = `${customer.name || ''} ${customer.phone || ''} ${customer.lead_code || ''}`.toLowerCase();
        const matchesSearch = !search || searchableText.includes(lowerCaseSearch);
        const matchesStatus = !status || (customer.last_status || '').trim() === status;
        const matchesSales = !sales || customer.sales === sales;

        return matchesSearch && matchesStatus && matchesSales;
    });

    // --- Pagination ---
    const { currentPage, pageSize } = state.pagination;
    const totalRecords = state.filteredCustomers.length;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedCustomers = state.filteredCustomers.slice(startIndex, endIndex);

    // --- Rendering ---
    ui.renderTable(paginatedCustomers, currentPage, pageSize);
    ui.renderPaginationControls(totalPages, currentPage, totalRecords, pageSize);
    ui.updateSortIndicator(state.sort.column, state.sort.direction);
    updateDashboardStats();
}


function updateDashboardStats() {
    const dataSet = state.filteredCustomers; // Use filtered data for stats
    document.getElementById('totalCustomers').textContent = dataSet.length;
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('todayCustomers').textContent = dataSet.filter(c => c.date === today).length;
    document.getElementById('pendingCustomers').textContent = dataSet.filter(c => c.status_1 === 'ตามต่อ').length;
    document.getElementById('closedDeals').textContent = dataSet.filter(c => c.status_1 === 'ปิดการขาย' && c.last_status === '100%' && c.closed_amount).length;
}

function setDateFilterPreset(preset) {
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date(today);

    switch(preset) {
        case '7d': startDate.setDate(today.getDate() - 6); break;
        case '30d': startDate.setDate(today.getDate() - 29); break;
        case 'today': startDate = new Date(today); break;
        case 'all': default: startDate = null; endDate = null; break;
    }

    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);

    const startDateString = startDate ? startDate.toISOString().split('T')[0] : '';
    const endDateString = endDate ? endDate.toISOString().split('T')[0] : '';

    state.dateFilter = { startDate: startDateString, endDate: endDateString, preset };

    const startInput = document.getElementById('startDateFilter');
    const endInput = document.getElementById('endDateFilter');
    if (startInput) startInput.value = startDateString;
    if (endInput) endInput.value = endDateString;

    document.querySelectorAll('.btn-date-filter').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === preset);
    });

    const clearButton = document.getElementById('clearDateFilter');
    if (clearButton) clearButton.classList.toggle('active', preset === 'all');

    state.pagination.currentPage = 1; // Reset page on filter change
    updateVisibleData();
}

function debounce(func, delay = 300) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => { func.apply(this, args); }, delay);
    };
}

function handleImportClick() {
    const userRole = (state.currentUser?.role || '').toLowerCase();
    if (userRole !== 'admin' && userRole !== 'administrator') {
        ui.showStatus('เฉพาะ Administrator เท่านั้นที่สามารถนำเข้าข้อมูลได้', true);
        return;
    }
    ui.showModal('importModal');
    const csvFileInput = document.getElementById('csvFile');
    if (csvFileInput) csvFileInput.value = '';
    const importStatus = document.getElementById('importStatus');
    if (importStatus) importStatus.textContent = '';
}

// [FIXED] แก้ไขฟังก์ชันนี้ให้รันเลข Lead Code ตามลำดับใน CSV เริ่มต้นที่ 1236
async function handleProcessCSV() {
    const csvFileInput = document.getElementById('csvFile');
    const importStatus = document.getElementById('importStatus');

    if (!csvFileInput || !csvFileInput.files || csvFileInput.files.length === 0) {
        if (importStatus) { importStatus.textContent = 'กรุณาเลือกไฟล์ CSV'; importStatus.style.color = 'red'; }
        return;
    }

    const file = csvFileInput.files[0];
    if (importStatus) importStatus.textContent = 'กำลังประมวลผลไฟล์...';
    ui.showLoading(true);

    try {
        const fileContent = await file.text();
        const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');

        if (lines.length < 2) throw new Error('ไฟล์ CSV ต้องมีอย่างน้อย 1 บรรทัดสำหรับ Header และ 1 บรรทัดสำหรับข้อมูล');

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const requiredHeaders = ['name', 'phone', 'channel', 'sales']; // Headers ที่จำเป็นต้องมี
        const missingHeaders = requiredHeaders.filter(req => !headers.includes(req));
        if (missingHeaders.length > 0) throw new Error(`ไฟล์ CSV ขาด Header ที่จำเป็น: ${missingHeaders.join(', ')}`);

        // [NEW] สร้างตัวนับ เริ่มต้นที่ 1236 สำหรับ CSV Import โดยเฉพาะ
        let csvLeadCodeCounter = 1236;

        const customersToInsert = [];
        const todayStr = new Date().toISOString().split('T')[0]; // วันที่ปัจจุบัน

        // เริ่มวนลูปตั้งแต่ i = 1 (ข้าม header)
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
            if (values.length === 0 || values.every(v => v === '')) continue; // ข้ามแถวว่าง
            if (values.length !== headers.length) { console.warn(`Skipping line ${i + 1}: Mismatched columns.`); continue; } // ข้ามแถวที่จำนวนคอลัมน์ไม่ตรง

            const customer = {};
            let hasEssentialData = false;
            headers.forEach((header, index) => {
                const value = values[index] ?? '';
                const fieldConfig = Object.values(ui.FIELD_MAPPING).find(config => config.field === header);
                if (fieldConfig?.field) {
                    // Normalize วันที่ (รวมถึง closed_date ถ้ามีใน CSV)
                    if (['date', 'old_appointment', 'appointment_date', 'closed_date'].includes(header)) { // [NEW]
                        customer[header] = normalizeDateStringToYYYYMMDD(value);
                    } else {
                        customer[header] = value;
                    }
                    if (requiredHeaders.includes(header) && value !== '') { hasEssentialData = true; }
                }
            });

            if (!hasEssentialData && !customer.name && !customer.phone) {
                console.warn(`Skipping line ${i + 1}: Lacks essential data.`);
                continue;
            }

            // --- ใส่ค่า Default ถ้าข้อมูลบางช่องหายไป ---
            customer.name = customer.name || `ลูกค้า #${i}`;
            customer.phone = customer.phone || 'N/A';
            customer.channel = customer.channel || 'ไม่ระบุ';
            customer.sales = customer.sales || state.currentUser?.username || 'N/A';
            customer.date = customer.date || todayStr; // ใช้วันที่ปัจจุบันถ้าไม่มีใน CSV

            // [CHANGED] กำหนด Lead Code โดยใช้ตัวนับสำหรับ CSV โดยเฉพาะ
            customer.lead_code = csvLeadCodeCounter.toString();
            csvLeadCodeCounter++; // เพิ่มค่าสำหรับแถวถัดไป

            customersToInsert.push(customer);
        }

        if (customersToInsert.length === 0) throw new Error('ไม่พบข้อมูลลูกค้าที่สามารถนำเข้าได้ในไฟล์');

        if (importStatus) importStatus.textContent = `กำลังนำเข้าข้อมูล ${customersToInsert.length} รายการ...`;
        await api.bulkInsertCustomers(customersToInsert);

        ui.showStatus(`นำเข้าข้อมูล ${customersToInsert.length} รายการสำเร็จ!`, false);
        ui.hideModal('importModal');
        initializeApp(); // รีเฟรชข้อมูลทั้งหมด

    } catch (error) {
        console.error('CSV Import Error:', error);
        ui.showStatus(`นำเข้าไม่สำเร็จ: ${error.message}`, true);
        if (importStatus) { importStatus.textContent = `เกิดข้อผิดพลาด: ${error.message}`; importStatus.style.color = 'red'; }
    } finally {
        ui.showLoading(false);
    }
}


function setupEventListeners() {
    document.getElementById('logoutButton')?.addEventListener('click', handleLogout);
    document.getElementById('addUserButton')?.addEventListener('click', handleAddCustomer);
    document.getElementById('submitStatusUpdateBtn')?.addEventListener('click', handleSubmitStatusUpdate);
    document.getElementById('editCustomerForm')?.addEventListener('submit', handleSaveEditForm);
    document.getElementById('closeEditModalBtn')?.addEventListener('click', hideEditModal);
    document.getElementById('cancelEditBtn')?.addEventListener('click', hideEditModal);
    document.getElementById('importButton')?.addEventListener('click', handleImportClick);
    document.getElementById('importBtn')?.addEventListener('click', handleProcessCSV);
    document.getElementById('refreshButton')?.addEventListener('click', () => {
        state.activeFilters = { search: '', status: '', sales: '' };
        const searchInput = document.getElementById('searchInput'); if (searchInput) searchInput.value = '';
        const statusFilter = document.getElementById('statusFilter'); if (statusFilter) statusFilter.value = '';
        const salesFilter = document.getElementById('salesFilter'); if (salesFilter) salesFilter.value = '';
        setDateFilterPreset('all');
        // initializeApp(); // Consider if needed, usually updateVisibleData is enough if data hasn't changed server-side
    });
    document.getElementById('searchInput')?.addEventListener('input', debounce(e => { state.activeFilters.search = e.target.value; state.pagination.currentPage = 1; updateVisibleData(); }));
    document.getElementById('statusFilter')?.addEventListener('change', e => { state.activeFilters.status = e.target.value; state.pagination.currentPage = 1; updateVisibleData(); });
    document.getElementById('salesFilter')?.addEventListener('change', e => { state.activeFilters.sales = e.target.value; state.pagination.currentPage = 1; updateVisibleData(); });
    document.querySelectorAll('.btn-date-filter[data-preset]').forEach(button => { button.addEventListener('click', () => setDateFilterPreset(button.dataset.preset)); });
    document.getElementById('clearDateFilter')?.addEventListener('click', () => setDateFilterPreset('all'));
    const debouncedDateChange = debounce(handleCustomDateChange, 500);
    document.getElementById('startDateFilter')?.addEventListener('change', debouncedDateChange);
    document.getElementById('endDateFilter')?.addEventListener('change', debouncedDateChange);
    document.getElementById('paginationContainer')?.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (button?.dataset.page) {
            const page = button.dataset.page;
            if (page === 'prev') { if (state.pagination.currentPage > 1) state.pagination.currentPage--; }
            else if (page === 'next') { const totalPages = Math.ceil(state.filteredCustomers.length / state.pagination.pageSize); if (state.pagination.currentPage < totalPages) state.pagination.currentPage++; }
            else { state.pagination.currentPage = parseInt(page); }
            updateVisibleData();
        }
    });
    document.getElementById('paginationContainer')?.addEventListener('change', event => { if (event.target.id === 'pageSize') { state.pagination.pageSize = parseInt(event.target.value); state.pagination.currentPage = 1; updateVisibleData(); } });
    const tableBody = document.getElementById('tableBody');
    tableBody?.addEventListener('click', handleTableClick);
    tableBody?.addEventListener('contextmenu', handleContextMenu);
    const contextMenu = document.getElementById('contextMenu');
    contextMenu?.addEventListener('click', handleContextMenuItemClick);
    window.addEventListener('click', (event) => { if (contextMenu && !contextMenu.contains(event.target)) { ui.hideContextMenu(); } });
    document.querySelectorAll('[data-modal-close]').forEach(btn => { btn.addEventListener('click', () => ui.hideModal(btn.dataset.modalClose)); });
    const tableHeader = document.querySelector('#excelTable thead');
    tableHeader?.addEventListener('click', (event) => { const headerCell = event.target.closest('th'); if (headerCell?.dataset.sortable) { handleSort(headerCell.dataset.sortable); } });
}

function handleSort(column) {
    if (state.sort.column === column) { state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc'; }
    else { state.sort.column = column; state.sort.direction = 'desc'; } // Default to descending for new column
    updateVisibleData();
}


function handleCustomDateChange() {
    let start = document.getElementById('startDateFilter').value;
    let end = document.getElementById('endDateFilter').value;
    if (start && end) {
        if (start <= end) {
            state.dateFilter = { startDate: start, endDate: end, preset: 'custom' };
            state.pagination.currentPage = 1;
            document.querySelectorAll('.btn-date-filter[data-preset]').forEach(btn => btn.classList.remove('active'));
            document.getElementById('clearDateFilter').classList.remove('active');
            updateVisibleData();
        } else { ui.showStatus('วันที่เริ่มต้นต้องมาก่อนวันที่สิ้นสุด', true); }
    } else if (start || end) {
        // Only update if both are cleared or only one is set (invalid state)
         if (!start && !end) {
             // If both are cleared, revert to 'all'
             setDateFilterPreset('all');
         } else {
            ui.showStatus('กรุณาเลือกทั้งวันที่เริ่มต้นและสิ้นสุด หรือล้างค่าทั้งคู่', true);
         }
    }
}


function getAllowedNextStatuses(currentStatus) {
    const specialStatuses = ["ไม่สนใจ", "ปิดการขาย", "ตามต่อ"];
    if (!currentStatus || currentStatus.trim() === '') return ["status 1", ...specialStatuses];
    switch (currentStatus) {
        case "status 1": return ["status 2", ...specialStatuses];
        case "status 2": return ["status 3", ...specialStatuses];
        case "status 3": return ["status 4", ...specialStatuses];
        case "status 4": return [...specialStatuses];
        default: if (specialStatuses.includes(currentStatus)) return [...specialStatuses]; return ["status 1", ...specialStatuses];
    }
}

function showUpdateStatusModal(customer) {
    const select = document.getElementById('modalStatusSelect'); if (!select) return;
    const userRole = (state.currentUser?.role || 'sales').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'administrator';
    let allowedStatuses = isAdmin ? DROPDOWN_OPTIONS.status_1 : getAllowedNextStatuses(customer.status_1);
    select.innerHTML = '<option value="">-- เลือกสถานะ --</option>';
    allowedStatuses.forEach(opt => { const optionEl = document.createElement('option'); optionEl.value = opt; optionEl.textContent = opt; select.appendChild(optionEl); });
    const notesTextArea = document.getElementById('modalNotesText'); if (notesTextArea) notesTextArea.value = customer.reason || '';
    ui.showModal('statusUpdateModal', { customerId: customer.id, customerName: customer.name || customer.lead_code || 'N/A' });
}

function showEditModal(customerId) {
    const customer = state.customers.find(c => String(c.id) === String(customerId));
    if (!customer) { ui.showStatus('ไม่พบข้อมูลลูกค้า (ID: ' + customerId + ')', true); return; }
    state.editingCustomerId = customerId;
    ui.buildEditForm(customer, state.currentUser, SALES_EDITABLE_FIELDS, state.salesList, DROPDOWN_OPTIONS);
    const modal = document.getElementById('editCustomerModal'); if (modal) modal.classList.add('show');
}

function hideEditModal() {
    state.editingCustomerId = null;
    const modal = document.getElementById('editCustomerModal'); if (modal) modal.classList.remove('show');
    const form = document.getElementById('editCustomerForm'); if (form) form.innerHTML = '';
}

// [MODIFIED] เพิ่ม Logic การใส่ closed_date อัตโนมัติ
async function handleSaveEditForm(event) {
    event.preventDefault();
    if (!state.editingCustomerId) return;
    const form = event.target;
    const formData = new FormData(form);
    const updatedData = {};
    for (const [key, value] of formData.entries()) { updatedData[key] = value; }

    // Normalize วันที่ทั้งหมด รวมถึง closed_date
    updatedData.date = normalizeDateStringToYYYYMMDD(updatedData.date);
    updatedData.old_appointment = normalizeDateStringToYYYYMMDD(updatedData.old_appointment);
    updatedData.appointment_date = normalizeDateStringToYYYYMMDD(updatedData.appointment_date);
    updatedData.closed_date = normalizeDateStringToYYYYMMDD(updatedData.closed_date); // [NEW]

    const originalCustomer = state.customers.find(c => String(c.id) === String(state.editingCustomerId));
    if (!originalCustomer) { ui.showStatus('Error: Cannot find original data.', true); return; }

    // --- ตรรกะการปิดการขาย ---
    const isNowClosing = updatedData.status_1 === 'ปิดการขาย' && updatedData.last_status === '100%' && (updatedData.closed_amount && updatedData.closed_amount.trim() !== '');
    const wasAlreadyClosed = originalCustomer.status_1 === 'ปิดการขาย' && originalCustomer.last_status === '100%' && originalCustomer.closed_amount;

    if (isNowClosing) {
        // [NEW] ถ้าเพิ่งปิดการขาย และยังไม่มี closed_date ให้ใส่วันที่ปัจจุบัน
        if (!updatedData.closed_date) {
            updatedData.closed_date = new Date().toISOString().split('T')[0];
            console.log(`Auto-populating closed_date: ${updatedData.closed_date}`);
        }
    } else if (wasAlreadyClosed && !isNowClosing) {
         // [Optional] ถ้าสถานะเปลี่ยนจาก "ปิดการขาย" เป็นอย่างอื่น อาจจะล้าง closed_date ทิ้ง
         // updatedData.closed_date = null; // <-- เอา comment ออกถ้าต้องการแบบนี้
    }


    // --- การตรวจสอบความครบถ้วนของการปิดการขาย ---
    // (ย้ายลงมาหลังจาก potentially auto-populate closed_date)
    const isClosingAttempt = updatedData.last_status === '100%' || updatedData.status_1 === 'ปิดการขาย' || (updatedData.closed_amount && updatedData.closed_amount.trim() !== '');
    if (isClosingAttempt) {
        const isClosingComplete = updatedData.last_status === '100%' && updatedData.status_1 === 'ปิดการขาย' && (updatedData.closed_amount && updatedData.closed_amount.trim() !== '');
        // ไม่บังคับ closed_date เพราะอาจจะ auto-populate หรือผู้ใช้กรอกเอง
        if (!isClosingComplete) {
            ui.showStatus('การปิดการขายต้องกรอก: Last Status (100%), Status Sale (ปิดการขาย), และ ยอดที่ปิดได้ ให้ครบถ้วน', true);
            return; // หยุดการทำงานถ้าข้อมูลปิดการขายไม่ครบ
        }
    }


    ui.showLoading(true);
    try {
        const updatedCustomer = await api.updateCustomer(state.editingCustomerId, updatedData);
        // Normalize วันที่อีกครั้งหลังได้รับข้อมูลจาก API (เผื่อ API มีการแก้ไข)
        updatedCustomer.date = normalizeDateStringToYYYYMMDD(updatedCustomer.date);
        updatedCustomer.old_appointment = normalizeDateStringToYYYYMMDD(updatedCustomer.old_appointment);
        updatedCustomer.appointment_date = normalizeDateStringToYYYYMMDD(updatedCustomer.appointment_date);
        updatedCustomer.closed_date = normalizeDateStringToYYYYMMDD(updatedCustomer.closed_date); // [NEW]

        // --- บันทึกประวัติการแก้ไข (เฉพาะ Sales) ---
        const userRole = (state.currentUser?.role || '').toLowerCase();
        if (userRole === 'sales') {
            const historyPromises = [];
            for (const [key, value] of Object.entries(updatedData)) {
                // เปรียบเทียบค่าเก่า-ใหม่
                const originalValue = originalCustomer[key] ?? ''; // ใช้ ?? เพื่อรองรับ null/undefined
                const newValue = value ?? '';
                if (String(originalValue) !== String(newValue)) {
                    // หาชื่อหัวข้อภาษาไทย
                    const header = Object.keys(ui.FIELD_MAPPING).find(h => ui.FIELD_MAPPING[h].field === key) || key;
                    // สร้าง Log Note
                    const logNote = `แก้ไข '${header}' จาก '${originalValue}' เป็น '${newValue}'`;
                    historyPromises.push(api.addStatusUpdate(state.editingCustomerId, 'แก้ไขข้อมูล', logNote, state.currentUser.id));
                }
            }
            if (historyPromises.length > 0) { await Promise.all(historyPromises); }
        }

        // --- อัปเดตข้อมูลใน State (Frontend) ---
        const index = state.customers.findIndex(c => String(c.id) === String(state.editingCustomerId));
        if (index !== -1) { state.customers[index] = updatedCustomer; }
        else { state.customers.push(updatedCustomer); } // กรณีที่ไม่ควรเกิด แต่ใส่เผื่อไว้

        hideEditModal(); // ปิดหน้าต่างแก้ไข
        updateVisibleData(); // รีเฟรชตาราง
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

// [FIXED] แก้ไขฟังก์ชันนี้ให้รับ Lead Code ที่ผู้ใช้ป้อนเข้ามา (จาก prompt)
async function handleAddCustomer() {

    // 1. ถามผู้ใช้สำหรับ Lead Code
    const leadCodeInput = prompt(
        "กรุณาระบุ 'ลำดับที่' (Lead Code) สำหรับลูกค้าใหม่:\n\n(หากต้องการให้ระบบรันเลขอัตโนมัติ ให้เว้นว่างไว้)",
        "" // ค่าเริ่มต้นเป็นช่องว่าง
    );

    // 2. ถ้าผู้ใช้กด "Cancel" (leadCodeInput จะเป็น null) ให้ออกจากฟังก์ชัน
    if (leadCodeInput === null) {
        return; // ผู้ใช้กดยกเลิก
    }

    // 3. ถ้าผู้ใช้กด "OK" (ไม่ว่าจะพิมพ์อะไรมาหรือไม่) ให้ทำงานต่อ
    ui.showLoading(true);
    try {
        // 4. ส่งค่าที่ผู้ใช้ป้อน (จะเป็น "1236" หรือ "" (ค่าว่าง)) ไปยัง api.addCustomer
        const newCustomer = await api.addCustomer(state.currentUser?.username || 'N/A', leadCodeInput);

        if (newCustomer) {
            await api.addStatusUpdate(newCustomer.id, 'สร้างลูกค้าใหม่', 'ระบบสร้าง Lead อัตโนมัติ', state.currentUser.id);
            const now = new Date();
            newCustomer.call_time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            // Normalize วันที่หลังสร้าง
            newCustomer.date = normalizeDateStringToYYYYMMDD(newCustomer.date);
            // [NEW] Ensure other dates are normalized or null on creation if applicable
            newCustomer.old_appointment = normalizeDateStringToYYYYMMDD(newCustomer.old_appointment);
            newCustomer.appointment_date = normalizeDateStringToYYYYMMDD(newCustomer.appointment_date);
            newCustomer.closed_date = normalizeDateStringToYYYYMMDD(newCustomer.closed_date);

            state.customers.unshift(newCustomer); // เพิ่มลูกค้าใหม่ไว้บนสุด
            updateVisibleData(); // รีเฟรชตาราง
            showEditModal(newCustomer.id); // เปิดหน้าต่างแก้ไขให้กรอกข้อมูลต่อ
            ui.showStatus('เพิ่มลูกค้าใหม่สำเร็จ กรุณากรอกข้อมูล', false);
        } else { throw new Error("Failed to retrieve new customer data."); }
    } catch (error) {
        console.error("Error adding customer:", error);
        ui.showStatus('เพิ่มลูกค้าไม่สำเร็จ: ' + error.message, true);
    } finally {
        ui.showLoading(false);
    }
}


function handleTableClick(event) {
    const target = event.target;
    const action = target.dataset.action;
    if (!action || target.disabled) return;
    const row = target.closest('[data-id]'); const id = row?.dataset.id;
    if (!id) return;
    const customer = state.customers.find(c => String(c.id) === String(id));
    if (!customer) { ui.showStatus('ไม่พบข้อมูลลูกค้าสำหรับ ID นี้', true); return; }
    if (action === 'edit-customer') showEditModal(id);
    if (action === 'update-status') showUpdateStatusModal(customer);
    if (action === 'view-history') handleViewHistory(id, customer.name);
}

async function handleViewHistory(customerId, customerName) {
    ui.showModal('historyModal', { customerName: customerName || 'N/A' });
    ui.showLoading(true);
    try {
        const historyData = await api.fetchStatusHistory(customerId);
        ui.renderHistoryTimeline(historyData);
    } catch (error) {
        ui.showStatus('ไม่สามารถโหลดประวัติได้: ' + error.message, true);
        const container = document.getElementById('historyTimelineContainer'); if(container) container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    } finally {
        ui.showLoading(false);
    }
}

async function handleSubmitStatusUpdate() {
    const customerId = document.getElementById('modalCustomerId').value;
    const newStatus = document.getElementById('modalStatusSelect').value;
    const notes = document.getElementById('modalNotesText').value.trim();

    if (!customerId) { ui.showStatus('ไม่พบ ID ลูกค้า', true); return; }
    if (!newStatus) { ui.showStatus('กรุณาเลือกสถานะ', true); return; }

    // Status 1-4 ต้องมีเหตุผล
    const requiresReason = ["status 1", "status 2", "status 3", "status 4"].includes(newStatus);
    if (requiresReason && !notes) {
        ui.showStatus('สำหรับ Status 1-4 กรุณากรอกเหตุผล/บันทึกเพิ่มเติม', true);
        return;
    }

    ui.showLoading(true);
    try {
        // ข้อมูลที่จะอัปเดตตาราง customers
        const updateData = { status_1: newStatus, reason: notes };

        // [NEW] ถ้า Status ที่เลือกคือ "ปิดการขาย" ให้ลองเช็ค Last Status และ Amount เพิ่มเติม
        // (ถึงแม้ Logic หลักจะอยู่ใน Edit Form แต่ใส่ไว้เผื่อการอัปเดตเร็ว)
        let closedDateToUpdate = null;
        if (newStatus === 'ปิดการขาย') {
            const customer = state.customers.find(c => String(c.id) === String(customerId));
            if (customer && customer.last_status === '100%' && customer.closed_amount) {
                 // ถ้าเงื่อนไขครบ และยังไม่มี closed_date ให้ใส่วันปัจจุบัน
                 if (!customer.closed_date) {
                      closedDateToUpdate = new Date().toISOString().split('T')[0];
                      updateData.closed_date = closedDateToUpdate; // เพิ่ม closed_date ในข้อมูลที่จะ update
                 }
            }
        } else {
            // [Optional] ถ้าเปลี่ยน Status เป็นอย่างอื่น อาจจะล้าง closed_date
             // const customer = state.customers.find(c => String(c.id) === String(customerId));
             // if (customer && customer.closed_date) {
             //     updateData.closed_date = null;
             // }
        }


        // 1. บันทึกประวัติก่อน
        await api.addStatusUpdate(customerId, newStatus, notes, state.currentUser.id);

        // 2. อัปเดตข้อมูลลูกค้า (รวม closed_date ถ้ามีการเปลี่ยนแปลง)
        const updatedCustomer = await api.updateCustomer(customerId, updateData);

        // Normalize วันที่หลังจากอัปเดต
        updatedCustomer.date = normalizeDateStringToYYYYMMDD(updatedCustomer.date);
        updatedCustomer.old_appointment = normalizeDateStringToYYYYMMDD(updatedCustomer.old_appointment);
        updatedCustomer.appointment_date = normalizeDateStringToYYYYMMDD(updatedCustomer.appointment_date);
        updatedCustomer.closed_date = normalizeDateStringToYYYYMMDD(updatedCustomer.closed_date); // [NEW]

        // อัปเดต State ใน Frontend
        const index = state.customers.findIndex(c => String(c.id) === String(customerId));
        if (index !== -1) { state.customers[index] = updatedCustomer; }
        else { state.customers.push(updatedCustomer); }

        updateVisibleData(); // รีเฟรชตาราง
        ui.hideModal('statusUpdateModal'); // ปิด Modal
        ui.showStatus('อัปเดตสถานะสำเร็จ', false);
    } catch (error) {
        console.error("Error submitting status update:", error);
        ui.showStatus("เกิดข้อผิดพลาดในการอัปเดต: " + error.message, true);
    } finally {
        ui.showLoading(false);
    }
}


function handleContextMenu(event) {
    const row = event.target.closest('tr[data-id]');
    if (!row || !row.dataset.id) return;
    const userRole = (state.currentUser?.role || 'sales').toLowerCase();
    // อนุญาตให้ Admin/Administrator เท่านั้นที่ใช้ Context Menu ได้
    if (userRole !== 'admin' && userRole !== 'administrator') {
         // event.preventDefault(); // ไม่จำเป็นต้อง preventDefault ถ้าไม่มีเมนูให้แสดง
         return;
    }
    event.preventDefault(); // ป้องกันเมนูคลิกขวาปกติของเบราว์เซอร์
    state.contextMenuRowId = row.dataset.id; // เก็บ ID ของแถวที่คลิก
    ui.showContextMenu(event); // แสดงเมนู Context Menu ที่เราสร้างเอง
}


async function handleContextMenuItemClick(event) {
    const action = event.target.dataset.action;
    const customerId = state.contextMenuRowId; // ID ที่เก็บไว้ตอนคลิกขวา
    if (!action || !customerId) return; // ถ้าไม่มี action หรือ ID ก็ไม่ต้องทำอะไร
    ui.hideContextMenu(); // ซ่อนเมนูไปก่อน

    // จัดการ Action 'delete'
    if (action === 'delete') {
        const customerToDelete = state.customers.find(c => String(c.id) === String(customerId));
        const customerDisplayName = customerToDelete?.name || customerToDelete?.lead_code || `ID: ${customerId}`;
        // ยืนยันก่อนลบ
        if (confirm(`คุณต้องการลบลูกค้า "${customerDisplayName}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
            ui.showLoading(true);
            try {
                await api.deleteCustomer(customerId); // เรียก API ลบ
                // ลบออกจาก State ใน Frontend ด้วย
                state.customers = state.customers.filter(c => String(c.id) !== String(customerId));
                updateVisibleData(); // รีเฟรชตาราง
                ui.showStatus('ลบข้อมูลสำเร็จ', false);
            } catch (error) {
                console.error("Error deleting customer:", error);
                ui.showStatus('ลบข้อมูลไม่สำเร็จ: ' + error.message, true);
            } finally {
                ui.showLoading(false);
            }
        }
    }
    // เพิ่ม else if สำหรับ action อื่นๆ ถ้ามีในอนาคต (เช่น copy, paste)

    state.contextMenuRowId = null; // ล้าง ID ที่เก็บไว้
}


document.addEventListener('DOMContentLoaded', () => {
    // ตรวจสอบว่า Dependencies โหลดครบหรือยัง
    if (window.supabase && window.supabase.createClient && window.ui && window.api) {
        initializeApp(); // เริ่มต้นแอป
        setupEventListeners(); // ตั้งค่า Event Listeners
    } else {
        console.error("Critical dependencies not loaded. Check script loading order or network issues.");
        document.body.innerHTML = '<div style="color: red; padding: 20px;">Error loading application components. Please refresh or contact support.</div>';
    }
});
