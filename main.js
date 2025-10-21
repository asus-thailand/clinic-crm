// ================================================================================
// BEAUTY CLINIC CRM - MAIN ORCHESTRATOR (FINAL COMPLETE VERSION - UNTRUNCATED)
// ================================================================================

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Ensure ui object is available before calling showStatus
    if (window.ui && typeof window.ui.showStatus === 'function') {
        ui.showStatus('เกิดข้อผิดพลาดที่ไม่คาดคิดในระบบ', true);
    }
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
    editingCustomerId: null,
    contextMenuRowId: null // Added for context menu state
};

// [MODIFIED] อัปเดตตัวเลือก Dropdown ตามที่ร้องขอ
const DROPDOWN_OPTIONS = {
    channel: [
        "เพื่อนแนะนำ/", "Walk-In/", "PHONE-IN/", "Line@/", "Fbc By หมอธีร์ (ปลูกผม)",
        "Fbc By หมอธีร์ (หัตถการอื่น)", "FBC HAIR CLINIC", "Fbc ตาสองชั้น ยกคิ้ว เสริมจมูก",
        "Fbc ปรับรูปหน้า Botox Filler HIFU", "เว็บไซต์", "AGENCY", "IG", "Tiktok ", "FMBC"
    ],
    procedure: [
        "ตา Dr.T", "ตาทีมแพทย์", "ปลูกผม", "ปลูกหนวด/เครา", "ปลูกคิ้ว", "FaceLift",
        "จมูก/ปาก/คาง", "Thermage", "Ultraformer", "Filler", "BOTOX", "Laser กำจัดขน",
        "SKIN อื่น ๆ", "ตา Dr.T/ปลูกผม", "ตา/SKIN", "ผม/SKIN", "ตา/อื่นๆ", "ผม/อื่นๆ",
        "ตาทีมแพทย์/ปลูกผม"
    ],
    confirm_y: ["Y", "N"],
    transfer_100: ["Y", "N"],
    status_1: ["status 1", "status 2", "status 3", "status 4", "ไม่สนใจ", "ปิดการขาย", "ตามต่อ"],
    cs_confirm: ["CSX", "CSY"],
    last_status: ["100%", "75%", "50%", "25%", "0%", "ONLINE", "เคส OFF"]
};

const SALES_EDITABLE_FIELDS = [
    'update_access', 'last_status', 'status_1', 'reason',
    'etc', 'hn_customer', 'old_appointment', 'dr', 'closed_amount', 'appointment_date'
];

/**
 * Normalizes various date string formats into 'YYYY-MM-DD'.
 * Handles DD/MM/YYYY, Buddhist Era years, and standard JS Date parsing.
 * @param {string|null} dateStr The date string to normalize.
 * @returns {string|null} The normalized date string or null if invalid.
 */
function normalizeDateStringToYYYYMMDD(dateStr) {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') return null; // Added trim check

    // Check for YYYY-MM-DD format first
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        // Basic validation for sanity
        const [year, month, day] = dateStr.split('-').map(Number);
        if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) return null;
        return dateStr;
    }

    // Handle DD/MM/YYYY (including Buddhist Era)
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            let year = parseInt(parts[2], 10);

            if (isNaN(year) || isNaN(parseInt(month)) || isNaN(parseInt(day))) return null;

            if (year > 2500) year -= 543; // Convert from Buddhist year if needed
            if (year < 1900 || year > 2100 || parseInt(month) < 1 || parseInt(month) > 12 || parseInt(day) < 1 || parseInt(day) > 31) return null; // Validate range

            // Simple check for day validity based on month (doesn't handle leap years perfectly but prevents major errors)
            const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
            if (parseInt(day) > daysInMonth[parseInt(month) - 1]) return null;

            return `${year}-${month}-${day}`;
        }
    }

    // Attempt to parse other formats using Date constructor (use UTC methods to avoid timezone issues)
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null; // Invalid date result
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        if (year < 1900 || year > 2100) return null; // Validate year range after parsing
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.warn(`Could not parse date string: ${dateStr}`, e);
        return null;
    }
}

/**
 * Initializes the application: checks session, fetches data, renders UI.
 */
async function initializeApp() {
    console.log('Starting app initialization...');
    // Ensure UI elements exist before showing loading
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) ui.showLoading(true);

    try {
        // Dependency checks
        if (!window.supabaseClient || !window.api || !window.ui) {
            throw new Error('Core dependencies (Supabase, API, UI) not loaded.');
        }

        ui.renderTableHeaders(); // Render headers early

        // Check user session
        const session = await api.getSession();
        if (!session) {
            window.location.replace('login.html');
            return; // Stop execution if not logged in
        }

        // Fetch or create user profile
        let userProfile = await api.getUserProfile(session.user.id);
        if (!userProfile) {
            userProfile = await api.createDefaultUserProfile(session.user);
        }
        state.currentUser = { id: session.user.id, ...userProfile };
        window.state = state; // Make state globally accessible (consider alternatives for larger apps)
        ui.updateUIAfterLogin(state.currentUser);

        // Fetch initial data
        const [customers, salesList] = await Promise.all([
            api.fetchAllCustomers(),
            api.fetchSalesList()
        ]);

        // Normalize dates immediately after fetching
        (customers || []).forEach(c => {
            c.date = normalizeDateStringToYYYYMMDD(c.date);
            c.old_appointment = normalizeDateStringToYYYYMMDD(c.old_appointment);
            c.appointment_date = normalizeDateStringToYYYYMMDD(c.appointment_date);
            // Ensure numeric fields are numbers if needed for sorting/calculation
            c.closed_amount = c.closed_amount ? parseFloat(String(c.closed_amount).replace(/,/g, '')) : null;
             c.deposit = c.deposit ? parseFloat(String(c.deposit).replace(/,/g, '')) : null;
        });

        state.customers = customers || [];
        state.salesList = salesList || [];

        // Populate filter dropdowns
        const uniqueStatuses = [...new Set(state.customers.map(c => c.last_status).filter(Boolean))].sort();
        ui.populateFilterDropdown('salesFilter', state.salesList);
        ui.populateFilterDropdown('statusFilter', uniqueStatuses);

        setDateFilterPreset('all'); // Set default date filter and trigger initial render
        updateVisibleData(); // Render data

        ui.showStatus('โหลดข้อมูลสำเร็จ', false);

    } catch (error) {
        console.error('Initialization failed:', error);
        if (window.ui && typeof window.ui.showStatus === 'function') {
            ui.showStatus('เกิดข้อผิดพลาดในการโหลด: ' + error.message, true);
        }
        // Display a more user-friendly error message if initialization fails
        document.body.innerHTML = `<div style="color: red; padding: 20px; font-family: sans-serif;">เกิดข้อผิดพลาดในการโหลดแอปพลิเคชัน: ${error.message}. กรุณาลองรีเฟรชหน้า หรือติดต่อผู้ดูแลระบบ</div>`;
    } finally {
        if (loadingOverlay) ui.showLoading(false);
    }
}

/**
 * Filters, sorts, paginates, and renders the customer data table and controls.
 */
function updateVisibleData() {
    // Ensure state.customers is always an array
    const customers = Array.isArray(state.customers) ? state.customers : [];

    // 1. Sorting
    const sortedCustomers = [...customers].sort((a, b) => {
        const { column, direction } = state.sort;
        const valA = a[column] ?? ''; // Use nullish coalescing for safer defaults
        const valB = b[column] ?? '';

        // Handle date sorting specifically
        if (column === 'date') {
            // Treat invalid/null dates as earliest/latest depending on sort order?
            // For simplicity, treat them as equal or put them at the end.
            const dateA = valA ? new Date(valA) : null;
            const dateB = valB ? new Date(valB) : null;

            if (dateA && dateB) {
                 if (dateA < dateB) return direction === 'asc' ? -1 : 1;
                 if (dateA > dateB) return direction === 'asc' ? 1 : -1;
                 return 0;
            } else if (dateA) {
                return direction === 'asc' ? 1 : -1; // Valid dates come after nulls in asc, before in desc
            } else if (dateB) {
                return direction === 'asc' ? -1 : 1;
            }
            return 0; // Both null or invalid
        }

        // Handle numeric sorting for potential numeric fields
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
             if (numA < numB) return direction === 'asc' ? -1 : 1;
             if (numA > numB) return direction === 'asc' ? 1 : -1;
             return 0;
        }

        // Default to locale-aware string comparison
        return direction === 'asc'
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
    });

    // 2. Date Filtering
    let dateFiltered = sortedCustomers;
    if (state.dateFilter.startDate && state.dateFilter.endDate) {
        dateFiltered = sortedCustomers.filter(c => {
            if (!c.date) return false; // Skip if date is invalid/null
            return c.date >= state.dateFilter.startDate && c.date <= state.dateFilter.endDate;
        });
    }

    // 3. Text/Select Filtering
    const { search, status, sales } = state.activeFilters;
    const lowerCaseSearch = search.toLowerCase().trim(); // Trim search input

    state.filteredCustomers = dateFiltered.filter(customer => {
        // Search across multiple fields
        const searchableText = [
            customer.name,
            customer.phone,
            customer.lead_code
        ].join(' ').toLowerCase();
        const matchesSearch = !lowerCaseSearch || searchableText.includes(lowerCaseSearch);

        // Filter by status and sales (handle empty strings)
        const matchesStatus = !status || (customer.last_status || '').trim() === status;
        const matchesSales = !sales || customer.sales === sales;

        return matchesSearch && matchesStatus && matchesSales;
    });

    // 4. Pagination
    const { currentPage, pageSize } = state.pagination;
    const totalRecords = state.filteredCustomers.length;
    const totalPages = Math.ceil(totalRecords / pageSize);
    // Ensure currentPage is valid
    state.pagination.currentPage = Math.max(1, Math.min(currentPage, totalPages || 1));

    const startIndex = (state.pagination.currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedCustomers = state.filteredCustomers.slice(startIndex, endIndex);

    // 5. Rendering
    ui.renderTable(paginatedCustomers, state.pagination.currentPage, pageSize);
    ui.renderPaginationControls(totalPages, state.pagination.currentPage, totalRecords, pageSize);
    ui.updateSortIndicator(state.sort.column, state.sort.direction);
    updateDashboardStats();
}

/**
 * Updates the KPI cards based on the currently filtered customer data.
 */
function updateDashboardStats() {
    const dataSet = state.filteredCustomers; // Use filtered data for dashboard stats
    document.getElementById('totalCustomers').textContent = dataSet.length.toLocaleString(); // Format number
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('todayCustomers').textContent = dataSet.filter(c => c.date === today).length.toLocaleString();
    document.getElementById('pendingCustomers').textContent = dataSet.filter(c => c.status_1 === 'ตามต่อ').length.toLocaleString();

    // --- [MODIFIED] Use updated condition for closed deals ---
    const closedDealsCount = dataSet.filter(c =>
        c.status_1 === 'ปิดการขาย' &&
        (c.last_status === '100%' || c.last_status === 'ONLINE') &&
        c.closed_amount // Check if closed_amount has a value (is truthy)
    ).length;
    document.getElementById('closedDeals').textContent = closedDealsCount.toLocaleString();
    // --- End modification ---
}

/**
 * Sets the date filter based on a preset ('today', '7d', '30d', 'all') and updates the UI.
 * @param {string} preset The date preset name.
 */
function setDateFilterPreset(preset) {
    const today = new Date(); let startDate = new Date(); let endDate = new Date(today);
    switch(preset) {
        case '7d': startDate.setDate(today.getDate() - 6); break;
        case '30d': startDate.setDate(today.getDate() - 29); break;
        case 'today': startDate = new Date(today); break;
        case 'all': default: startDate = null; endDate = null; break;
    }
    if (startDate) startDate.setHours(0, 0, 0, 0); if (endDate) endDate.setHours(23, 59, 59, 999);
    const startDateString = startDate ? startDate.toISOString().split('T')[0] : '';
    const endDateString = endDate ? endDate.toISOString().split('T')[0] : '';
    state.dateFilter = { startDate: startDateString, endDate: endDateString, preset };
    const startInput = document.getElementById('startDateFilter'); if (startInput) startInput.value = startDateString;
    const endInput = document.getElementById('endDateFilter'); if (endInput) endInput.value = endDateString;
    document.querySelectorAll('.btn-date-filter').forEach(btn => btn.classList.toggle('active', btn.dataset.preset === preset));
    const clearButton = document.getElementById('clearDateFilter'); if (clearButton) clearButton.classList.toggle('active', preset === 'all');
    state.pagination.currentPage = 1;
    updateVisibleData();
}

/**
 * Debounce function to limit the rate at which a function can fire.
 * @param {Function} func The function to debounce.
 * @param {number} [delay=300] The debounce delay in milliseconds.
 * @returns {Function} The debounced function.
 */
function debounce(func, delay = 300) { let timeoutId; return (...args) => { clearTimeout(timeoutId); timeoutId = setTimeout(() => { func.apply(this, args); }, delay); }; }

/**
 * Handles clicks on the Import button, checking permissions and showing the modal.
 */
function handleImportClick() {
    const userRole = (state.currentUser?.role || '').toLowerCase();
    // Allow only admin/administrator roles
    if (!['admin', 'administrator'].includes(userRole)) {
        ui.showStatus('เฉพาะ Administrator เท่านั้นที่สามารถนำเข้าข้อมูลได้', true);
        return;
    }
    ui.showModal('importModal');
    // Reset file input and status message when opening modal
    const csvFileInput = document.getElementById('csvFile'); if (csvFileInput) csvFileInput.value = '';
    const importStatus = document.getElementById('importStatus'); if (importStatus) importStatus.textContent = '';
}

/**
 * Processes the selected CSV file for bulk customer import.
 */
async function handleProcessCSV() {
    const csvFileInput = document.getElementById('csvFile');
    const importStatus = document.getElementById('importStatus');

    if (!csvFileInput?.files?.length) { // Simplified check
        if (importStatus) { importStatus.textContent = 'กรุณาเลือกไฟล์ CSV'; importStatus.style.color = 'red'; }
        return;
    }

    const file = csvFileInput.files[0];
    if (importStatus) importStatus.textContent = 'กำลังประมวลผลไฟล์...';
    ui.showLoading(true);

    try {
        const fileContent = await file.text();
        const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== ''); // More robust line splitting

        if (lines.length < 2) throw new Error('ไฟล์ CSV ต้องมีอย่างน้อย 1 Header และ 1 บรรทัดข้อมูล');

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, '')); // Clean headers
        const requiredHeaders = ['name', 'phone', 'channel', 'sales'];
        const missingHeaders = requiredHeaders.filter(req => !headers.includes(req));
        if (missingHeaders.length > 0) throw new Error(`ไฟล์ CSV ขาด Header: ${missingHeaders.join(', ')}`);

        let currentLeadCode = await api.getLatestLeadCode();
        if (isNaN(currentLeadCode)) { currentLeadCode = 1000; } // Ensure starting number

        const customersToInsert = [];
        const todayStr = new Date().toISOString().split('T')[0];

        for (let i = 1; i < lines.length; i++) {
            // Robust CSV parsing considering quoted fields
            const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));

            if (values.length === 0 || values.every(v => v === '')) continue; // Skip empty lines
            if (values.length !== headers.length) {
                console.warn(`Skipping CSV line ${i + 1}: Column count mismatch. Expected ${headers.length}, got ${values.length}.`);
                continue; // Skip lines with wrong column count
            }

            const customer = {};
            let hasEssentialData = false;
            headers.forEach((header, index) => {
                const value = values[index] ?? ''; // Use nullish coalescing
                const fieldConfig = Object.values(ui.FIELD_MAPPING).find(config => config.field === header);
                if (fieldConfig?.field) { // Map only known fields
                    if (['date', 'old_appointment', 'appointment_date'].includes(header)) {
                        customer[header] = normalizeDateStringToYYYYMMDD(value); // Will be null if invalid
                    } else if (['deposit', 'closed_amount'].includes(header)) {
                         // Attempt to parse numeric fields, keep null if invalid
                         const numValue = parseFloat(String(value).replace(/,/g, ''));
                         customer[header] = isNaN(numValue) ? null : numValue;
                    }
                    else {
                        customer[header] = value;
                    }
                    if (requiredHeaders.includes(header) && value.trim() !== '') { hasEssentialData = true; }
                }
            });

            // Skip if essential data seems missing (e.g., only commas)
            if (!hasEssentialData && !customer.name && !customer.phone) {
                console.warn(`Skipping CSV line ${i + 1}: Row seems empty or lacks essential data.`);
                continue;
            }

            // Apply defaults for required fields if still missing/invalid
            customer.name = customer.name || `ลูกค้านำเข้า #${i}`;
            customer.phone = customer.phone || 'N/A';
            customer.channel = customer.channel || 'ไม่ระบุ';
            customer.sales = customer.sales || state.currentUser?.username || 'SystemImport'; // Assign to current user or a default
            customer.date = customer.date || todayStr; // Default date if missing/invalid

            // Assign unique lead_code
            currentLeadCode++;
            customer.lead_code = currentLeadCode.toString();

            customersToInsert.push(customer);
        }

        if (customersToInsert.length === 0) throw new Error('ไม่พบข้อมูลลูกค้าที่ถูกต้องสำหรับนำเข้าในไฟล์ CSV');

        if (importStatus) importStatus.textContent = `กำลังนำเข้า ${customersToInsert.length} รายการ...`;
        await api.bulkInsertCustomers(customersToInsert);

        ui.showStatus(`นำเข้า ${customersToInsert.length} รายการสำเร็จ!`, false);
        ui.hideModal('importModal');
        initializeApp(); // Reload all data

    } catch (error) {
        console.error('CSV Import Error:', error);
        ui.showStatus(`นำเข้าไม่สำเร็จ: ${error.message}`, true);
        if (importStatus) { importStatus.textContent = `เกิดข้อผิดพลาด: ${error.message}`; importStatus.style.color = 'red'; }
    } finally {
        ui.showLoading(false);
    }
}

/**
 * Sets up all main event listeners for the application UI.
 */
function setupEventListeners() {
    // Header buttons
    document.getElementById('logoutButton')?.addEventListener('click', handleLogout);
    document.getElementById('importButton')?.addEventListener('click', handleImportClick); // Import button in header
    document.getElementById('refreshButton')?.addEventListener('click', () => {
        // Reset filters before reloading
        state.activeFilters = { search: '', status: '', sales: '' };
        const searchInput = document.getElementById('searchInput'); if (searchInput) searchInput.value = '';
        const statusFilter = document.getElementById('statusFilter'); if (statusFilter) statusFilter.value = '';
        const salesFilter = document.getElementById('salesFilter'); if (salesFilter) salesFilter.value = '';
        setDateFilterPreset('all'); // This updates UI and calls updateVisibleData
        // If initializeApp is needed for full refresh (e.g., fetch new sales list):
        // initializeApp();
    });

    // Toolbar elements
    document.getElementById('addUserButton')?.addEventListener('click', handleAddCustomer);
    document.getElementById('searchInput')?.addEventListener('input', debounce(e => {
        state.activeFilters.search = e.target.value; state.pagination.currentPage = 1; updateVisibleData();
    }));
    document.getElementById('statusFilter')?.addEventListener('change', e => {
        state.activeFilters.status = e.target.value; state.pagination.currentPage = 1; updateVisibleData();
    });
    document.getElementById('salesFilter')?.addEventListener('change', e => {
        state.activeFilters.sales = e.target.value; state.pagination.currentPage = 1; updateVisibleData();
    });

    // Date filters
    document.querySelectorAll('.btn-date-filter[data-preset]').forEach(button => {
        button.addEventListener('click', () => setDateFilterPreset(button.dataset.preset));
    });
    document.getElementById('clearDateFilter')?.addEventListener('click', () => setDateFilterPreset('all'));
    const debouncedDateChange = debounce(handleCustomDateChange, 500);
    document.getElementById('startDateFilter')?.addEventListener('change', debouncedDateChange);
    document.getElementById('endDateFilter')?.addEventListener('change', debouncedDateChange);

    // Pagination controls
    document.getElementById('paginationContainer')?.addEventListener('click', event => {
        const button = event.target.closest('button[data-page]');
        if (button) {
            const page = button.dataset.page;
            const totalPages = Math.ceil(state.filteredCustomers.length / state.pagination.pageSize);
            if (page === 'prev' && state.pagination.currentPage > 1) state.pagination.currentPage--;
            else if (page === 'next' && state.pagination.currentPage < totalPages) state.pagination.currentPage++;
            else if (!isNaN(parseInt(page))) state.pagination.currentPage = parseInt(page);
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

    // Table body interactions
    const tableBody = document.getElementById('tableBody');
    tableBody?.addEventListener('click', handleTableClick);
    tableBody?.addEventListener('contextmenu', handleContextMenu);

    // Context menu
    const contextMenu = document.getElementById('contextMenu');
    contextMenu?.addEventListener('click', handleContextMenuItemClick);
    window.addEventListener('click', (event) => { // Hide context menu on outside click
        if (contextMenu && !contextMenu.contains(event.target)) { ui.hideContextMenu(); }
    });

    // Modal close buttons (using a common data attribute)
    document.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.addEventListener('click', () => ui.hideModal(btn.dataset.modalClose));
    });

    // Table header sorting
    const tableHeader = document.querySelector('#excelTable thead');
    tableHeader?.addEventListener('click', (event) => {
        const headerCell = event.target.closest('th[data-sortable]');
        if (headerCell) { handleSort(headerCell.dataset.sortable); }
    });

    // Modal specific actions
    document.getElementById('submitStatusUpdateBtn')?.addEventListener('click', handleSubmitStatusUpdate);
    document.getElementById('editCustomerForm')?.addEventListener('submit', handleSaveEditForm);
    document.getElementById('closeEditModalBtn')?.addEventListener('click', hideEditModal); // Close button inside edit modal
    document.getElementById('cancelEditBtn')?.addEventListener('click', hideEditModal); // Cancel button inside edit modal
    document.getElementById('importBtn')?.addEventListener('click', handleProcessCSV); // Process CSV button inside import modal
}


// ======================================================================
// Handlers for UI Interactions and Data Manipulation
// ======================================================================

/** Handles changing the sort column and direction. */
function handleSort(column) {
    if (state.sort.column === column) {
        state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        state.sort.column = column;
        state.sort.direction = 'desc'; // Default to desc for new column
    }
    updateVisibleData(); // Re-render with new sort order
}

/** Handles changes in the custom date range inputs. */
function handleCustomDateChange() {
    let start = document.getElementById('startDateFilter').value;
    let end = document.getElementById('endDateFilter').value;
    // Only update if both dates are present and valid range
    if (start && end) {
        if (start <= end) {
            state.dateFilter = { startDate: start, endDate: end, preset: 'custom' };
            state.pagination.currentPage = 1;
            // Deactivate preset buttons
            document.querySelectorAll('.btn-date-filter[data-preset]').forEach(btn => btn.classList.remove('active'));
            document.getElementById('clearDateFilter')?.classList.remove('active'); // Also deactivate 'All'
            updateVisibleData();
        } else {
            ui.showStatus('วันที่เริ่มต้นต้องมาก่อนวันที่สิ้นสุด', true);
            // Optionally revert inputs to previous valid state or clear them
        }
    } else if (start || end) {
        // User has only selected one date, prompt them to select both
        ui.showStatus('กรุณาเลือกทั้งวันที่เริ่มต้นและสิ้นสุดสำหรับช่วงที่กำหนดเอง', true);
    }
    // If both are empty, do nothing (handled by preset buttons)
}

/** Determines the allowed next statuses based on the current status for non-admin users. */
function getAllowedNextStatuses(currentStatus) {
    const specialStatuses = ["ไม่สนใจ", "ปิดการขาย", "ตามต่อ"];
    const baseStatuses = ["status 1", "status 2", "status 3", "status 4"]; // Assuming these are linear
    const currentIndex = baseStatuses.indexOf(currentStatus);

    if (!currentStatus || currentStatus.trim() === '') {
        return [baseStatuses[0], ...specialStatuses]; // Start from status 1
    }
    if (specialStatuses.includes(currentStatus)) {
        return [...specialStatuses]; // Can switch between special statuses
    }
    if (currentIndex > -1 && currentIndex < baseStatuses.length - 1) {
        // Allow next linear status + special statuses
        return [baseStatuses[currentIndex + 1], ...specialStatuses];
    }
    if (currentIndex === baseStatuses.length - 1) {
        // Last linear status, only allow special statuses
        return [...specialStatuses];
    }
    // Fallback if status is unknown/invalid
    return [baseStatuses[0], ...specialStatuses];
}

/** Shows the modal for updating a customer's status. */
function showUpdateStatusModal(customer) {
    const select = document.getElementById('modalStatusSelect');
    if (!select) return;

    const userRole = (state.currentUser?.role || 'sales').toLowerCase();
    const isAdmin = ['admin', 'administrator'].includes(userRole);
    let allowedStatuses = isAdmin ? DROPDOWN_OPTIONS.status_1 : getAllowedNextStatuses(customer.status_1);

    // Populate dropdown
    select.innerHTML = '<option value="">-- เลือกสถานะ --</option>'; // Clear existing
    allowedStatuses.forEach(opt => {
        const optionEl = document.createElement('option');
        optionEl.value = opt; optionEl.textContent = opt;
        select.appendChild(optionEl);
    });

    // Pre-fill notes
    const notesTextArea = document.getElementById('modalNotesText');
    if (notesTextArea) notesTextArea.value = customer.reason || ''; // Use 'reason' field for notes

    // Show modal with context
    ui.showModal('statusUpdateModal', {
        customerId: customer.id,
        customerName: customer.name || customer.lead_code || 'N/A'
    });
}

/** Shows the modal for editing a customer's details. */
function showEditModal(customerId) {
    // Find customer data using a robust comparison
    const customer = state.customers.find(c => String(c.id) === String(customerId));
    if (!customer) {
        ui.showStatus(`ไม่พบข้อมูลลูกค้า (ID: ${customerId})`, true);
        return;
    }
    state.editingCustomerId = customerId;
    // Build the form content dynamically
    ui.buildEditForm(customer, state.currentUser, SALES_EDITABLE_FIELDS, state.salesList, DROPDOWN_OPTIONS);
    // Show the modal
    const modal = document.getElementById('editCustomerModal');
    if (modal) modal.classList.add('show');
}

/** Hides the edit customer modal and clears its state. */
function hideEditModal() {
    state.editingCustomerId = null;
    const modal = document.getElementById('editCustomerModal');
    if (modal) modal.classList.remove('show');
    // Clear the form content to prevent stale data flashing
    const form = document.getElementById('editCustomerForm');
    if (form) form.innerHTML = '';
}

/** Handles the submission of the edit customer form. */
async function handleSaveEditForm(event) {
    event.preventDefault(); // Prevent default form submission
    if (!state.editingCustomerId) return;

    const form = event.target;
    const formData = new FormData(form);
    const updatedData = {};
    for (const [key, value] of formData.entries()) {
        // Basic sanitization or transformation can happen here if needed
        updatedData[key] = value;
    }

    // Normalize date fields before sending to backend/comparison
    updatedData.date = normalizeDateStringToYYYYMMDD(updatedData.date);
    updatedData.old_appointment = normalizeDateStringToYYYYMMDD(updatedData.old_appointment);
    updatedData.appointment_date = normalizeDateStringToYYYYMMDD(updatedData.appointment_date);
    // Parse numeric fields
    updatedData.closed_amount = updatedData.closed_amount ? parseFloat(String(updatedData.closed_amount).replace(/,/g, '')) : null;
    updatedData.deposit = updatedData.deposit ? parseFloat(String(updatedData.deposit).replace(/,/g, '')) : null;


    // Fetch original customer data for comparison and logging history
    const originalCustomer = state.customers.find(c => String(c.id) === String(state.editingCustomerId));
    if (!originalCustomer) {
        ui.showStatus('ข้อผิดพลาด: ไม่พบข้อมูลลูกค้าเดิมสำหรับเปรียบเทียบ', true);
        return;
    }

    // --- [MODIFIED] Updated validation logic for closing a deal ---
    if (updatedData.status_1 === 'ปิดการขาย') {
         // Check all required fields for a closed deal
         if (!updatedData.closed_amount || // Check if null, undefined, 0, or empty string after parsing
             !(updatedData.last_status === '100%' || updatedData.last_status === 'ONLINE')) {
             ui.showStatus('การปิดการขายต้องกรอก: ยอดที่ปิดได้ (> 0) และ Last Status (100% หรือ ONLINE)', true);
             return; // Stop if closing data is incomplete
         }
    }
    // --- End modification ---

    ui.showLoading(true);
    try {
        // Send update request to the API
        const updatedCustomer = await api.updateCustomer(state.editingCustomerId, updatedData);

        // Ensure dates returned from API are also normalized (API should ideally handle this)
        updatedCustomer.date = normalizeDateStringToYYYYMMDD(updatedCustomer.date);
        updatedCustomer.old_appointment = normalizeDateStringToYYYYMMDD(updatedCustomer.old_appointment);
        updatedCustomer.appointment_date = normalizeDateStringToYYYYMMDD(updatedCustomer.appointment_date);
        updatedCustomer.closed_amount = updatedCustomer.closed_amount ? parseFloat(String(updatedCustomer.closed_amount).replace(/,/g, '')) : null;
        updatedCustomer.deposit = updatedCustomer.deposit ? parseFloat(String(updatedCustomer.deposit).replace(/,/g, '')) : null;


        // Log history changes if the user is a 'sales' role
        const userRole = (state.currentUser?.role || '').toLowerCase();
        if (userRole === 'sales') {
            const historyPromises = [];
            for (const [key, value] of Object.entries(updatedData)) {
                // Careful comparison, considering null/undefined/empty string variations
                const originalValue = originalCustomer[key] ?? '';
                const newValue = value ?? ''; // Use value from updatedData before API return for exact comparison
                if (String(originalValue) !== String(newValue)) {
                    const header = Object.keys(ui.FIELD_MAPPING).find(h => ui.FIELD_MAPPING[h].field === key) || key;
                    // Format values for readability in log
                    const formattedOriginal = (originalValue === null || originalValue === '') ? 'ว่าง' : originalValue;
                    const formattedNew = (newValue === null || newValue === '') ? 'ว่าง' : newValue;
                    const logNote = `แก้ไข '${header}' จาก '${formattedOriginal}' เป็น '${formattedNew}'`;
                    historyPromises.push(api.addStatusUpdate(state.editingCustomerId, 'แก้ไขข้อมูล', logNote, state.currentUser.id));
                }
            }
            // Execute all history additions concurrently
            if (historyPromises.length > 0) { await Promise.all(historyPromises); }
        }

        // Update the customer data in the local state array
        const index = state.customers.findIndex(c => String(c.id) === String(state.editingCustomerId));
        if (index !== -1) {
            state.customers[index] = updatedCustomer; // Replace existing
        } else {
            console.warn("Edited customer not found in local state, adding instead.");
            state.customers.push(updatedCustomer); // Fallback: Add if not found
        }

        hideEditModal();       // Close the modal
        updateVisibleData();   // Refresh the table display
        ui.showStatus('บันทึกข้อมูลสำเร็จ', false); // Show success message

    } catch (error) {
        console.error('Save failed:', error);
        ui.showStatus('บันทึกข้อมูลไม่สำเร็จ: ' + error.message, true); // Show error message
    } finally {
        ui.showLoading(false); // Hide loading indicator
    }
}

/** Handles the logout button click. */
async function handleLogout() {
    if (confirm('ต้องการออกจากระบบหรือไม่?')) {
        try {
            await api.signOut();
            window.location.replace('login.html'); // Redirect to login page
        } catch (error) {
             console.error("Logout failed:", error);
             ui.showStatus('ออกจากระบบไม่สำเร็จ: ' + error.message, true);
        }
    }
}

/** Handles the add customer button click. */
async function handleAddCustomer() {
    ui.showLoading(true);
    try {
        // Call API to add customer and get the next lead code
        const newCustomer = await api.addCustomer(state.currentUser?.username || 'System'); // Default user if none found
        if (newCustomer) {
            // Log the creation event in history
            await api.addStatusUpdate(
                newCustomer.id,
                'สร้างลูกค้าใหม่', // Status for history
                'ระบบสร้าง Lead อัตโนมัติ', // Note
                state.currentUser.id
            );

            // Populate initial call_time (which is actually creation time)
            const now = new Date();
            newCustomer.call_time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            // Ensure date is normalized (API should return it normalized, but double-check)
            newCustomer.date = normalizeDateStringToYYYYMMDD(newCustomer.date);

            // Add the new customer to the beginning of the local state array
            state.customers.unshift(newCustomer);

            updateVisibleData(); // Refresh the table
            showEditModal(newCustomer.id); // Open the edit modal immediately
            ui.showStatus('เพิ่มลูกค้าใหม่สำเร็จ กรุณากรอกข้อมูล', false);
        } else {
             throw new Error("ไม่ได้รับข้อมูลลูกค้าใหม่หลังจากสร้าง");
        }
    } catch (error) {
        console.error("Error adding customer:", error);
        ui.showStatus('เพิ่มลูกค้าไม่สำเร็จ: ' + error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

/** Handles clicks within the table body (edit, update status, view history). */
function handleTableClick(event) {
    const target = event.target;
    const actionButton = target.closest('button[data-action]'); // Find the closest button with an action
    if (!actionButton || actionButton.disabled) return; // Ignore if not a button or disabled

    const action = actionButton.dataset.action;
    const row = target.closest('tr[data-id]');
    const id = row?.dataset.id;
    if (!id) return; // No customer ID found on the row

    // Find the customer data locally
    const customer = state.customers.find(c => String(c.id) === String(id));
    if (!customer) {
        ui.showStatus('ไม่พบข้อมูลลูกค้าสำหรับแถวนี้', true);
        return;
    }

    // Perform action based on button clicked
    switch (action) {
        case 'edit-customer':
            showEditModal(id);
            break;
        case 'update-status':
            showUpdateStatusModal(customer);
            break;
        case 'view-history':
            handleViewHistory(id, customer.name);
            break;
        // Add other actions if needed
    }
}

/** Fetches and displays the status history for a customer. */
async function handleViewHistory(customerId, customerName) {
    ui.showModal('historyModal', { customerName: customerName || 'N/A' });
    ui.showLoading(true); // Consider a modal-specific loader?
    const historyContainer = document.getElementById('historyTimelineContainer');
    if (historyContainer) historyContainer.innerHTML = '<p>กำลังโหลดประวัติ...</p>'; // Placeholder

    try {
        const historyData = await api.fetchStatusHistory(customerId);
        ui.renderHistoryTimeline(historyData); // Render the fetched data
    } catch (error) {
        console.error("Error fetching history:", error);
        ui.showStatus('ไม่สามารถโหลดประวัติได้: ' + error.message, true);
        // Display error within the modal
        if (historyContainer) historyContainer.innerHTML = `<p style="color: red;">เกิดข้อผิดพลาด: ${error.message}</p>`;
    } finally {
        ui.showLoading(false);
    }
}

/** Handles the submission of the status update modal. */
async function handleSubmitStatusUpdate() {
    const customerId = document.getElementById('modalCustomerId').value;
    const newStatus = document.getElementById('modalStatusSelect').value;
    const notes = document.getElementById('modalNotesText').value.trim();

    // Validations
    if (!customerId) { ui.showStatus('ไม่พบ ID ลูกค้า', true); return; }
    if (!newStatus) { ui.showStatus('กรุณาเลือกสถานะ', true); return; }
    const requiresReason = ["status 1", "status 2", "status 3", "status 4"].includes(newStatus);
    if (requiresReason && !notes) { ui.showStatus('สำหรับ Status 1-4 กรุณากรอกเหตุผล/บันทึกเพิ่มเติม', true); return; }

    ui.showLoading(true);
    try {
        const updateData = { status_1: newStatus, reason: notes };

        // 1. Add entry to history table
        await api.addStatusUpdate(customerId, newStatus, notes, state.currentUser.id);

        // 2. Update the main customer record
        const updatedCustomer = await api.updateCustomer(customerId, updateData);

        // Ensure dates are normalized on the returned object
        updatedCustomer.date = normalizeDateStringToYYYYMMDD(updatedCustomer.date);
        updatedCustomer.old_appointment = normalizeDateStringToYYYYMMDD(updatedCustomer.old_appointment);
        updatedCustomer.appointment_date = normalizeDateStringToYYYYMMDD(updatedCustomer.appointment_date);
        updatedCustomer.closed_amount = updatedCustomer.closed_amount ? parseFloat(String(updatedCustomer.closed_amount).replace(/,/g, '')) : null;
        updatedCustomer.deposit = updatedCustomer.deposit ? parseFloat(String(updatedCustomer.deposit).replace(/,/g, '')) : null;


        // 3. Update local state
        const index = state.customers.findIndex(c => String(c.id) === String(customerId));
        if (index !== -1) { state.customers[index] = updatedCustomer; }
        else { state.customers.push(updatedCustomer); console.warn("Updated customer not found in state, adding.");} // Fallback

        updateVisibleData(); // Refresh the main table
        ui.hideModal('statusUpdateModal'); // Close the modal
        ui.showStatus('อัปเดตสถานะสำเร็จ', false); // Show success

    } catch (error) {
        console.error("Error submitting status update:", error);
        ui.showStatus("เกิดข้อผิดพลาดในการอัปเดต: " + error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

/** Handles right-clicks on the table body to show the context menu for admins. */
function handleContextMenu(event) {
    const row = event.target.closest('tr[data-id]'); // Target only rows with data-id
    if (!row?.dataset?.id) return; // Exit if not on a valid data row

    const userRole = (state.currentUser?.role || 'sales').toLowerCase();
    // Only allow admins/administrators to open context menu
    if (!['admin', 'administrator'].includes(userRole)) {
        // Optionally prevent default browser menu even for non-admins if desired
        // event.preventDefault();
        return;
    }

    event.preventDefault(); // Prevent default browser menu for admins
    state.contextMenuRowId = row.dataset.id; // Store the ID of the right-clicked row
    ui.showContextMenu(event); // Show the custom context menu
}

/** Handles clicks on items within the custom context menu. */
async function handleContextMenuItemClick(event) {
    const menuItem = event.target.closest('.context-menu-item[data-action]');
    if (!menuItem) return; // Clicked outside an action item

    const action = menuItem.dataset.action;
    const customerId = state.contextMenuRowId; // Retrieve the stored ID

    if (!action || !customerId) return; // Should not happen if menu shown correctly

    ui.hideContextMenu(); // Hide menu immediately

    // Handle 'delete' action
    if (action === 'delete') {
        const customerToDelete = state.customers.find(c => String(c.id) === String(customerId));
        // Show confirmation dialog
        if (confirm(`คุณต้องการลบลูกค้า "${customerToDelete?.name || 'รายนี้'}" (ID: ${customerId}) ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
            ui.showLoading(true);
            try {
                await api.deleteCustomer(customerId);
                // Remove from local state
                state.customers = state.customers.filter(c => String(c.id) !== String(customerId));
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
    // Add handlers for other potential context menu actions (copy, paste, etc.)
    // else if (action === 'copy') { ... }

    state.contextMenuRowId = null; // Clear the stored ID after action
}


// ================================================================================
// APPLICATION STARTUP
// ================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Check if essential global objects exist before initializing
    if (window.supabase && typeof window.supabase.createClient === 'function' && window.ui && window.api) {
        initializeApp(); // Fetch data and render UI
        setupEventListeners(); // Attach event listeners
    } else {
        // Log error and display a message to the user if dependencies failed to load
        console.error("Critical application dependencies (Supabase, UI, API) failed to load.");
        document.body.innerHTML = '<div style="color: red; padding: 20px; font-family: sans-serif;">เกิดข้อผิดพลาดร้ายแรง: ไม่สามารถโหลดส่วนประกอบหลักของแอปพลิเคชันได้ กรุณาตรวจสอบ Console Log หรือลองรีเฟรชหน้า</div>';
    }
});
