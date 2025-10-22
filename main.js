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
 * Normalizes date string to YYYY-MM-DD format, handling different inputs and timezones safely.
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
        // Wait briefly for dependencies if needed (though script order should handle this)
        await new Promise(resolve => setTimeout(resolve, 50));
        if (!window.supabaseClient || !window.api || !window.ui) {
            throw new Error('Dependencies (Supabase, API, UI) not loaded correctly.');
        }

        ui.renderTableHeaders(); // Render headers early
        const session = await api.getSession();
        if (!session) { window.location.replace('login.html'); return; } // Redirect if not logged in
        let userProfile = await api.getUserProfile(session.user.id);
        if (!userProfile) userProfile = await api.createDefaultUserProfile(session.user);
        // Ensure userProfile exists before proceeding
        if (!userProfile) throw new Error('Failed to load or create user profile.');

        state.currentUser = { id: session.user.id, ...userProfile };
        window.state = state; // Make state globally accessible
        ui.updateUIAfterLogin(state.currentUser); // Update header UI
        const [customers, salesList] = await Promise.all([
            api.fetchAllCustomers(),
            api.fetchSalesList()
        ]);

        // Normalize dates after fetching
        (customers || []).forEach(c => {
            c.date = normalizeDateStringToYYYYMMDD(c.date);
            c.old_appointment = normalizeDateStringToYYYYMMDD(c.old_appointment);
            c.appointment_date = normalizeDateStringToYYYYMMDD(c.appointment_date);
            c.closed_date = normalizeDateStringToYYYYMMDD(c.closed_date);
        });
        state.customers = customers || [];
        state.salesList = salesList || [];

        // Populate filter dropdowns
        const statuses = [...new Set(state.customers.map(c => c.last_status).filter(Boolean))].sort();
        ui.populateFilterDropdown('salesFilter', state.salesList);
        ui.populateFilterDropdown('statusFilter', statuses);
        ui.populateFilterDropdown('channelFilter', DROPDOWN_OPTIONS.channel);
        ui.populateFilterDropdown('procedureFilter', DROPDOWN_OPTIONS.procedure);

        setDateFilterPreset('all'); // Set default date filter and trigger initial render
        ui.showStatus('โหลดข้อมูลสำเร็จ', false);

    } catch (error) {
        console.error('Initialization failed:', error);
        ui.showStatus('เกิดข้อผิดพลาดในการโหลด: ' + error.message, true);
        // Display a user-friendly error message instead of replacing the whole body
        const errorDiv = document.createElement('div');
        errorDiv.style.color = 'red'; errorDiv.style.padding = '20px'; errorDiv.style.backgroundColor = '#fff';
        errorDiv.style.margin = '20px'; errorDiv.style.borderRadius = '8px';
        errorDiv.textContent = `Initialization failed: ${error.message}. Please refresh or contact support.`;
        // Check if body exists before prepending
        if(document.body) {
            document.body.prepend(errorDiv); // Add error message at the top
        } else {
             // Fallback if body isn't ready somehow
             alert(`Initialization failed: ${error.message}. Please refresh.`);
        }
    } finally {
        ui.showLoading(false);
    }
}


function updateVisibleData() {
    const customers = Array.isArray(state.customers) ? state.customers : [];

    // --- Sorting ---
    const sortedCustomers = [...customers].sort((a, b) => {
        const { column, direction } = state.sort;
        const valA = a[column] || ''; // Use empty string for null/undefined
        const valB = b[column] || '';

        // Handle Date and Lead Code sorting specifically
        if (['date', 'closed_date', 'lead_code'].includes(column)) {
            // Numeric sort for lead_code if possible
            if(column === 'lead_code') {
                const numA = parseInt(valA, 10);
                const numB = parseInt(valB, 10);
                // Only sort numerically if both parse successfully
                if (!isNaN(numA) && !isNaN(numB)) {
                    if (numA < numB) return direction === 'asc' ? -1 : 1;
                    if (numA > numB) return direction === 'asc' ? 1 : -1;
                    return 0; // Equal numbers
                }
                // Fallback to string sort if parsing fails for either value
            } else { // Date sorting
                // Compare dates as UTC timestamps for consistency
                const dateA = new Date(valA + 'T00:00:00Z');
                const dateB = new Date(valB + 'T00:00:00Z');
                const timeA = dateA.getTime();
                const timeB = dateB.getTime();

                // Handle invalid dates (treat NaN as Infinity or -Infinity based on sort direction)
                const effectiveTimeA = isNaN(timeA) ? (direction === 'asc' ? Infinity : -Infinity) : timeA;
                const effectiveTimeB = isNaN(timeB) ? (direction === 'asc' ? Infinity : -Infinity) : timeB;

                if (effectiveTimeA < effectiveTimeB) return direction === 'asc' ? -1 : 1;
                if (effectiveTimeA > effectiveTimeB) return direction === 'asc' ? 1 : -1;
                return 0; // Equal dates or both invalid
            }
        }

        // Default string sort (case-insensitive) for other columns
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return direction === 'asc' ? -1 : 1;
        if (strA > strB) return direction === 'asc' ? 1 : -1;
        return 0; // Equal strings
    });

    // --- Filtering ---
    let filtered = sortedCustomers; // Start with sorted data

    // Date Range Filter
    if (state.dateFilter.startDate && state.dateFilter.endDate) {
        filtered = filtered.filter(c => {
            // Ensure customer has a date and it falls within the range
            return c.date && c.date >= state.dateFilter.startDate && c.date <= state.dateFilter.endDate;
        });
    }

    // Other Filters (Search, Status, Sales, Channel, Procedure)
    const { search, status, sales, channel, procedure } = state.activeFilters;
    if (search || status || sales || channel || procedure) { // Apply only if any filter is active
        const lowerCaseSearch = search.toLowerCase();
        filtered = filtered.filter(customer => {
            const searchableText = `${customer.name || ''} ${customer.phone || ''} ${customer.lead_code || ''}`.toLowerCase();
            const matchesSearch = !search || searchableText.includes(lowerCaseSearch);
            const matchesStatus = !status || (customer.last_status || '').trim() === status;
            const matchesSales = !sales || customer.sales === sales;
            const matchesChannel = !channel || customer.channel === channel;
            const matchesProcedure = !procedure || customer.procedure === procedure;
            return matchesSearch && matchesStatus && matchesSales && matchesChannel && matchesProcedure;
        });
    }

    state.filteredCustomers = filtered; // Update the state with the final filtered list

    // --- Pagination ---
    const { currentPage, pageSize } = state.pagination;
    const totalRecords = state.filteredCustomers.length;
    const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / pageSize) : 1; // Ensure totalPages is at least 1
    // Correct currentPage if it's out of bounds after filtering
    const validCurrentPage = Math.max(1, Math.min(currentPage, totalPages));
    if (validCurrentPage !== currentPage) {
        console.log(`Adjusting currentPage from ${currentPage} to ${validCurrentPage}`);
        state.pagination.currentPage = validCurrentPage; // Correct the state
    }
    const startIndex = (validCurrentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedCustomers = state.filteredCustomers.slice(startIndex, endIndex);

    // --- Rendering ---
    ui.renderTable(paginatedCustomers, validCurrentPage, pageSize);
    ui.renderPaginationControls(totalPages, validCurrentPage, totalRecords, pageSize);
    ui.updateSortIndicator(state.sort.column, state.sort.direction);
    updateDashboardStats(); // Update stats based on filtered data
}


function updateDashboardStats() {
    const dataSet = state.filteredCustomers; // Stats based on current filter
    const totalCustomersEl = document.getElementById('totalCustomers');
    const todayCustomersEl = document.getElementById('todayCustomers');
    const pendingCustomersEl = document.getElementById('pendingCustomers');
    const closedDealsEl = document.getElementById('closedDeals');

    if(totalCustomersEl) totalCustomersEl.textContent = dataSet.length;

    const today = new Date().toISOString().split('T')[0];
    if(todayCustomersEl) todayCustomersEl.textContent = dataSet.filter(c => c.date === today).length;
    if(pendingCustomersEl) pendingCustomersEl.textContent = dataSet.filter(c => c.status_1 === 'ตามต่อ').length;
    if(closedDealsEl) closedDealsEl.textContent = dataSet.filter(c => c.status_1 === 'ปิดการขาย' && c.last_status === '100%' && c.closed_amount).length;
}

function setDateFilterPreset(preset) {
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date(today);

    switch(preset) {
        case '7d': startDate.setUTCDate(today.getUTCDate() - 6); break; // Use UTC dates
        case '30d': startDate.setUTCDate(today.getUTCDate() - 29); break;
        case 'today': startDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())); break;
        case 'all': default: startDate = null; endDate = null; break;
    }

    if (startDate) startDate.setUTCHours(0, 0, 0, 0);
    if (endDate) endDate.setUTCHours(23, 59, 59, 999);

    const startDateString = startDate ? startDate.toISOString().split('T')[0] : '';
    const endDateString = endDate ? endDate.toISOString().split('T')[0] : '';

    state.dateFilter = { startDate: startDateString, endDate: endDateString, preset };

    const startInput = document.getElementById('startDateFilter');
    const endInput = document.getElementById('endDateFilter');
    if (startInput) startInput.value = startDateString;
    if (endInput) endInput.value = endDateString;

    document.querySelectorAll('.btn-date-filter[data-preset]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === preset);
    });
    const clearButton = document.getElementById('clearDateFilter');
    if (clearButton) clearButton.classList.toggle('active', preset === 'all');

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

async function handleProcessCSV() {
    const csvFileInput = document.getElementById('csvFile');
    const importStatus = document.getElementById('importStatus');
    if (!csvFileInput || !csvFileInput.files || csvFileInput.files.length === 0) {
        if (importStatus) { importStatus.textContent = 'กรุณาเลือกไฟล์ CSV'; importStatus.style.color = 'red'; }
        return;
    }
    const file = csvFileInput.files[0];
    if (importStatus) { importStatus.textContent = 'กำลังประมวลผลไฟล์...'; importStatus.style.color = 'inherit'; }
    ui.showLoading(true);

    try {
        const fileContent = await file.text();
        const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) throw new Error('ไฟล์ CSV ต้องมีอย่างน้อย 1 Header และ 1 บรรทัดข้อมูล');

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const requiredHeaders = ['name', 'phone', 'channel', 'sales'];
        const missingHeaders = requiredHeaders.filter(req => !headers.includes(req));
        if (missingHeaders.length > 0) throw new Error(`ไฟล์ CSV ขาด Header ที่จำเป็น: ${missingHeaders.join(', ')}`);

        let csvLeadCodeCounter = 1236; // Start counter specific to this CSV import
        const customersToInsert = [];
        const todayStr = new Date().toISOString().split('T')[0];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
            if (values.length === 0 || values.every(v => v === '')) continue;
            if (values.length !== headers.length) { console.warn(`Skipping line ${i + 1}: Column count mismatch.`); continue; }

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
                    if (requiredHeaders.includes(header) && value !== '') hasEssentialData = true;
                }
            });

            if (!hasEssentialData && !customer.name && !customer.phone) {
                console.warn(`Skipping line ${i + 1}: Missing essential data (name or phone).`);
                continue;
            }

            customer.name = customer.name || `ลูกค้า #${i}`;
            customer.phone = customer.phone || 'N/A';
            customer.channel = customer.channel || 'ไม่ระบุ';
            customer.sales = customer.sales || state.currentUser?.username || 'N/A';
            customer.date = customer.date || todayStr;
            customer.lead_code = csvLeadCodeCounter.toString(); // Use CSV counter
            csvLeadCodeCounter++;

            customersToInsert.push(customer);
        }

        if (customersToInsert.length === 0) throw new Error('ไม่พบข้อมูลลูกค้าที่ถูกต้องในไฟล์ CSV');

        if (importStatus) importStatus.textContent = `กำลังนำเข้า ${customersToInsert.length} รายการ...`;
        await api.bulkInsertCustomers(customersToInsert);

        ui.showStatus(`นำเข้าข้อมูล ${customersToInsert.length} รายการสำเร็จ!`, false);
        ui.hideModal('importModal');
        initializeApp(); // Refresh data

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
    document.getElementById('importBtn')?.addEventListener('click', handleProcessCSV);
    document.getElementById('refreshButton')?.addEventListener('click', () => {
        state.activeFilters = { search: '', status: '', sales: '', channel: '', procedure: '' };
        document.querySelectorAll('.filter-select, .search-input').forEach(el => el.value = '');
        setDateFilterPreset('all'); // Resets date and triggers updateVisibleData
    });

    // Filters
    document.getElementById('searchInput')?.addEventListener('input', debounce(e => {
        state.activeFilters.search = e.target.value; state.pagination.currentPage = 1; updateVisibleData();
    }));
    ['statusFilter', 'salesFilter', 'channelFilter', 'procedureFilter'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', e => {
            state.activeFilters[id.replace('Filter', '')] = e.target.value; state.pagination.currentPage = 1; updateVisibleData();
        });
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
            const currentPage = state.pagination.currentPage;
            const totalPages = Math.ceil(state.filteredCustomers.length / state.pagination.pageSize) || 1;
            let newPage = currentPage;
            if (page === 'prev' && currentPage > 1) newPage--;
            else if (page === 'next' && currentPage < totalPages) newPage++;
            else if (page !== 'prev' && page !== 'next') newPage = parseInt(page);
            if (newPage !== currentPage) { state.pagination.currentPage = newPage; updateVisibleData(); }
        }
    });
    document.getElementById('paginationContainer')?.addEventListener('change', event => {
        if (event.target.id === 'pageSize') {
            state.pagination.pageSize = parseInt(event.target.value); state.pagination.currentPage = 1; updateVisibleData();
        }
    });

    // Table Interaction
    const tableBody = document.getElementById('tableBody');
    tableBody?.addEventListener('click', handleTableClick);
    tableBody?.addEventListener('contextmenu', handleContextMenu);

    // Context Menu
    const contextMenu = document.getElementById('contextMenu');
    contextMenu?.addEventListener('click', handleContextMenuItemClick);
    window.addEventListener('click', (event) => { if (contextMenu && !contextMenu.contains(event.target) && !event.target.closest('tr[data-id]')) { ui.hideContextMenu(); } });

    // Modals
    document.getElementById('submitStatusUpdateBtn')?.addEventListener('click', handleSubmitStatusUpdate);
    document.getElementById('editCustomerForm')?.addEventListener('submit', handleSaveEditForm);
    document.getElementById('closeEditModalBtn')?.addEventListener('click', hideEditModal);
    document.getElementById('cancelEditBtn')?.addEventListener('click', hideEditModal);
    document.querySelectorAll('[data-modal-close]').forEach(btn => btn.addEventListener('click', () => ui.hideModal(btn.dataset.modalClose)));

    // Table Header Sorting
    const tableHeader = document.querySelector('#excelTable thead');
    tableHeader?.addEventListener('click', event => { const headerCell = event.target.closest('th[data-sortable]'); if (headerCell) handleSort(headerCell.dataset.sortable); });
}


function handleSort(column) {
    if (state.sort.column === column) {
        state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        state.sort.column = column;
        state.sort.direction = 'desc'; // Default desc
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
        } else { ui.showStatus('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด', true); }
    } else if (!start && !end && state.dateFilter.preset !== 'all') {
         setDateFilterPreset('all');
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
        default: return [...specialStatuses]; // Can stay or change special status
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

// Handles saving data from the Edit Modal
async function handleSaveEditForm(event) {
    event.preventDefault();
    if (!state.editingCustomerId) return;

    const form = event.target;
    const formData = new FormData(form);
    const updatedData = {};
    for (const [key, value] of formData.entries()) {
        updatedData[key] = typeof value === 'string' ? value.trim() : value;
    }

    // --- [FIXED] Validate required 'date' field ONLY for Admins ---
    const userRole = (state.currentUser?.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'administrator';

    if (!updatedData.date && isAdmin) { // Check if 'date' is empty AND user is Admin
        ui.showStatus('กรุณากรอก "วัน/เดือน/ปี"', true);
        const dateInput = form.querySelector('[name="date"]');
        if (dateInput) dateInput.focus();
        return; // Stop submission ONLY if Admin and date is empty
    }
    // --- End Validation Fix ---

    // Normalize dates AFTER checking required field (for Admin)
    updatedData.date = normalizeDateStringToYYYYMMDD(updatedData.date);
    updatedData.old_appointment = normalizeDateStringToYYYYMMDD(updatedData.old_appointment);
    updatedData.appointment_date = normalizeDateStringToYYYYMMDD(updatedData.appointment_date);
    updatedData.closed_date = normalizeDateStringToYYYYMMDD(updatedData.closed_date);

    // Re-check normalized 'date' ONLY if Admin (because it might become null)
    if (!updatedData.date && isAdmin) {
        ui.showStatus('รูปแบบ "วัน/เดือน/ปี" ไม่ถูกต้อง หรือวันที่ยังไม่ได้กรอก', true);
        const dateInput = form.querySelector('[name="date"]');
        if (dateInput) dateInput.focus();
        return;
    }

    const originalCustomer = state.customers.find(c => String(c.id) === String(state.editingCustomerId));
    if (!originalCustomer) { ui.showStatus('Error: ไม่พบข้อมูลลูกค้าเดิม', true); return; }

    // --- Deal Closing Logic ---
    const isNowClosing = updatedData.status_1 === 'ปิดการขาย' && updatedData.last_status === '100%' && updatedData.closed_amount;
    if (isNowClosing && !updatedData.closed_date) { // Auto-populate only if missing
        updatedData.closed_date = new Date().toISOString().split('T')[0];
        console.log(`Auto-populating closed_date: ${updatedData.closed_date}`);
    }
    const isClosingAttempt = updatedData.last_status === '100%' || updatedData.status_1 === 'ปิดการขาย' || updatedData.closed_amount;
    if (isClosingAttempt) { // Check completeness if attempting to close
        const isClosingComplete = updatedData.last_status === '100%' && updatedData.status_1 === 'ปิดการขาย' && updatedData.closed_amount;
        if (!isClosingComplete) {
            ui.showStatus('การปิดการขายต้องกรอก: Last Status (100%), Status Sale (ปิดการขาย), และ ยอดที่ปิดได้ ให้ครบถ้วน', true);
            return;
        }
    }
    // --- End Deal Closing Logic ---

    ui.showLoading(true);
    try {
        const updatedCustomer = await api.updateCustomer(state.editingCustomerId, updatedData);

        // Normalize dates from response
        updatedCustomer.date = normalizeDateStringToYYYYMMDD(updatedCustomer.date);
        updatedCustomer.old_appointment = normalizeDateStringToYYYYMMDD(updatedCustomer.old_appointment);
        updatedCustomer.appointment_date = normalizeDateStringToYYYYMMDD(updatedCustomer.appointment_date);
        updatedCustomer.closed_date = normalizeDateStringToYYYYMMDD(updatedCustomer.closed_date);

        // --- History Logging (Sales Only) ---
        if (userRole === 'sales') {
            const historyPromises = [];
            for (const [key, value] of Object.entries(updatedData)) {
                const originalValue = originalCustomer[key] ?? '';
                const newValue = value ?? '';
                // Only log if value actually changed
                if (String(originalValue) !== String(newValue)) {
                    const header = Object.keys(ui.FIELD_MAPPING).find(h => ui.FIELD_MAPPING[h]?.field === key) || key; // Safer find
                    const originalFormatted = (['date', 'old_appointment', 'appointment_date', 'closed_date'].includes(key)) ? formatDateToDMY(originalValue) : originalValue;
                    const newFormatted = (['date', 'old_appointment', 'appointment_date', 'closed_date'].includes(key)) ? formatDateToDMY(newValue) : newValue;
                    const logNote = `แก้ไข '${header}' จาก '${originalFormatted || 'ว่าง'}' เป็น '${newFormatted || 'ว่าง'}'`;
                    historyPromises.push(api.addStatusUpdate(state.editingCustomerId, 'แก้ไขข้อมูล', logNote, state.currentUser.id));
                }
            }
            if (historyPromises.length > 0) { await Promise.allSettled(historyPromises); } // Use allSettled
        }

        // --- Update Local State ---
        // Find index again in case array mutated elsewhere (unlikely but safer)
        const index = state.customers.findIndex(c => String(c.id) === String(state.editingCustomerId));
        if (index !== -1) {
             // Create a new object for immutability (optional but good practice)
             state.customers = [
                 ...state.customers.slice(0, index),
                 updatedCustomer,
                 ...state.customers.slice(index + 1),
             ];
             // Or direct mutation if preferred: state.customers[index] = updatedCustomer;
        } else {
            console.warn("Updated customer not found in local state, adding instead.");
            state.customers.push(updatedCustomer); // Add if somehow missing
        }

        hideEditModal();
        updateVisibleData(); // Refresh UI
        ui.showStatus('บันทึกข้อมูลสำเร็จ', false);

    } catch (error) {
        console.error('Save failed:', error);
        // Provide more context in error message if possible
        ui.showStatus(`บันทึกข้อมูลไม่สำเร็จ: ${error.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'}`, true);
    } finally {
        ui.showLoading(false);
    }
}


async function handleLogout() {
    if (confirm('ต้องการออกจากระบบหรือไม่?')) {
        await api.signOut();
        window.location.replace('login.html');
    }
}

async function handleAddCustomer() {
    const leadCodeInput = prompt("กรุณาระบุ 'ลำดับที่' (Lead Code) สำหรับลูกค้าใหม่:\n\n(หากต้องการให้ระบบรันเลขอัตโนมัติ ให้เว้นว่างไว้)", "");
    if (leadCodeInput === null) return; // User cancelled

    ui.showLoading(true);
    try {
        const newCustomer = await api.addCustomer(state.currentUser?.username || 'N/A', leadCodeInput);
        if (newCustomer) {
            await api.addStatusUpdate(newCustomer.id, 'สร้างลูกค้าใหม่', `สร้างโดย ${state.currentUser?.username || 'System'}`, state.currentUser?.id || null);

            const now = new Date();
            newCustomer.call_time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            newCustomer.date = normalizeDateStringToYYYYMMDD(newCustomer.date); // Normalize date from API
            newCustomer.old_appointment = null; // Set defaults
            newCustomer.appointment_date = null;
            newCustomer.closed_date = null;

            state.customers.unshift(newCustomer); // Add to local state
            updateVisibleData(); // Update UI
            showEditModal(newCustomer.id); // Open edit modal
            ui.showStatus('เพิ่มลูกค้าใหม่สำเร็จ กรุณากรอกข้อมูล', false);
        } else {
            throw new Error("API did not return new customer data.");
        }
    } catch (error) {
        console.error("Error adding customer:", error);
        ui.showStatus(`เพิ่มลูกค้าไม่สำเร็จ: ${error.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'}`, true);
    } finally {
        ui.showLoading(false);
    }
}


function handleTableClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button || button.disabled) return;

    const action = button.dataset.action;
    const row = button.closest('tr[data-id]');
    const id = row?.dataset.id;
    if (!id) return;

    const customer = state.customers.find(c => String(c.id) === String(id));
    if (!customer) { ui.showStatus('ไม่พบข้อมูลลูกค้าสำหรับ ID นี้', true); return; }

    if (action === 'edit-customer') showEditModal(id);
    if (action === 'update-status') showUpdateStatusModal(customer);
    if (action === 'view-history') handleViewHistory(id, customer.name || customer.lead_code);
}


async function handleViewHistory(customerId, customerName) {
    ui.showModal('historyModal', { customerName: customerName || 'N/A' });
    const timelineContainer = document.getElementById('historyTimelineContainer');
    if (timelineContainer) timelineContainer.innerHTML = '<p>กำลังโหลดประวัติ...</p>';
    ui.showLoading(true);
    try {
        const historyData = await api.fetchStatusHistory(customerId);
        ui.renderHistoryTimeline(historyData);
    } catch (error) {
        console.error("Error fetching history:", error);
        ui.showStatus('ไม่สามารถโหลดประวัติได้: ' + error.message, true);
        if(timelineContainer) timelineContainer.innerHTML = `<p style="color: red;">เกิดข้อผิดพลาด: ${error.message}</p>`;
    } finally {
        ui.showLoading(false);
    }
}

async function handleSubmitStatusUpdate() {
    const customerId = document.getElementById('modalCustomerId')?.value;
    const newStatus = document.getElementById('modalStatusSelect')?.value;
    const notes = document.getElementById('modalNotesText')?.value.trim();

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
        const customer = state.customers.find(c => String(c.id) === String(customerId));

        // Attempt to auto-set closed_date if applicable via quick update
        if (newStatus === 'ปิดการขาย' && customer && customer.last_status === '100%' && customer.closed_amount && !customer.closed_date) {
            updateData.closed_date = new Date().toISOString().split('T')[0];
            console.log(`Auto-populating closed_date via status update: ${updateData.closed_date}`);
        }

        await api.addStatusUpdate(customerId, newStatus, notes, state.currentUser.id);
        const updatedCustomer = await api.updateCustomer(customerId, updateData);

        updatedCustomer.date = normalizeDateStringToYYYYMMDD(updatedCustomer.date);
        updatedCustomer.old_appointment = normalizeDateStringToYYYYMMDD(updatedCustomer.old_appointment);
        updatedCustomer.appointment_date = normalizeDateStringToYYYYMMDD(updatedCustomer.appointment_date);
        updatedCustomer.closed_date = normalizeDateStringToYYYYMMDD(updatedCustomer.closed_date);

        // Update local state (more robustly)
        const index = state.customers.findIndex(c => String(c.id) === String(customerId));
        if (index !== -1) {
             state.customers = [
                 ...state.customers.slice(0, index),
                 updatedCustomer,
                 ...state.customers.slice(index + 1),
             ];
        } else { state.customers.push(updatedCustomer); }


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
    const menuItem = event.target.closest('.context-menu-item[data-action]');
    if (!menuItem) return;

    const action = menuItem.dataset.action;
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
                // Remove from local state AFTER successful API call
                state.customers = state.customers.filter(c => String(c.id) !== String(customerId));
                // Adjust pagination if current page becomes empty
                const totalRecordsNow = state.filteredCustomers.length -1; // Predict new count based on *filtered* list
                const pageSize = state.pagination.pageSize;
                const totalPages = Math.max(1, Math.ceil(totalRecordsNow / pageSize));
                if (state.pagination.currentPage > totalPages) {
                     state.pagination.currentPage = totalPages;
                }
                updateVisibleData(); // Refresh table
                ui.showStatus('ลบข้อมูลสำเร็จ', false);
            } catch (error) {
                console.error("Error deleting customer:", error);
                ui.showStatus('ลบข้อมูลไม่สำเร็จ: ' + error.message, true);
            } finally {
                ui.showLoading(false);
            }
        }
    }
    state.contextMenuRowId = null; // Clear ID after action
}


// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    if (window.supabase && window.supabase.createClient && typeof ui === 'object' && typeof api === 'object') {
        initializeApp();
        setupEventListeners();
    } else {
        console.error("Critical dependencies (Supabase, UI, API) not found.");
        // Avoid replacing body if possible, show an alert or a banner
         const banner = document.createElement('div');
         banner.style.backgroundColor = 'red'; banner.style.color = 'white'; banner.style.padding = '10px';
         banner.style.textAlign = 'center'; banner.style.position = 'fixed'; banner.style.top = '0';
         banner.style.left = '0'; banner.style.width = '100%'; banner.style.zIndex = '9999';
         banner.textContent = 'Error loading application components. Please refresh.';
         document.body.prepend(banner);
        // document.body.innerHTML = '<div style="color: red; padding: 20px;">Error loading application components. Please refresh.</div>';
    }
});
