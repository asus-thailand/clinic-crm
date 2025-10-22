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
    // [NEW] เพิ่ม channel และ procedure เข้าไปใน activeFilters
    activeFilters: { search: '', status: '', sales: '', channel: '', procedure: '' },
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
 */
function normalizeDateStringToYYYYMMDD(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    dateStr = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const date = new Date(dateStr + 'T00:00:00Z');
        if (!isNaN(date.getTime()) && date.toISOString().startsWith(dateStr)) {
             return dateStr;
        }
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            let year = parseInt(parts[2], 10);
            if (year > 2500) year -= 543;
            if (year < 1800 || year > 2200) return null; // ขยายช่วงปี
            const formattedDate = `${year}-${month}-${day}`;
            const date = new Date(formattedDate + 'T00:00:00Z');
            if (!isNaN(date.getTime()) && date.toISOString().startsWith(formattedDate)) {
                 return formattedDate;
            }
        }
    }
    console.warn(`Invalid or unhandled date format: ${dateStr}. Returning null.`);
    return null;
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
            c.date = normalizeDateStringToYYYYMMDD(c.date);
            c.old_appointment = normalizeDateStringToYYYYMMDD(c.old_appointment);
            c.appointment_date = normalizeDateStringToYYYYMMDD(c.appointment_date);
            c.closed_date = normalizeDateStringToYYYYMMDD(c.closed_date);
        });
        state.customers = customers || [];
        state.salesList = salesList || [];
        const statuses = [...new Set(state.customers.map(c => c.last_status).filter(Boolean))].sort();
        // Populate Dropdowns
        ui.populateFilterDropdown('salesFilter', state.salesList);
        ui.populateFilterDropdown('statusFilter', statuses);
        // [NEW] Populate new filters
        ui.populateFilterDropdown('channelFilter', DROPDOWN_OPTIONS.channel);
        ui.populateFilterDropdown('procedureFilter', DROPDOWN_OPTIONS.procedure);

        setDateFilterPreset('all'); // Set default date filter
        updateVisibleData();
        ui.showStatus('โหลดข้อมูลสำเร็จ', false);
    } catch (error) {
        console.error('Initialization failed:', error);
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
        if (['date', 'closed_date', 'lead_code'].includes(column)) { // [NEW] เพิ่ม lead_code ให้ sort เป็นตัวเลขได้
            // Handle numeric sorting for lead_code if possible
            if(column === 'lead_code') {
                const numA = parseInt(valA, 10);
                const numB = parseInt(valB, 10);
                if (!isNaN(numA) && !isNaN(numB)) {
                    if (numA < numB) return direction === 'asc' ? -1 : 1;
                    if (numA > numB) return direction === 'asc' ? 1 : -1;
                    return 0;
                }
            }
            // Handle date sorting
            const dateA = new Date(valA);
            const dateB = new Date(valB);
            if (isNaN(dateA) && isNaN(dateB)) return 0;
            if (isNaN(dateA)) return direction === 'desc' ? 1 : -1;
            if (isNaN(dateB)) return direction === 'desc' ? -1 : 1;
            if (dateA < dateB) return direction === 'asc' ? -1 : 1;
            if (dateA > dateB) return direction === 'asc' ? 1 : -1;
            return 0;
        }
        // Default string sort
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    // --- Date Range Filtering ---
    let dateFiltered = sortedCustomers;
    if (state.dateFilter.startDate && state.dateFilter.endDate) {
        dateFiltered = sortedCustomers.filter(c => {
            if (!c.date) return false;
            return c.date >= state.dateFilter.startDate && c.date <= state.dateFilter.endDate;
        });
    }

    // --- Text/Dropdown Filtering ---
    // [NEW] ดึง channel และ procedure filter มาใช้
    const { search, status, sales, channel, procedure } = state.activeFilters;
    const lowerCaseSearch = search.toLowerCase();

    state.filteredCustomers = dateFiltered.filter(customer => {
        const searchableText = `${customer.name || ''} ${customer.phone || ''} ${customer.lead_code || ''}`.toLowerCase();
        const matchesSearch = !search || searchableText.includes(lowerCaseSearch);
        const matchesStatus = !status || (customer.last_status || '').trim() === status;
        const matchesSales = !sales || customer.sales === sales;
        // [NEW] เพิ่มเงื่อนไขการกรอง channel และ procedure
        const matchesChannel = !channel || customer.channel === channel;
        const matchesProcedure = !procedure || customer.procedure === procedure;

        return matchesSearch && matchesStatus && matchesSales && matchesChannel && matchesProcedure; // เพิ่มเงื่อนไข
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
        const requiredHeaders = ['name', 'phone', 'channel', 'sales'];
        const missingHeaders = requiredHeaders.filter(req => !headers.includes(req));
        if (missingHeaders.length > 0) throw new Error(`ไฟล์ CSV ขาด Header ที่จำเป็น: ${missingHeaders.join(', ')}`);

        let csvLeadCodeCounter = 1236; // ตัวนับสำหรับ CSV

        const customersToInsert = [];
        const todayStr = new Date().toISOString().split('T')[0];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
            if (values.length === 0 || values.every(v => v === '')) continue;
            if (values.length !== headers.length) { console.warn(`Skipping line ${i + 1}: Mismatched columns.`); continue; }

            const customer = {};
            let hasEssentialData = false;
            headers.forEach((header, index) => {
                const value = values[index] ?? '';
                const fieldConfig = Object.values(ui.FIELD_MAPPING).find(config => config.field === header);
                if (fieldConfig?.field) {
                    if (['date', 'old_appointment', 'appointment_date', 'closed_date'].includes(header)) {
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

            customer.name = customer.name || `ลูกค้า #${i}`;
            customer.phone = customer.phone || 'N/A';
            customer.channel = customer.channel || 'ไม่ระบุ';
            customer.sales = customer.sales || state.currentUser?.username || 'N/A';
            customer.date = customer.date || todayStr;
            customer.lead_code = csvLeadCodeCounter.toString(); // ใช้ตัวนับ CSV
            csvLeadCodeCounter++;

            customersToInsert.push(customer);
        }

        if (customersToInsert.length === 0) throw new Error('ไม่พบข้อมูลลูกค้าที่สามารถนำเข้าได้ในไฟล์');

        if (importStatus) importStatus.textContent = `กำลังนำเข้าข้อมูล ${customersToInsert.length} รายการ...`;
        await api.bulkInsertCustomers(customersToInsert);

        ui.showStatus(`นำเข้าข้อมูล ${customersToInsert.length} รายการสำเร็จ!`, false);
        ui.hideModal('importModal');
        initializeApp();

    } catch (error) {
        console.error('CSV Import Error:', error);
        ui.showStatus(`นำเข้าไม่สำเร็จ: ${error.message}`, true);
        if (importStatus) { importStatus.textContent = `เกิดข้อผิดพลาด: ${error.message}`; importStatus.style.color = 'red'; }
    } finally {
        ui.showLoading(false);
    }
}


function setupEventListeners() {
    // Buttons
    document.getElementById('logoutButton')?.addEventListener('click', handleLogout);
    document.getElementById('addUserButton')?.addEventListener('click', handleAddCustomer);
    document.getElementById('importButton')?.addEventListener('click', handleImportClick);
    document.getElementById('importBtn')?.addEventListener('click', handleProcessCSV); // Import modal button
    document.getElementById('refreshButton')?.addEventListener('click', () => {
        // [NEW] Reset new filters as well
        state.activeFilters = { search: '', status: '', sales: '', channel: '', procedure: '' };
        const searchInput = document.getElementById('searchInput'); if (searchInput) searchInput.value = '';
        const statusFilter = document.getElementById('statusFilter'); if (statusFilter) statusFilter.value = '';
        const salesFilter = document.getElementById('salesFilter'); if (salesFilter) salesFilter.value = '';
        const channelFilter = document.getElementById('channelFilter'); if (channelFilter) channelFilter.value = ''; // [NEW]
        const procedureFilter = document.getElementById('procedureFilter'); if (procedureFilter) procedureFilter.value = ''; // [NEW]
        setDateFilterPreset('all'); // Reset date filter and update data
    });

    // Filters
    document.getElementById('searchInput')?.addEventListener('input', debounce(e => {
        state.activeFilters.search = e.target.value;
        state.pagination.currentPage = 1;
        updateVisibleData();
    }));
    document.getElementById('statusFilter')?.addEventListener('change', e => {
        state.activeFilters.status = e.target.value;
        state.pagination.currentPage = 1;
        updateVisibleData();
    });
    document.getElementById('salesFilter')?.addEventListener('change', e => {
        state.activeFilters.sales = e.target.value;
        state.pagination.currentPage = 1;
        updateVisibleData();
    });
    // [NEW] Event listeners for new filters
    document.getElementById('channelFilter')?.addEventListener('change', e => {
        state.activeFilters.channel = e.target.value;
        state.pagination.currentPage = 1;
        updateVisibleData();
    });
    document.getElementById('procedureFilter')?.addEventListener('change', e => {
        state.activeFilters.procedure = e.target.value;
        state.pagination.currentPage = 1;
        updateVisibleData();
    });


    // Date Filters
    document.querySelectorAll('.btn-date-filter[data-preset]').forEach(button => {
        button.addEventListener('click', () => setDateFilterPreset(button.dataset.preset));
    });
    document.getElementById('clearDateFilter')?.addEventListener('click', () => setDateFilterPreset('all'));
    const debouncedDateChange = debounce(handleCustomDateChange, 500);
    document.getElementById('startDateFilter')?.addEventListener('change', debouncedDateChange);
    document.getElementById('endDateFilter')?.addEventListener('change', debouncedDateChange);

    // Pagination
    document.getElementById('paginationContainer')?.addEventListener('click', event => {
        const button = event.target.closest('button[data-page]');
        if (button) {
            const page = button.dataset.page;
            if (page === 'prev') { if (state.pagination.currentPage > 1) state.pagination.currentPage--; }
            else if (page === 'next') {
                const totalPages = Math.ceil(state.filteredCustomers.length / state.pagination.pageSize);
                if (state.pagination.currentPage < totalPages) state.pagination.currentPage++;
            }
            else { state.pagination.currentPage = parseInt(page); }
            updateVisibleData();
        }
    });
    document.getElementById('paginationContainer')?.addEventListener('change', event => {
        if (event.target.id === 'pageSize') {
            state.pagination.pageSize = parseInt(event.target.value);
            state.pagination.currentPage = 1; // Reset to page 1 when size changes
            updateVisibleData();
        }
    });

    // Table Interaction
    const tableBody = document.getElementById('tableBody');
    tableBody?.addEventListener('click', handleTableClick);
    tableBody?.addEventListener('contextmenu', handleContextMenu);

    // Context Menu
    const contextMenu = document.getElementById('contextMenu');
    contextMenu?.addEventListener('click', handleContextMenuItemClick);
    window.addEventListener('click', (event) => { // Hide context menu on click outside
        if (contextMenu && !contextMenu.contains(event.target)) {
            ui.hideContextMenu();
        }
    });

    // Modals
    document.getElementById('submitStatusUpdateBtn')?.addEventListener('click', handleSubmitStatusUpdate); // Status Update Modal
    document.getElementById('editCustomerForm')?.addEventListener('submit', handleSaveEditForm); // Edit Form Submit
    document.getElementById('closeEditModalBtn')?.addEventListener('click', hideEditModal); // Edit Modal Close Button
    document.getElementById('cancelEditBtn')?.addEventListener('click', hideEditModal); // Edit Modal Cancel Button
    document.querySelectorAll('[data-modal-close]').forEach(btn => { // Generic Close Buttons
        btn.addEventListener('click', () => ui.hideModal(btn.dataset.modalClose));
    });

    // Table Header Sorting
    const tableHeader = document.querySelector('#excelTable thead');
    tableHeader?.addEventListener('click', (event) => {
        const headerCell = event.target.closest('th[data-sortable]');
        if (headerCell) {
            handleSort(headerCell.dataset.sortable);
        }
    });
}


function handleSort(column) {
    if (state.sort.column === column) {
        // Toggle direction if same column
        state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        // Set new column and default to descending (or ascending if you prefer)
        state.sort.column = column;
        state.sort.direction = 'desc';
    }
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
    } else if (!start && !end) {
        // If both cleared, revert to 'all' preset
        setDateFilterPreset('all');
    } else {
        // If only one is set, show an error (optional, could also just not update)
        ui.showStatus('กรุณาเลือกทั้งวันที่เริ่มต้นและสิ้นสุด หรือล้างค่าทั้งคู่', true);
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
    select.innerHTML = '<option value="">-- เลือกสถานะ --</option>'; // Clear previous options
    allowedStatuses.forEach(opt => { const optionEl = document.createElement('option'); optionEl.value = opt; optionEl.textContent = opt; select.appendChild(optionEl); });
    const notesTextArea = document.getElementById('modalNotesText'); if (notesTextArea) notesTextArea.value = customer.reason || ''; // Populate notes
    ui.showModal('statusUpdateModal', { customerId: customer.id, customerName: customer.name || customer.lead_code || 'N/A' });
}


function showEditModal(customerId) {
    const customer = state.customers.find(c => String(c.id) === String(customerId));
    if (!customer) { ui.showStatus('ไม่พบข้อมูลลูกค้า (ID: ' + customerId + ')', true); return; }
    state.editingCustomerId = customerId;
    // Pass necessary data to build the form
    ui.buildEditForm(customer, state.currentUser, SALES_EDITABLE_FIELDS, state.salesList, DROPDOWN_OPTIONS);
    const modal = document.getElementById('editCustomerModal'); if (modal) modal.classList.add('show');
}

function hideEditModal() {
    state.editingCustomerId = null;
    const modal = document.getElementById('editCustomerModal'); if (modal) modal.classList.remove('show');
    const form = document.getElementById('editCustomerForm'); if (form) form.innerHTML = ''; // Clear form content
}

// [MODIFIED] เพิ่ม Logic การใส่ closed_date อัตโนมัติ
async function handleSaveEditForm(event) {
    event.preventDefault();
    if (!state.editingCustomerId) return;
    const form = event.target;
    const formData = new FormData(form);
    const updatedData = {};
    for (const [key, value] of formData.entries()) { updatedData[key] = value; }

    updatedData.date = normalizeDateStringToYYYYMMDD(updatedData.date);
    updatedData.old_appointment = normalizeDateStringToYYYYMMDD(updatedData.old_appointment);
    updatedData.appointment_date = normalizeDateStringToYYYYMMDD(updatedData.appointment_date);
    updatedData.closed_date = normalizeDateStringToYYYYMMDD(updatedData.closed_date);

    const originalCustomer = state.customers.find(c => String(c.id) === String(state.editingCustomerId));
    if (!originalCustomer) { ui.showStatus('Error: Cannot find original data.', true); return; }

    const isNowClosing = updatedData.status_1 === 'ปิดการขาย' && updatedData.last_status === '100%' && (updatedData.closed_amount && updatedData.closed_amount.trim() !== '');
    const wasAlreadyClosed = originalCustomer.status_1 === 'ปิดการขาย' && originalCustomer.last_status === '100%' && originalCustomer.closed_amount;

    if (isNowClosing && !updatedData.closed_date) {
        updatedData.closed_date = new Date().toISOString().split('T')[0];
        console.log(`Auto-populating closed_date: ${updatedData.closed_date}`);
    }

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
        updatedCustomer.date = normalizeDateStringToYYYYMMDD(updatedCustomer.date);
        updatedCustomer.old_appointment = normalizeDateStringToYYYYMMDD(updatedCustomer.old_appointment);
        updatedCustomer.appointment_date = normalizeDateStringToYYYYMMDD(updatedCustomer.appointment_date);
        updatedCustomer.closed_date = normalizeDateStringToYYYYMMDD(updatedCustomer.closed_date);

        const userRole = (state.currentUser?.role || '').toLowerCase();
        if (userRole === 'sales') {
            const historyPromises = [];
            for (const [key, value] of Object.entries(updatedData)) {
                const originalValue = originalCustomer[key] ?? '';
                const newValue = value ?? '';
                if (String(originalValue) !== String(newValue)) {
                    const header = Object.keys(ui.FIELD_MAPPING).find(h => ui.FIELD_MAPPING[h].field === key) || key;
                    const logNote = `แก้ไข '${header}' จาก '${originalValue}' เป็น '${newValue}'`;
                    historyPromises.push(api.addStatusUpdate(state.editingCustomerId, 'แก้ไขข้อมูล', logNote, state.currentUser.id));
                }
            }
            if (historyPromises.length > 0) { await Promise.all(historyPromises); }
        }

        const index = state.customers.findIndex(c => String(c.id) === String(state.editingCustomerId));
        if (index !== -1) { state.customers[index] = updatedCustomer; }
        else { state.customers.push(updatedCustomer); }

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

// [FIXED] แก้ไขฟังก์ชันนี้ให้รับ Lead Code ที่ผู้ใช้ป้อนเข้ามา (จาก prompt)
async function handleAddCustomer() {
    const leadCodeInput = prompt(
        "กรุณาระบุ 'ลำดับที่' (Lead Code) สำหรับลูกค้าใหม่:\n\n(หากต้องการให้ระบบรันเลขอัตโนมัติ ให้เว้นว่างไว้)",
        ""
    );
    if (leadCodeInput === null) return;

    ui.showLoading(true);
    try {
        const newCustomer = await api.addCustomer(state.currentUser?.username || 'N/A', leadCodeInput);
        if (newCustomer) {
            await api.addStatusUpdate(newCustomer.id, 'สร้างลูกค้าใหม่', 'ระบบสร้าง Lead อัตโนมัติ', state.currentUser.id);
            const now = new Date();
            newCustomer.call_time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            newCustomer.date = normalizeDateStringToYYYYMMDD(newCustomer.date);
            newCustomer.old_appointment = normalizeDateStringToYYYYMMDD(newCustomer.old_appointment);
            newCustomer.appointment_date = normalizeDateStringToYYYYMMDD(newCustomer.appointment_date);
            newCustomer.closed_date = normalizeDateStringToYYYYMMDD(newCustomer.closed_date);

            state.customers.unshift(newCustomer);
            updateVisibleData();
            showEditModal(newCustomer.id);
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
    if (action === 'view-history') handleViewHistory(id, customer.name || customer.lead_code); // Pass name or lead_code
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

    const requiresReason = ["status 1", "status 2", "status 3", "status 4"].includes(newStatus);
    if (requiresReason && !notes) {
        ui.showStatus('สำหรับ Status 1-4 กรุณากรอกเหตุผล/บันทึกเพิ่มเติม', true);
        return;
    }

    ui.showLoading(true);
    try {
        const updateData = { status_1: newStatus, reason: notes };
        let closedDateToUpdate = null; // Prepare for potential auto-date

        const customer = state.customers.find(c => String(c.id) === String(customerId)); // Get current customer data
        if (newStatus === 'ปิดการขาย' && customer) {
             // Check conditions fully ONLY IF using the quick update button for closing
             if (customer.last_status === '100%' && customer.closed_amount) {
                 if (!customer.closed_date) { // Only add date if not already set
                      closedDateToUpdate = new Date().toISOString().split('T')[0];
                      updateData.closed_date = closedDateToUpdate;
                      console.log(`Auto-populating closed_date via status update: ${closedDateToUpdate}`);
                 }
             } else {
                 // Warn if trying to close via quick update without full conditions
                 // (Ideally, closing should primarily happen via Edit Form for completeness)
                 console.warn("Attempting to close via status update without all conditions (100%, Amount). Closed date might not be set.");
             }
        }

        await api.addStatusUpdate(customerId, newStatus, notes, state.currentUser.id);
        const updatedCustomer = await api.updateCustomer(customerId, updateData);

        updatedCustomer.date = normalizeDateStringToYYYYMMDD(updatedCustomer.date);
        updatedCustomer.old_appointment = normalizeDateStringToYYYYMMDD(updatedCustomer.old_appointment);
        updatedCustomer.appointment_date = normalizeDateStringToYYYYMMDD(updatedCustomer.appointment_date);
        updatedCustomer.closed_date = normalizeDateStringToYYYYMMDD(updatedCustomer.closed_date);

        const index = state.customers.findIndex(c => String(c.id) === String(customerId));
        if (index !== -1) { state.customers[index] = updatedCustomer; }
        else { state.customers.push(updatedCustomer); }

        updateVisibleData();
        ui.hideModal('statusUpdateModal');
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
    if (userRole !== 'admin' && userRole !== 'administrator') return;
    event.preventDefault();
    state.contextMenuRowId = row.dataset.id;
    ui.showContextMenu(event);
}


async function handleContextMenuItemClick(event) {
    const action = event.target.dataset.action;
    const customerId = state.contextMenuRowId;
    if (!action || !customerId) return;
    ui.hideContextMenu();

    if (action === 'delete') {
        const customerToDelete = state.customers.find(c => String(c.id) === String(customerId));
        const customerDisplayName = customerToDelete?.name || customerToDelete?.lead_code || `ID: ${customerId}`;
        if (confirm(`คุณต้องการลบลูกค้า "${customerDisplayName}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
            ui.showLoading(true);
            try {
                await api.deleteCustomer(customerId);
                state.customers = state.customers.filter(c => String(c.id) !== String(customerId));
                // Recalculate pagination potentially needed if deleting from last page
                const totalPages = Math.ceil(state.filteredCustomers.length / state.pagination.pageSize);
                if (state.pagination.currentPage > totalPages) {
                     state.pagination.currentPage = totalPages > 0 ? totalPages : 1;
                }
                updateVisibleData();
                ui.showStatus('ลบข้อมูลสำเร็จ', false);
            } catch (error) {
                console.error("Error deleting customer:", error);
                ui.showStatus('ลบข้อมูลไม่สำเร็จ: ' + error.message, true);
            } finally {
                ui.showLoading(false);
            }
        }
    }
    state.contextMenuRowId = null;
}


document.addEventListener('DOMContentLoaded', () => {
    if (window.supabase && window.supabase.createClient && window.ui && window.api) {
        initializeApp();
        setupEventListeners();
    } else {
        console.error("Critical dependencies not loaded.");
        document.body.innerHTML = '<div style="color: red; padding: 20px;">Error loading application components. Please refresh.</div>';
    }
});
