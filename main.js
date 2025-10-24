// ================================================================================
// BEAUTY CLINIC CRM - MAIN ORCHESTRATOR (FINAL VERSION with CSV Import & Updated Dropdowns)
// [FIXED] handleProcessCSV lead_code logic updated by Senior Developer
// [MODIFIED] Deal closing logic now includes 'ONLINE' status by Senior Developer
// [FIXED] normalizeDateStringToYYYYMMDD now correctly returns formattedDate for BE years
// ================================================================================

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Avoid showing status if ui object isn't ready yet
    if (window.ui && typeof window.ui.showStatus === 'function') {
        ui.showStatus('เกิดข้อผิดพลาดที่ไม่คาดคิดในระบบ', true);
    }
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
        "เพื่อนแนะนำ",
        "Walk-In",
        "PHONE-IN",
        "Line@",
        "Fbc By หมอธีร์ (ปลูกผม)",
        "Fbc By หมอธีร์ (หัตถการอื่น)",
        "FBC HAIR CLINIC",
        "Fbc ตาสองชั้น ยกคิ้ว เสริมจมูก",
        "Fbc ปรับรูปหน้า Botox Filler HIFU",
        "เว็บไซต์",
        "AGENCY",
        "IG",
        "Tiktok",
        "FMBC"
    ],
    procedure: [
        "ตา Dr.T", "ตาทีมแพทย์", "ปลูกผม", "ปลูกหนวด/เครา", "ปลูกคิ้ว",
        "FaceLift", "จมูก/ปาก/คาง", "Thermage", "Ultraformer", "Filler",
        "BOTOX", "Laser กำจัดขน", "SKIN อื่น ๆ", "ตา Dr.T/ปลูกผม", "ตา/SKIN",
        "ผม/SKIN", "ตา/อื่นๆ", "ผม/อื่นๆ", "ตาทีมแพทย์/ปลูกผม"
    ],
    confirm_y: ["Y", "N"],
    status_1: ["status 1", "status 2", "status 3", "status 4", "ไม่สนใจ", "ปิดการขาย", "ตามต่อ"],
    cs_confirm: ["CSX", "CSY"],
    last_status: ["100%", "75%", "50%", "25%", "0%", "ONLINE", "เคส OFF"]
};

// Fields editable by Sales role (in addition to status_1 and reason handled separately)
const SALES_EDITABLE_FIELDS = [
    'update_access', 'last_status', 'reason', // Reason implicitly editable with status_1
    'etc', 'hn_customer', 'old_appointment', 'dr', 'closed_amount', 'appointment_date',
    'closed_date' // Added closed_date
];


/**
 * Normalizes various date string formats (YYYY-MM-DD, DD/MM/YYYY) to YYYY-MM-DD.
 * Returns null for invalid formats or dates outside the extended range (1800-2200).
 * Handles timezone issues by always working with UTC internally.
 */
function normalizeDateStringToYYYYMMDD(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    dateStr = dateStr.trim();

    // Check YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const date = new Date(dateStr + 'T00:00:00Z'); // Parse as UTC
        // Validate date object and ensure ISO string starts correctly (handles invalid dates like 2024-02-30)
        if (!isNaN(date.getTime()) && date.toISOString().startsWith(dateStr)) {
             return dateStr;
        }
    }

    // Check DD/MM/YYYY format
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            let year = parseInt(parts[2], 10);

            // Convert Buddhist year if necessary
            if (year > 2500) year -= 543;

            // Extended year range validation
            if (year < 1800 || year > 2200) return null;

            const formattedDate = `${year}-${month}-${day}`;
            // Validate the constructed YYYY-MM-DD string as a UTC date
            const date = new Date(formattedDate + 'T00:00:00Z');
            if (!isNaN(date.getTime()) && date.toISOString().startsWith(formattedDate)) {
                 // [BUG FIXED] คืนค่าที่แปลงเป็น YYYY-MM-DD แล้ว
                 return formattedDate;
            }
        }
    }

    // console.warn(`Invalid or unhandled date format: ${dateStr}. Returning null.`); // Reduce console noise
    return null; // Return null if format is not recognized or invalid
}


/**
 * Initializes the application: loads dependencies, fetches initial data, populates UI.
 */
async function initializeApp() {
    console.log('Starting app initialization...');
    // Ensure UI exists before showing loading
    if (window.ui && typeof window.ui.showLoading === 'function') {
        ui.showLoading(true);
    }

    try {
        // Wait briefly for Supabase client to initialize from config.js
        await new Promise(resolve => {
             let checks = 0;
             const interval = setInterval(() => {
                 checks++;
                 if (window.supabaseClient || checks > 50) { // Timeout after ~2.5s
                     clearInterval(interval);
                     resolve();
                 }
             }, 50);
        });

        // Verify all critical dependencies are loaded
        if (!window.supabaseClient || !window.api || !window.ui) {
            throw new Error('Dependencies (Supabase, API, UI) not loaded correctly.');
        }

        ui.renderTableHeaders(); // Render table structure first

        // Check user session
        const session = await api.getSession();
        if (!session) {
            window.location.replace('login.html'); // Redirect to login if no session
            return;
        }

        // Fetch user profile, create if missing
        let userProfile = await api.getUserProfile(session.user.id);
        if (!userProfile) {
            userProfile = await api.createDefaultUserProfile(session.user);
        }
        if (!userProfile) { // Still no profile? Critical error.
             throw new Error('Failed to load or create user profile.');
        }

        // Set global state
        state.currentUser = { id: session.user.id, ...userProfile };
        window.state = state; // Make state globally accessible (needed by UI functions)
        ui.updateUIAfterLogin(state.currentUser); // Update header UI

        // Fetch initial data (customers and sales list) in parallel
        const [customers, salesList] = await Promise.all([
            api.fetchAllCustomers(),
            api.fetchSalesList()
        ]);

        // Normalize dates in fetched customer data
        (customers || []).forEach(c => {
            c.date = normalizeDateStringToYYYYMMDD(c.date);
            c.old_appointment = normalizeDateStringToYYYYMMDD(c.old_appointment);
            c.appointment_date = normalizeDateStringToYYYYMMDD(c.appointment_date);
            c.closed_date = normalizeDateStringToYYYYMMDD(c.closed_date);
        });
        state.customers = customers || []; // Ensure state.customers is always an array
        state.salesList = salesList || []; // Ensure state.salesList is always an array

        // Populate filter dropdowns based on fetched data and constants
        const statuses = [...new Set(state.customers.map(c => c.last_status).filter(Boolean))].sort();
        ui.populateFilterDropdown('salesFilter', state.salesList);
        ui.populateFilterDropdown('statusFilter', statuses);
        ui.populateFilterDropdown('channelFilter', DROPDOWN_OPTIONS.channel);
        ui.populateFilterDropdown('procedureFilter', DROPDOWN_OPTIONS.procedure);

        setDateFilterPreset('all'); // Apply default filter ("all") and trigger first data render
        ui.showStatus('โหลดข้อมูลสำเร็จ', false);

    } catch (error) {
        console.error('Initialization failed:', error);
        // Show error message gracefully
        if (window.ui && typeof window.ui.showStatus === 'function') {
            ui.showStatus('เกิดข้อผิดพลาดในการโหลด: ' + error.message, true);
        }
        // Display a banner message instead of replacing the whole body
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'color: red; padding: 20px; background-color: #fff; margin: 20px; border-radius: 8px; border: 1px solid red;';
        errorDiv.textContent = `Initialization failed: ${error.message}. Please refresh or contact support.`;
        if(document.body) {
            document.body.prepend(errorDiv); // Add error message at the top
        } else {
             // Fallback if body isn't ready
             alert(`Initialization failed: ${error.message}. Please refresh.`);
        }
    } finally {
        // Ensure loading is hidden even if errors occurred
        if (window.ui && typeof window.ui.showLoading === 'function') {
            ui.showLoading(false);
        }
    }
}


/**
 * Updates the visible data in the table based on current filters, sorting, and pagination.
 */
function updateVisibleData() {
    const customers = Array.isArray(state.customers) ? state.customers : [];

    // --- Sorting ---
    const sortedCustomers = [...customers].sort((a, b) => {
        const { column, direction } = state.sort;
        const valA = a[column] ?? ''; // Use ?? for null/undefined -> empty string
        const valB = b[column] ?? '';

        // Specific sorting logic for dates and potentially numeric lead_code
        if (['date', 'closed_date', 'lead_code'].includes(column)) {
            // Try numeric sort for lead_code
            if(column === 'lead_code') {
                const numA = parseInt(valA, 10);
                const numB = parseInt(valB, 10);
                // Only sort numerically if both parse successfully
                if (!isNaN(numA) && !isNaN(numB)) {
                    if (numA < numB) return direction === 'asc' ? -1 : 1;
                    if (numA > numB) return direction === 'asc' ? 1 : -1;
                    return 0; // Equal numbers
                }
                // Fallback to string sort if one or both aren't pure numbers
            } else { // Date sorting
                const dateA = new Date(valA + 'T00:00:00Z'); // Compare as UTC
                const dateB = new Date(valB + 'T00:00:00Z');
                const timeA = dateA.getTime();
                const timeB = dateB.getTime();

                // Handle invalid dates (NaN) - sort them to the end consistently
                const effectiveTimeA = isNaN(timeA) ? (direction === 'asc' ? Infinity : -Infinity) : timeA;
                const effectiveTimeB = isNaN(timeB) ? (direction === 'asc' ? Infinity : -Infinity) : timeB;

                if (effectiveTimeA < effectiveTimeB) return direction === 'asc' ? -1 : 1;
                if (effectiveTimeA > effectiveTimeB) return direction === 'asc' ? 1 : -1;
                return 0; // Equal or both invalid
            }
        }

        // Default: Case-insensitive string comparison for all other columns
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return direction === 'asc' ? -1 : 1;
        if (strA > strB) return direction === 'asc' ? 1 : -1;
        return 0; // Strings are equal
    });

    // --- Filtering ---
    let filtered = sortedCustomers; // Start with sorted data

    // 1. Date Range Filter (applied first)
    if (state.dateFilter.startDate && state.dateFilter.endDate) {
        filtered = filtered.filter(c => {
            // Customer must have a date, and it must be within the selected range
            return c.date && c.date >= state.dateFilter.startDate && c.date <= state.dateFilter.endDate;
        });
    }

    // 2. Other Filters (Search, Status, Sales, Channel, Procedure)
    const { search, status, sales, channel, procedure } = state.activeFilters;
    // Apply filtering only if at least one filter is active
    if (search || status || sales || channel || procedure) {
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

    state.filteredCustomers = filtered; // Update state with the final list

    // --- Pagination ---
    const { currentPage, pageSize } = state.pagination;
    const totalRecords = state.filteredCustomers.length;
    const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / pageSize) : 1; // Ensure totalPages >= 1

    // Adjust currentPage if it becomes invalid after filtering (e.g., was on page 5, now only 3 pages exist)
    const validCurrentPage = Math.max(1, Math.min(currentPage, totalPages));
    if (validCurrentPage !== currentPage) {
        console.log(`Adjusting currentPage from ${currentPage} to ${validCurrentPage} due to filtering.`);
        state.pagination.currentPage = validCurrentPage; // Correct the state value
    }

    // Calculate slice indices based on the potentially corrected currentPage
    const startIndex = (validCurrentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedCustomers = state.filteredCustomers.slice(startIndex, endIndex);

    // --- Rendering ---
    // Render the table with the paginated subset of data
    ui.renderTable(paginatedCustomers, validCurrentPage, pageSize);
    // Render pagination controls based on total filtered records and current page
    ui.renderPaginationControls(totalPages, validCurrentPage, totalRecords, pageSize);
    // Update sort indicators in table header
    ui.updateSortIndicator(state.sort.column, state.sort.direction);
    // Update dashboard KPI cards based on the filtered data
    updateDashboardStats();
}


/**
 * Updates the KPI cards based on the currently filtered customer data.
 */
function updateDashboardStats() {
    const dataSet = state.filteredCustomers; // Stats based on current filter
    const totalCustomersEl = document.getElementById('totalCustomers');
    const todayCustomersEl = document.getElementById('todayCustomers');
    const pendingCustomersEl = document.getElementById('pendingCustomers');
    const closedDealsEl = document.getElementById('closedDeals');

    if(totalCustomersEl) totalCustomersEl.textContent = dataSet.length;

    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    if(todayCustomersEl) todayCustomersEl.textContent = dataSet.filter(c => c.date === today).length;
    if(pendingCustomersEl) pendingCustomersEl.textContent = dataSet.filter(c => c.status_1 === 'ตามต่อ').length;
    
    // [MODIFIED] Count closed deals based on new criteria (100% OR ONLINE)
    if(closedDealsEl) closedDealsEl.textContent = dataSet.filter(
        c => c.status_1 === 'ปิดการขาย' && (c.last_status === '100%' || c.last_status === 'ONLINE') && c.closed_amount
    ).length;
}

/**
 * Sets the date filter based on a preset ('today', '7d', '30d', 'all') and updates the UI.
 */
function setDateFilterPreset(preset) {
    const today = new Date(); // Current date
    let startDate = new Date(); // Start date, initially today
    let endDate = new Date(today); // End date, initially today

    switch(preset) {
        case '7d': startDate.setUTCDate(today.getUTCDate() - 6); break; // Last 7 days including today
        case '30d': startDate.setUTCDate(today.getUTCDate() - 29); break; // Last 30 days including today
        case 'today':
            // Set start date to the beginning of today in UTC
            startDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
            break;
        case 'all': default: startDate = null; endDate = null; break; // Clear date range
    }

    // Set time to cover the entire day(s) in UTC
    if (startDate) startDate.setUTCHours(0, 0, 0, 0);
    if (endDate) endDate.setUTCHours(23, 59, 59, 999);

    // Format dates to YYYY-MM-DD strings for state and input fields
    const startDateString = startDate ? startDate.toISOString().split('T')[0] : '';
    const endDateString = endDate ? endDate.toISOString().split('T')[0] : '';

    // Update state
    state.dateFilter = { startDate: startDateString, endDate: endDateString, preset };

    // Update date input fields
    const startInput = document.getElementById('startDateFilter');
    const endInput = document.getElementById('endDateFilter');
    if (startInput) startInput.value = startDateString;
    if (endInput) endInput.value = endDateString;

    // Update button active states
    document.querySelectorAll('.btn-date-filter[data-preset]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === preset);
    });
    const clearButton = document.getElementById('clearDateFilter'); // "All" button
    if (clearButton) clearButton.classList.toggle('active', preset === 'all');

    state.pagination.currentPage = 1; // Reset to page 1 whenever filters change
    updateVisibleData(); // Trigger data refresh and UI update
}

/**
 * Debounce function to limit the rate at which a function can fire.
 */
function debounce(func, delay = 300) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => { func.apply(this, args); }, delay);
    };
}

/**
 * Handles the click event for the main "Import" button, showing the modal.
 */
function handleImportClick() {
    // Check permissions
    const userRole = (state.currentUser?.role || '').toLowerCase();
    if (userRole !== 'admin' && userRole !== 'administrator') {
        ui.showStatus('เฉพาะ Administrator เท่านั้นที่สามารถนำเข้าข้อมูลได้', true);
        return;
    }
    // Show the import modal and clear previous state
    ui.showModal('importModal');
    const csvFileInput = document.getElementById('csvFile');
    if (csvFileInput) csvFileInput.value = ''; // Clear file input
    const importStatus = document.getElementById('importStatus');
    if (importStatus) importStatus.textContent = ''; // Clear status message
}

/**
 * [BUG FIXED] Handles processing the selected CSV file for bulk import.
 * Now dynamically determines the starting lead_code and respects lead_code in the CSV.
 */
async function handleProcessCSV() {
    const csvFileInput = document.getElementById('csvFile');
    const importStatus = document.getElementById('importStatus');

    // Basic validation: Check if a file is selected
    if (!csvFileInput?.files?.length) {
        if (importStatus) { importStatus.textContent = 'กรุณาเลือกไฟล์ CSV'; importStatus.style.color = 'red'; }
        return;
    }

    const file = csvFileInput.files[0];
    if (importStatus) { importStatus.textContent = 'กำลังประมวลผลไฟล์...'; importStatus.style.color = 'inherit'; }
    ui.showLoading(true);

    try {
        const fileContent = await file.text();
        const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== ''); // Split lines and remove empty ones

        // Validate minimum content (header + 1 data row)
        if (lines.length < 2) throw new Error('ไฟล์ CSV ต้องมีอย่างน้อย 1 Header และ 1 บรรทัดข้อมูล');

        // Parse header and validate required columns
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const requiredHeaders = ['name', 'phone', 'channel', 'sales']; // Essential headers
        const missingHeaders = requiredHeaders.filter(req => !headers.includes(req));
        if (missingHeaders.length > 0) throw new Error(`ไฟล์ CSV ขาด Header ที่จำเป็น: ${missingHeaders.join(', ')}`);

        // [BUG FIX] Fetch latest lead code *once* instead of using hardcoded 1236
        const latestLeadCodeInDB = await api.getLatestLeadCode();
        let csvLeadCodeCounter = latestLeadCodeInDB + 1; // Start counter from next available

        const customersToInsert = [];
        const todayStr = new Date().toISOString().split('T')[0]; // Default date if missing

        // Process data rows
        for (let i = 1; i < lines.length; i++) {
            // Use robust CSV parsing regex to handle quoted commas
            const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));

            // Skip empty rows or rows with mismatched column count
            if (!values.length || values.every(v => v === '')) continue;
            if (values.length !== headers.length) {
                console.warn(`Skipping line ${i + 1}: Column count mismatch (${values.length} vs ${headers.length}).`);
                continue;
            }

            const customer = {};
            let hasEssentialData = false;
            // Map CSV values to customer object keys based on FIELD_MAPPING
            headers.forEach((header, index) => {
                const value = values[index] ?? ''; // Use empty string for missing values
                const fieldConfig = Object.values(ui.FIELD_MAPPING).find(config => config.field === header);
                if (fieldConfig?.field) { // Check if the header corresponds to a known field
                    // Normalize date fields
                    if (['date', 'old_appointment', 'appointment_date', 'closed_date'].includes(header)) {
                        customer[header] = normalizeDateStringToYYYYMMDD(value);
                    } else {
                        customer[header] = value; // Assign other values directly
                    }
                    // Check if essential data is present
                    if (requiredHeaders.includes(header) && value !== '') hasEssentialData = true;
                }
            });

            // Skip row if essential data (name or phone) is missing
            if (!hasEssentialData && !customer.name && !customer.phone) {
                console.warn(`Skipping line ${i + 1}: Missing essential data (name or phone).`);
                continue;
            }

            // Apply defaults for missing non-essential data
            customer.name = customer.name || `ลูกค้า #${i}`;
            customer.phone = customer.phone || 'N/A';
            customer.channel = customer.channel || 'ไม่ระบุ';
            customer.sales = customer.sales || state.currentUser?.username || 'N/A'; // Assign to current user if missing
            customer.date = customer.date || todayStr; // Use today if date missing

            // [BUG FIX] Only assign auto-incremented lead_code IF
            // one wasn't provided in the CSV file (i.e., customer.lead_code is still falsy)
            if (!customer.lead_code) {
                customer.lead_code = csvLeadCodeCounter.toString(); // Assign sequential lead code
                csvLeadCodeCounter++; // Only increment when we use the auto-counter
            }

            customersToInsert.push(customer);
        }

        // Check if any valid customers were found
        if (customersToInsert.length === 0) throw new Error('ไม่พบข้อมูลลูกค้าที่ถูกต้องในไฟล์ CSV');

        // Perform bulk insert via API
        if (importStatus) importStatus.textContent = `กำลังนำเข้า ${customersToInsert.length} รายการ...`;
        await api.bulkInsertCustomers(customersToInsert);

        // Success: Show message, hide modal, refresh data
        ui.showStatus(`นำเข้าข้อมูล ${customersToInsert.length} รายการสำเร็จ!`, false);
        ui.hideModal('importModal');
        initializeApp(); // Re-initialize to fetch all data including new ones

    } catch (error) {
        // Handle import errors
        console.error('CSV Import Error:', error);
        ui.showStatus(`นำเข้าไม่สำเร็จ: ${error.message}`, true);
        if (importStatus) { importStatus.textContent = `เกิดข้อผิดพลาด: ${error.message}`; importStatus.style.color = 'red'; }
    } finally {
        ui.showLoading(false); // Ensure loading overlay is hidden
    }
}

/**
 * Sets up all necessary event listeners for UI elements.
 */
function setupEventListeners() {
    // Header Buttons
    document.getElementById('logoutButton')?.addEventListener('click', handleLogout);
    // Toolbar Buttons & Filters
    document.getElementById('addUserButton')?.addEventListener('click', handleAddCustomer);
    document.getElementById('importButton')?.addEventListener('click', handleImportClick);
    document.getElementById('refreshButton')?.addEventListener('click', () => {
        // Reset all filters and date preset
        state.activeFilters = { search: '', status: '', sales: '', channel: '', procedure: '' };
        document.querySelectorAll('.filter-select, .search-input').forEach(el => el.value = ''); // Clear UI inputs
        setDateFilterPreset('all'); // Resets date and triggers updateVisibleData
    });
    // Search Input (Debounced)
    document.getElementById('searchInput')?.addEventListener('input', debounce(e => {
        state.activeFilters.search = e.target.value; state.pagination.currentPage = 1; updateVisibleData();
    }, 300)); // Apply debounce
    // Filter Select Dropdowns
    ['statusFilter', 'salesFilter', 'channelFilter', 'procedureFilter'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', e => {
            // Extract filter key from element ID (e.g., 'statusFilter' -> 'status')
            const filterKey = id.replace('Filter', '');
            state.activeFilters[filterKey] = e.target.value;
            state.pagination.currentPage = 1; // Reset page on filter change
            updateVisibleData();
        });
    });

    // Date Filter Controls
    document.querySelectorAll('.btn-date-filter[data-preset]').forEach(button => button.addEventListener('click', () => setDateFilterPreset(button.dataset.preset)));
    document.getElementById('clearDateFilter')?.addEventListener('click', () => setDateFilterPreset('all'));
    const debouncedDateChange = debounce(handleCustomDateChange, 500); // Debounce manual date input
    document.getElementById('startDateFilter')?.addEventListener('change', debouncedDateChange);
    document.getElementById('endDateFilter')?.addEventListener('change', debouncedDateChange);

    // Pagination Controls (Event Delegation)
    document.getElementById('paginationContainer')?.addEventListener('click', event => {
        const button = event.target.closest('button[data-page]'); // Target buttons with data-page attribute
        if (button) {
            const page = button.dataset.page;
            const currentPage = state.pagination.currentPage;
            const totalPages = Math.ceil(state.filteredCustomers.length / state.pagination.pageSize) || 1;
            let newPage = currentPage;

            if (page === 'prev' && currentPage > 1) newPage--;
            else if (page === 'next' && currentPage < totalPages) newPage++;
            else if (page !== 'prev' && page !== 'next') newPage = parseInt(page); // Specific page number

            // Update only if page actually changed
            if (newPage !== currentPage) {
                state.pagination.currentPage = newPage;
                updateVisibleData();
            }
        }
    });
    // Page Size Selector
    document.getElementById('paginationContainer')?.addEventListener('change', event => {
        if (event.target.id === 'pageSize') {
            state.pagination.pageSize = parseInt(event.target.value);
            state.pagination.currentPage = 1; // Go back to page 1 when size changes
            updateVisibleData();
        }
    });

    // Table Body Interactions (Event Delegation)
    const tableBody = document.getElementById('tableBody');
    tableBody?.addEventListener('click', handleTableClick); // Handles Edit, Update, History clicks
    tableBody?.addEventListener('contextmenu', handleContextMenu); // Handles right-click

    // Context Menu Interaction
    const contextMenu = document.getElementById('contextMenu');
    contextMenu?.addEventListener('click', handleContextMenuItemClick); // Handles clicks on menu items
    // Global click listener to hide context menu
    window.addEventListener('click', (event) => {
        // Hide if click is outside the menu AND not on a table row (to allow right-click)
        if (contextMenu && contextMenu.style.display === 'block' &&
            !contextMenu.contains(event.target) &&
            !event.target.closest('tr[data-id]')) {
            ui.hideContextMenu();
        }
    });

    // Modal Buttons
    document.getElementById('submitStatusUpdateBtn')?.addEventListener('click', handleSubmitStatusUpdate); // Quick Status Update Modal
    document.getElementById('importBtn')?.addEventListener('click', handleProcessCSV); // Import Modal Process Button
    document.getElementById('editCustomerForm')?.addEventListener('submit', handleSaveEditForm); // Edit Modal Save Button
    document.getElementById('closeEditModalBtn')?.addEventListener('click', hideEditModal); // Edit Modal Close ('X')
    document.getElementById('cancelEditBtn')?.addEventListener('click', hideEditModal); // Edit Modal Cancel Button
    // Generic Modal Close Buttons (using data attribute)
    document.querySelectorAll('[data-modal-close]').forEach(btn => btn.addEventListener('click', () => ui.hideModal(btn.dataset.modalClose)));

    // Table Header Sorting (Event Delegation)
    const tableHeader = document.querySelector('#excelTable thead');
    tableHeader?.addEventListener('click', event => {
        const headerCell = event.target.closest('th[data-sortable]'); // Find closest sortable header
        if (headerCell) {
            handleSort(headerCell.dataset.sortable); // Call sort handler with the field name
        }
    });
}

/**
 * Handles clicks on table header cells to change sorting column and direction.
 */
function handleSort(column) {
    if (!column) return;
    if (state.sort.column === column) {
        // Toggle direction if clicking the same column
        state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        // Switch to new column, default to descending
        state.sort.column = column;
        state.sort.direction = 'desc';
    }
    // No need to reset pagination when sorting
    updateVisibleData(); // Re-render the table with new sorting
}

/**
 * Handles changes in the custom date range input fields.
 */
function handleCustomDateChange() {
    let start = document.getElementById('startDateFilter').value;
    let end = document.getElementById('endDateFilter').value;

    // Only proceed if both dates are set
    if (start && end) {
        if (start <= end) { // Basic validation: start <= end
            state.dateFilter = { startDate: start, endDate: end, preset: 'custom' };
            state.pagination.currentPage = 1; // Reset page
            // Update UI to show custom is active
            document.querySelectorAll('.btn-date-filter[data-preset]').forEach(btn => btn.classList.remove('active'));
            document.getElementById('clearDateFilter').classList.remove('active'); // Deactivate 'All'
            updateVisibleData();
        } else {
            // Show error if start date is after end date
            ui.showStatus('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด', true);
        }
    } else if (!start && !end && state.dateFilter.preset !== 'all') {
         // If user manually clears both dates, revert to 'all' preset
         setDateFilterPreset('all');
    }
    // If only one date is set, do nothing - wait for the other date or for debounce timer
}

/**
 * Determines the allowed next statuses based on the current status (for Sales role).
 */
function getAllowedNextStatuses(currentStatus) {
    const special = ["ไม่สนใจ", "ปิดการขาย", "ตามต่อ"]; // Terminal/Looping statuses
    if (!currentStatus || currentStatus.trim() === '') return ["status 1", ...special]; // Initial state

    switch (currentStatus) {
        case "status 1": return ["status 2", ...special];
        case "status 2": return ["status 3", ...special];
        case "status 3": return ["status 4", ...special];
        case "status 4": return [...special]; // From status 4, can only go to special states
        default: // If already in a special status
            return [...special]; // Can stay or switch between special statuses
    }
}

/**
 * Shows the quick status update modal and populates it with relevant data.
 */
function showUpdateStatusModal(customer) {
    if (!customer) return;
    const select = document.getElementById('modalStatusSelect');
    const notesTextArea = document.getElementById('modalNotesText');
    if (!select || !notesTextArea) return; // Ensure elements exist

    const userRole = (state.currentUser?.role || 'sales').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'administrator';
    // Determine allowed statuses based on role and current status
    let allowedStatuses = isAdmin ? DROPDOWN_OPTIONS.status_1 : getAllowedNextStatuses(customer.status_1);

    // Populate dropdown
    select.innerHTML = '<option value="">-- เลือกสถานะ --</option>'; // Clear and add default
    allowedStatuses.forEach(opt => {
        const optionEl = document.createElement('option');
        optionEl.value = opt;
        optionEl.textContent = opt;
        select.appendChild(optionEl);
    });

    // Pre-fill notes if available
    notesTextArea.value = customer.reason || '';

    // Show modal with customer context
    ui.showModal('statusUpdateModal', {
        customerId: customer.id,
        customerName: customer.name || customer.lead_code || 'N/A'
    });
}

/**
 * Shows the edit customer modal and populates the form using ui.buildEditForm.
 */
function showEditModal(customerId) {
    // Find the full customer data from the local state
    const customer = state.customers.find(c => String(c.id) === String(customerId));
    if (!customer) {
        ui.showStatus('ไม่พบข้อมูลลูกค้า (ID: ' + customerId + ')', true);
        return;
    }
    state.editingCustomerId = customerId; // Store the ID of the customer being edited
    // Build the form dynamically based on customer data and user role
    ui.buildEditForm(customer, state.currentUser, SALES_EDITABLE_FIELDS, state.salesList, DROPDOWN_OPTIONS);
    // Display the modal
    const modal = document.getElementById('editCustomerModal');
    if (modal) modal.classList.add('show');
}

/**
 * Hides the edit customer modal and clears its form content.
 */
function hideEditModal() {
    state.editingCustomerId = null; // Clear the currently editing ID
    const modal = document.getElementById('editCustomerModal');
    if (modal) modal.classList.remove('show'); // Hide the modal overlay
    const form = document.getElementById('editCustomerForm');
    if (form) form.innerHTML = ''; // Clear the dynamically generated form
}

/**
 * Handles saving data submitted from the Edit Customer modal.
 */
async function handleSaveEditForm(event) {
    event.preventDefault(); // Prevent standard form submission
    if (!state.editingCustomerId) {
        console.warn("Save aborted: No editingCustomerId set.");
        return;
    }

    const form = event.target;
    const formData = new FormData(form);
    const updatedDataFromForm = {}; // Data read directly from the form (enabled fields only)
    for (const [key, value] of formData.entries()) {
        updatedDataFromForm[key] = typeof value === 'string' ? value.trim() : value;
    }
    console.log("Data read from form (includes only enabled fields):", updatedDataFromForm);

    // Get original customer data to preserve fields Sales cannot edit
    const originalCustomer = state.customers.find(c => String(c.id) === String(state.editingCustomerId));
    if (!originalCustomer) {
        ui.showStatus('Error: ไม่พบข้อมูลลูกค้าเดิม', true);
        return;
    }

    // Determine user role
    const userRole = (state.currentUser?.role || 'sales').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'administrator';
    const isSales = !isAdmin;

    // --- Data Preparation: Start with original data, then overlay editable fields ---
    // Create a mutable copy of the original data to modify
    let dataToSend = { ...originalCustomer };

    // Iterate over fields defined in FIELD_MAPPING to decide what to potentially update
    Object.values(ui.FIELD_MAPPING).forEach(config => {
        const key = config.field;
        if (!key) return; // Skip fields without a 'field' property (like '#', 'จัดการ')

        // Check if the current user role is allowed to edit this field
        const isSalesEditable = SALES_EDITABLE_FIELDS.includes(key); // Check against the defined list for Sales
        const canEditField = isAdmin || (isSales && isSalesEditable);

        // Check if this field was present in the form data (meaning it was enabled)
        if (updatedDataFromForm.hasOwnProperty(key)) {
            if (canEditField) {
                 // If editable by current role, normalize and use the value from the form
                 if (['date', 'old_appointment', 'appointment_date', 'closed_date'].includes(key)) {
                     dataToSend[key] = normalizeDateStringToYYYYMMDD(updatedDataFromForm[key]);
                 } else {
                     dataToSend[key] = updatedDataFromForm[key];
                 }
            } else {
                 // This case should ideally not happen if UI disables fields correctly, but as a safeguard:
                 // If a field from the form is NOT editable by the current role, keep the original value.
                 console.warn(`User role '${userRole}' submitted non-editable field '${key}'. Preserving original value.`);
                 // dataToSend[key] already holds the original value from the initial spread ({...originalCustomer})
            }
        } else if (!canEditField && dataToSend.hasOwnProperty(key)) {
             // If the field was NOT in form data (disabled) AND is NOT editable by the current role,
             // ensure the original value is kept (already handled by initial spread).
             // This correctly preserves 'date' when Sales saves.
        } else if (isAdmin && !updatedDataFromForm.hasOwnProperty(key) && dataToSend.hasOwnProperty(key)){
             // Edge case: If Admin somehow clears a disabled field (shouldn't happen),
             // should we allow saving null? For now, preserve original.
             console.warn(`Admin submission missing field '${key}'. Preserving original value.`);
        }
    });
    // --- End Data Preparation ---


    // --- Validation: Check required 'date' field ONLY for Admins ---
    // Use dataToSend.date for validation as it contains the final value
    if (!dataToSend.date && isAdmin) {
        ui.showStatus('กรุณากรอก "วัน/เดือน/ปี"', true);
        const dateInput = form.querySelector('[name="date"]');
        if (dateInput) dateInput.focus();
        return; // Stop submission ONLY if Admin and date is empty or invalid
    }
    // --- End Validation ---

    // --- [MODIFIED] Deal Closing Logic (includes 'ONLINE') ---
    const isNowClosing = dataToSend.status_1 === 'ปิดการขาย' && (dataToSend.last_status === '100%' || dataToSend.last_status === 'ONLINE') && dataToSend.closed_amount;
    // Auto-populate closed_date only if it's currently empty and conditions are met
    if (isNowClosing && !dataToSend.closed_date) {
        dataToSend.closed_date = new Date().toISOString().split('T')[0]; // Use current date
        console.log(`Auto-populating closed_date: ${dataToSend.closed_date}`);
    }
    // Check if user is attempting to close (any closing field is set)
    const isClosingAttempt = (dataToSend.last_status === '100%' || dataToSend.last_status === 'ONLINE') || dataToSend.status_1 === 'ปิดการขาย' || dataToSend.closed_amount;
    if (isClosingAttempt) {
        // Verify all required closing fields are present
        const isClosingComplete = (dataToSend.last_status === '100%' || dataToSend.last_status === 'ONLINE') && dataToSend.status_1 === 'ปิดการขาย' && dataToSend.closed_amount;
        if (!isClosingComplete) {
            ui.showStatus('การปิดการขายต้องกรอก: Last Status (100% หรือ ONLINE), Status Sale (ปิดการขาย), และ ยอดที่ปิดได้ ให้ครบถ้วน', true);
            return; // Stop save if closing info is incomplete
        }
    }
    // --- End Deal Closing Logic ---

    // Clean up internal properties before sending
    delete dataToSend.id;
    delete dataToSend.created_at;
    delete dataToSend.updated_at;

    console.log("Data being sent to API:", dataToSend); // Log the final data object

    ui.showLoading(true); // Show loading indicator during API call
    try {
        // --- API Call to Update Customer ---
        const updatedCustomerResponse = await api.updateCustomer(state.editingCustomerId, dataToSend);

        // --- Post-API Data Handling ---
        // Merge original with response, then re-normalize dates for local state consistency
        const finalUpdatedCustomer = { ...originalCustomer, ...updatedCustomerResponse };
        finalUpdatedCustomer.date = normalizeDateStringToYYYYMMDD(finalUpdatedCustomer.date);
        finalUpdatedCustomer.old_appointment = normalizeDateStringToYYYYMMDD(finalUpdatedCustomer.old_appointment);
        finalUpdatedCustomer.appointment_date = normalizeDateStringToYYYYMMDD(finalUpdatedCustomer.appointment_date);
        finalUpdatedCustomer.closed_date = normalizeDateStringToYYYYMMDD(finalUpdatedCustomer.closed_date);
        finalUpdatedCustomer.id = originalCustomer.id; // Ensure ID remains correct

        // --- History Logging (Sales Role Only) ---
        if (userRole === 'sales') {
            const historyPromises = [];
            // Compare originalCustomer with the final state after update (finalUpdatedCustomer)
            for (const key in finalUpdatedCustomer) {
                if (key === 'id' || key === 'created_at' || key === 'updated_at') continue; // Skip internal keys

                const fieldConfig = Object.values(ui.FIELD_MAPPING).find(config => config.field === key);
                if (fieldConfig) { // Only log fields that are part of our defined mapping
                    const originalValue = originalCustomer[key] ?? '';
                    const newValue = finalUpdatedCustomer[key] ?? '';
                    if (String(originalValue) !== String(newValue)) { // Log only actual changes
                        const header = Object.keys(ui.FIELD_MAPPING).find(h => ui.FIELD_MAPPING[h]?.field === key) || key;
                        const isDateField = ['date', 'old_appointment', 'appointment_date', 'closed_date'].includes(key);
                        const originalFormatted = isDateField ? formatDateToDMY(originalValue) : originalValue;
                        const newFormatted = isDateField ? formatDateToDMY(newValue) : originalValue;
                        const logNote = `แก้ไข '${header}' จาก '${originalFormatted || 'ว่าง'}' เป็น '${newFormatted || 'ว่าง'}'`;
                        historyPromises.push(api.addStatusUpdate(state.editingCustomerId, 'แก้ไขข้อมูล', logNote, state.currentUser.id));
                    }
                }
            }
            if (historyPromises.length > 0) { await Promise.allSettled(historyPromises); }
        }

        // --- Update Local State (using immutable pattern) ---
        const index = state.customers.findIndex(c => String(c.id) === String(state.editingCustomerId));
        if (index !== -1) {
             state.customers = [
                 ...state.customers.slice(0, index),
                 finalUpdatedCustomer, // Use the final, merged & normalized data
                 ...state.customers.slice(index + 1),
             ];
        } else {
            console.warn("Updated customer not found in local state after save. Adding instead.");
            state.customers.push(finalUpdatedCustomer); // Fallback: Add if missing
        }

        // --- Final UI Updates ---
        hideEditModal(); // Close the modal on successful save
        updateVisibleData(); // Refresh the table to show changes
        ui.showStatus('บันทึกข้อมูลสำเร็จ', false); // Show success message

    } catch (error) {
        // Handle API errors during save
        console.error('Save failed:', error);
        ui.showStatus(`บันทึกข้อมูลไม่สำเร็จ: ${error.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'}`, true);
    } finally {
        ui.showLoading(false); // Hide loading indicator regardless of success/failure
    }
}


/**
 * Handles the logout process.
 */
async function handleLogout() {
    if (confirm('ต้องการออกจากระบบหรือไม่?')) {
        await api.signOut(); // Call API to sign out
        window.location.replace('login.html'); // Redirect to login page
    }
}

/**
 * Handles adding a new customer, prompting for lead code if needed.
 */
async function handleAddCustomer() {
    // Prompt user for lead code (optional)
    const leadCodeInput = prompt(
        "กรุณาระบุ 'ลำดับที่' (Lead Code) สำหรับลูกค้าใหม่:\n\n(หากต้องการให้ระบบรันเลขอัตโนมัติ ให้เว้นว่างไว้)",
        "" // Default value is empty string
    );
    // If user cancels the prompt, do nothing
    if (leadCodeInput === null) return;

    ui.showLoading(true);
    try {
        // [FIXED] Call API to add customer, passing the manual lead code (or empty string for auto)
        const newCustomer = await api.addCustomer(state.currentUser?.username || 'N/A', leadCodeInput);

        if (newCustomer) {
            // Log the creation event in history
            // Ensure currentUser.id is passed correctly, provide a fallback if necessary
            await api.addStatusUpdate(newCustomer.id, 'สร้างลูกค้าใหม่', `สร้างโดย ${state.currentUser?.username || 'System'}`, state.currentUser?.id || null);

            // Set default call time
            const now = new Date();
            newCustomer.call_time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            // Ensure dates are normalized (date should be set by API, others default to null)
            newCustomer.date = normalizeDateStringToYYYYMMDD(newCustomer.date);
            newCustomer.old_appointment = null;
            newCustomer.appointment_date = null;
            newCustomer.closed_date = null;

            // Add new customer to the beginning of the local array for immediate visibility
            state.customers.unshift(newCustomer);
            updateVisibleData(); // Refresh the UI
            showEditModal(newCustomer.id); // Open edit modal for the new customer
            ui.showStatus('เพิ่มลูกค้าใหม่สำเร็จ กรุณากรอกข้อมูล', false);
        } else {
            // Handle case where API call succeeds but returns no data (shouldn't happen with .single())
            throw new Error("API did not return new customer data.");
        }
    } catch (error) {
        // Handle errors during customer creation (e.g., duplicate lead code from manual input)
        console.error("Error adding customer:", error);
        ui.showStatus(`เพิ่มลูกค้าไม่สำเร็จ: ${error.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'}`, true);
    } finally {
        ui.showLoading(false);
    }
}

/**
 * Handles clicks within the table body, delegating actions based on button clicked.
 */
function handleTableClick(event) {
    const button = event.target.closest('button[data-action]'); // Find the clicked button
    if (!button || button.disabled) return; // Ignore if not a button or disabled

    const action = button.dataset.action; // Get action type (edit, update, history)
    const row = button.closest('tr[data-id]'); // Get the table row
    const id = row?.dataset.id; // Get customer ID from row
    if (!id) return; // Exit if no ID found

    // Find customer data in local state
    const customer = state.customers.find(c => String(c.id) === String(id));
    if (!customer) { ui.showStatus('ไม่พบข้อมูลลูกค้าสำหรับ ID นี้', true); return; }

    // Dispatch action
    if (action === 'edit-customer') showEditModal(id);
    if (action === 'update-status') showUpdateStatusModal(customer);
    if (action === 'view-history') handleViewHistory(id, customer.name || customer.lead_code); // Pass name or lead code for display
}

/**
 * Fetches and displays the status history for a customer in a modal.
 */
async function handleViewHistory(customerId, customerName) {
    ui.showModal('historyModal', { customerName: customerName || 'N/A' }); // Show modal with name
    const timelineContainer = document.getElementById('historyTimelineContainer');
    if (timelineContainer) timelineContainer.innerHTML = '<p>กำลังโหลดประวัติ...</p>'; // Indicate loading
    ui.showLoading(true); // Show global loading overlay as well
    try {
        const historyData = await api.fetchStatusHistory(customerId); // Fetch history via API
        ui.renderHistoryTimeline(historyData); // Render the fetched data
    } catch (error) {
        console.error("Error fetching history:", error);
        ui.showStatus('ไม่สามารถโหลดประวัติได้: ' + error.message, true);
        if(timelineContainer) timelineContainer.innerHTML = `<p style="color: red;">เกิดข้อผิดพลาดในการโหลดประวัติ: ${error.message}</p>`; // Show error inside modal
    } finally {
        ui.showLoading(false);
    }
}

/**
 * Handles submission of the quick status update modal.
 */
async function handleSubmitStatusUpdate() {
    // Get values from modal inputs safely
    const customerId = document.getElementById('modalCustomerId')?.value;
    const newStatus = document.getElementById('modalStatusSelect')?.value;
    const notes = document.getElementById('modalNotesText')?.value.trim();

    // Basic validation
    if (!customerId) { ui.showStatus('ไม่พบ ID ลูกค้า', true); return; }
    if (!newStatus) { ui.showStatus('กรุณาเลือกสถานะ', true); return; }

    // Require notes for status 1-4
    const requiresReason = ["status 1", "status 2", "status 3", "status 4"].includes(newStatus);
    if (requiresReason && !notes) {
        ui.showStatus('สำหรับ Status 1-4 กรุณากรอกเหตุผล/บันทึกเพิ่มเติม', true);
        return;
    }

    ui.showLoading(true);
    try {
        // Prepare data to update customer record
        const updateData = { status_1: newStatus, reason: notes };
        const customer = state.customers.find(c => String(c.id) === String(customerId)); // Get current customer data

        // [MODIFIED] Attempt to auto-populate closed_date if closing via quick update and conditions met (100% OR ONLINE)
        if (newStatus === 'ปิดการขาย' && customer && (customer.last_status === '100%' || customer.last_status === 'ONLINE') && customer.closed_amount && !customer.closed_date) {
            updateData.closed_date = new Date().toISOString().split('T')[0];
            console.log(`Auto-populating closed_date via status update: ${updateData.closed_date}`);
        }

        // Perform actions: Log history first, then update customer
        await api.addStatusUpdate(customerId, newStatus, notes, state.currentUser.id);
        const updatedCustomer = await api.updateCustomer(customerId, updateData);

        // Normalize dates from response
        updatedCustomer.date = normalizeDateStringToYYYYMMDD(updatedCustomer.date);
        updatedCustomer.old_appointment = normalizeDateStringToYYYYMMDD(updatedCustomer.old_appointment);
        updatedCustomer.appointment_date = normalizeDateStringToYYYYMMDD(updatedCustomer.appointment_date);
        updatedCustomer.closed_date = normalizeDateStringToYYYYMMDD(updatedCustomer.closed_date);

        // Update local state immutably
        const index = state.customers.findIndex(c => String(c.id) === String(customerId));
        if (index !== -1) {
             state.customers = [
                 ...state.customers.slice(0, index),
                 updatedCustomer,
                 ...state.customers.slice(index + 1),
             ];
        } else { state.customers.push(updatedCustomer); } // Fallback

        updateVisibleData(); // Refresh UI
        ui.hideModal('statusUpdateModal'); // Close modal
        ui.showStatus('อัปเดตสถานะสำเร็จ', false);
    } catch (error) {
        console.error("Error submitting status update:", error);
        ui.showStatus("เกิดข้อผิดพลาดในการอัปเดต: " + error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

/**
 * Handles right-click event on table rows to show the custom context menu (for Admins).
 */
function handleContextMenu(event) {
    const row = event.target.closest('tr[data-id]'); // Find the row element
    if (!row?.dataset?.id) return; // Exit if not on a valid row

    // Check user role - only Admins see context menu
    const userRole = (state.currentUser?.role || 'sales').toLowerCase();
    if (userRole !== 'admin' && userRole !== 'administrator') return;

    event.preventDefault(); // Prevent default browser right-click menu
    state.contextMenuRowId = row.dataset.id; // Store the ID of the right-clicked row
    ui.showContextMenu(event); // Display the custom context menu
}

/**
 * Handles clicks on items within the custom context menu.
 */
async function handleContextMenuItemClick(event) {
    const menuItem = event.target.closest('.context-menu-item[data-action]'); // Find the clicked menu item
    if (!menuItem) return; // Exit if click wasn't on an action item

    const action = menuItem.dataset.action; // Get the action (e.g., 'delete')
    const customerId = state.contextMenuRowId; // Get the stored customer ID
    if (!action || !customerId) return; // Exit if action or ID is missing

    ui.hideContextMenu(); // Hide menu immediately

    // Handle 'delete' action
    if (action === 'delete') {
        // Find customer info for confirmation message
        const customerToDelete = state.customers.find(c => String(c.id) === String(customerId));
        const customerDisplayName = customerToDelete?.name || customerToDelete?.lead_code || `ID: ${customerId}`;
        // Confirm deletion with the user
        if (confirm(`คุณต้องการลบลูกค้า "${customerDisplayName}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
            ui.showLoading(true);
            try {
                await api.deleteCustomer(customerId); // Call API to delete

                // Remove customer from local state AFTER successful API call
                state.customers = state.customers.filter(c => String(c.id) !== String(customerId));

                // Adjust pagination if the current page becomes empty after deletion
                // Important: Calculate based on FILTERED list length *before* updateVisibleData recalculates it
                const pageSize = state.pagination.pageSize;
                // Find how many items were in the filtered list before this deletion
                const totalFilteredRecordsBeforeDelete = state.filteredCustomers.length;
                // Check if the item deleted was the last one on the current page
                const wasLastItemOnPage = (totalFilteredRecordsBeforeDelete % pageSize === 1 || pageSize === 1) && state.pagination.currentPage === Math.ceil(totalFilteredRecordsBeforeDelete / pageSize);

                if (wasLastItemOnPage && state.pagination.currentPage > 1) {
                    // If deleting the last item on a page (and it's not page 1), go to previous page
                    state.pagination.currentPage--;
                    console.log(`Adjusting page down to ${state.pagination.currentPage} after delete.`);
                }
                // --- End Pagination Adjustment ---

                updateVisibleData(); // Refresh the table UI
                ui.showStatus('ลบข้อมูลสำเร็จ', false);
            } catch (error) {
                console.error("Error deleting customer:", error);
                ui.showStatus('ลบข้อมูลไม่สำเร็จ: ' + error.message, true);
            } finally {
                ui.showLoading(false);
            }
        }
    }
    // Add logic for other context menu actions here (e.g., copy row data)

    state.contextMenuRowId = null; // Clear the stored ID after action is handled
}

/**
 * Entry point: Runs when the DOM is fully loaded and parsed.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Check if essential global objects/functions exist
    if (window.supabase?.createClient && typeof ui === 'object' && typeof api === 'object') {
        initializeApp(); // Start the application logic
        setupEventListeners(); // Attach event listeners to UI elements
    } else {
        // Log error and show a user-friendly message if dependencies are missing
        console.error("Critical dependencies (Supabase, UI, API) were not found. Check script loading order and paths.");
        const banner = document.createElement('div');
        banner.style.cssText = 'background-color:red; color:white; padding:10px; text-align:center; position:fixed; top:0; left:0; width:100%; z-index:9999;';
        banner.textContent = 'Error loading application components. Please ensure all scripts are loaded correctly and refresh the page.';
        // Prepend to body if possible, otherwise use alert as fallback
        if (document.body) {
            document.body.prepend(banner);
        } else {
            alert('Error loading application components. Please refresh.');
        }
    }
});

