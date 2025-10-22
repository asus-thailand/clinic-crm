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
    activeFilters: { search: '', status: '', sales: '', channel: '', procedure: '' },
    dateFilter: { startDate: null, endDate: null, preset: 'all' },
    pagination: { currentPage: 1, pageSize: 50 },
    sort: { column: 'date', direction: 'desc' },
    editingCustomerId: null
};

const DROPDOWN_OPTIONS = {
    channel: ["เพื่อนแนะนำ","Walk-In","PHONE-IN","Line@","Fbc By หมอธีร์ (ปลูกผม)","Fbc By หมอธีร์ (หัตถการอื่น)","FBC HAIR CLINIC","Fbc ตาสองชั้น ยกคิ้ว เสริมจมูก","Fbc ปรับรูปหน้า Botox Filler HIFU","เว็บไซต์","AGENCY","IG","Tiktok ","FMBC"],
    procedure: ["ตา Dr.T","ตาทีมแพทย์","ปลูกผม","ปลูกหนวด/เครา","ปลูกคิ้ว","FaceLift","จมูก/ปาก/คาง","Thermage","Ultraformer","Filler","BOTOX","Laser กำจัดขน","SKIN อื่น ๆ","ตา Dr.T/ปลูกผม","ตา/SKIN","ผม/SKIN","ตา/อื่นๆ","ผม/อื่นๆ","ตาทีมแพทย์/ปลูกผม"],
    confirm_y: ["Y", "N"],
    status_1: ["status 1", "status 2", "status 3", "status 4", "ไม่สนใจ", "ปิดการขาย", "ตามต่อ"],
    cs_confirm: ["CSX", "CSY"],
    last_status: ["100%", "75%", "50%", "25%", "0%", "ONLINE", "เคส OFF"]
};

const SALES_EDITABLE_FIELDS = ['update_access', 'last_status', 'status_1', 'reason', 'etc', 'hn_customer', 'old_appointment', 'dr', 'closed_amount', 'appointment_date', 'closed_date'];

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
            if (year < 1800 || year > 2200) return null;
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

        ui.renderTableHeaders();
        const session = await api.getSession();
        if (!session) { window.location.replace('login.html'); return; }
        let userProfile = await api.getUserProfile(session.user.id);
        if (!userProfile) userProfile = await api.createDefaultUserProfile(session.user);
        // Ensure userProfile exists before proceeding
        if (!userProfile) throw new Error('Failed to load or create user profile.');

        state.currentUser = { id: session.user.id, ...userProfile };
        window.state = state;
        ui.updateUIAfterLogin(state.currentUser);
        const [customers, salesList] = await Promise.all([api.fetchAllCustomers(), api.fetchSalesList()]);

        // Normalize dates after fetching
        (customers || []).forEach(c => {
            c.date = normalizeDateStringToYYYYMMDD(c.date);
            c.old_appointment = normalizeDateStringToYYYYMMDD(c.old_appointment);
            c.appointment_date = normalizeDateStringToYYYYMMDD(c.appointment_date);
            c.closed_date = normalizeDateStringToYYYYMMDD(c.closed_date);
        });
        state.customers = customers || [];
        state.salesList = salesList || [];

        // Populate filters
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
        errorDiv.style.color = 'red';
        errorDiv.style.padding = '20px';
        errorDiv.style.backgroundColor = '#fff';
        errorDiv.style.margin = '20px';
        errorDiv.style.borderRadius = '8px';
        errorDiv.textContent = `Initialization failed: ${error.message}. Please refresh or contact support.`;
        document.body.prepend(errorDiv); // Add error message at the top
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
        if (['date', 'closed_date', 'lead_code'].includes(column)) {
            if(column === 'lead_code') {
                const numA = parseInt(valA, 10);
                const numB = parseInt(valB, 10);
                if (!isNaN(numA) && !isNaN(numB)) {
                    if (numA < numB) return direction === 'asc' ? -1 : 1;
                    if (numA > numB) return direction === 'asc' ? 1 : -1;
                    return 0;
                }
                 // Fallback to string sort if parsing fails
                 if (valA < valB) return direction === 'asc' ? -1 : 1;
                 if (valA > valB) return direction === 'asc' ? 1 : -1;
                 return 0;
            }
            const dateA = new Date(valA + 'T00:00:00Z'); // Compare as UTC
            const dateB = new Date(valB + 'T00:00:00Z');
            const timeA = dateA.getTime();
            const timeB = dateB.getTime();
            if (isNaN(timeA) && isNaN(timeB)) return 0;
            if (isNaN(timeA)) return direction === 'desc' ? 1 : -1; // Invalid dates last when descending
            if (isNaN(timeB)) return direction === 'desc' ? -1 : 1; // Invalid dates last when descending
            if (timeA < timeB) return direction === 'asc' ? -1 : 1;
            if (timeA > timeB) return direction === 'asc' ? 1 : -1;
            return 0;
        }
        // Default string sort (case-insensitive)
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return direction === 'asc' ? -1 : 1;
        if (strA > strB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    // --- Filtering ---
    let filtered = sortedCustomers;
    // Date Range Filter
    if (state.dateFilter.startDate && state.dateFilter.endDate) {
        filtered = filtered.filter(c => {
            if (!c.date) return false;
            return c.date >= state.dateFilter.startDate && c.date <= state.dateFilter.endDate;
        });
    }
    // Other Filters
    const { search, status, sales, channel, procedure } = state.activeFilters;
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
    state.filteredCustomers = filtered;


    // --- Pagination ---
    const { currentPage, pageSize } = state.pagination;
    const totalRecords = state.filteredCustomers.length;
    // Handle totalPages calculation carefully when totalRecords is 0
    const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / pageSize) : 1;
    // Ensure currentPage is within valid bounds
    const validCurrentPage = Math.max(1, Math.min(currentPage, totalPages));
    if (validCurrentPage !== currentPage) {
        state.pagination.currentPage = validCurrentPage; // Correct currentPage if out of bounds
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
    const dataSet = state.filteredCustomers; // Stats should reflect filtered data
    document.getElementById('totalCustomers').textContent = dataSet.length;
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('todayCustomers').textContent = dataSet.filter(c => c.date === today).length;
    document.getElementById('pendingCustomers').textContent = dataSet.filter(c => c.status_1 === 'ตามต่อ').length;
    document.getElementById('closedDeals').textContent = dataSet.filter(c => c.status_1 === 'ปิดการขาย' && c.last_status === '100%' && c.closed_amount).length;
}

function setDateFilterPreset(preset) {
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date(today); // Use today as default end date

    switch(preset) {
        case '7d': startDate.setDate(today.getDate() - 6); break;
        case '30d': startDate.setDate(today.getDate() - 29); break;
        case 'today': startDate = new Date(today); break; // Start of today
        case 'all': default: startDate = null; endDate = null; break; // Clear dates
    }

    // Set time to cover the whole day for comparisons
    if (startDate) startDate.setUTCHours(0, 0, 0, 0); // Use UTC for consistency
    if (endDate) endDate.setUTCHours(23, 59, 59, 999); // Use UTC

    // Format dates for state and input fields
    const startDateString = startDate ? startDate.toISOString().split('T')[0] : '';
    const endDateString = endDate ? endDate.toISOString().split('T')[0] : '';

    state.dateFilter = { startDate: startDateString, endDate: endDateString, preset };

    // Update input fields
    const startInput = document.getElementById('startDateFilter');
    const endInput = document.getElementById('endDateFilter');
    if (startInput) startInput.value = startDateString;
    if (endInput) endInput.value = endDateString;

    // Update UI buttons
    document.querySelectorAll('.btn-date-filter[data-preset]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === preset);
    });
    const clearButton = document.getElementById('clearDateFilter');
    if (clearButton) clearButton.classList.toggle('active', preset === 'all');

    state.pagination.currentPage = 1; // Reset page on filter change
    updateVisibleData(); // Trigger re-render
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
    if (csvFileInput) csvFileInput.value = ''; // Clear previous file selection
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

        let csvLeadCodeCounter = 1236; // Start counter for CSV import
        const customersToInsert = [];
        const todayStr = new Date().toISOString().split('T')[0];

        for (let i = 1; i < lines.length; i++) {
            // Robust CSV parsing (handles quotes)
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

            // Defaults
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
        initializeApp(); // Refresh data after successful import

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
        document.querySelectorAll('.filter-select, .search-input').forEach(el => el.value = ''); // Clear all filters
        setDateFilterPreset('all'); // Reset date and trigger update
    });

    // Filters (Debounced Search, Direct Change for Selects)
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
    const debouncedDateChange = debounce(handleCustomDateChange, 500); // Debounce custom date changes
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
            if (newPage !== currentPage) {
                state.pagination.currentPage = newPage;
                updateVisibleData();
            }
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
    window.addEventListener('click', (event) => { if (contextMenu && !contextMenu.contains(event.target) && !event.target.closest('tr[data-id]')) { ui.hideContextMenu(); } }); // Hide if clicking outside menu/table rows

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
    // No need to reset page for sorting
    updateVisibleData();
}


function handleCustomDateChange() {
    let start = document.getElementById('startDateFilter').value;
    let end = document.getElementById('endDateFilter').value;
    // Only update if both dates are set OR both are cleared
    if (start && end) {
        if (start <= end) {
            state.dateFilter = { startDate: start, endDate: end, preset: 'custom' };
            state.pagination.currentPage = 1;
            document.querySelectorAll('.btn-date-filter[data-preset]').forEach(btn => btn.classList.remove('active'));
            document.getElementById('clearDateFilter').classList.remove('active');
            updateVisibleData();
        } else { ui.showStatus('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด', true); }
    } else if (!start && !end && state.dateFilter.preset !== 'all') {
         // If both are cleared manually, switch back to 'all'
         setDateFilterPreset('all');
    } else if (start || end) {
        // If only one is set, it's an incomplete range, do nothing or show warning
        // console.warn("Incomplete date range selected.");
    }
}


function getAllowedNextStatuses(currentStatus) {
    const specialStatuses = ["ไม่สนใจ", "ปิดการขาย", "ตามต่อ"];
    if (!currentStatus || currentStatus.trim() === '') return ["status 1", ...specialStatuses];
    switch (currentStatus) {
        case "status 1": return ["status 2", ...specialStatuses];
        case "status 2": return ["status 3", ...specialStatuses];
        case "status 3": return ["status 4", ...specialStatuses];
        case "status 4": return [...specialStatuses]; // Can only move to special statuses from 4
        default: return [...specialStatuses]; // If already in a special status, can stay or change to another special one
    }
}

function showUpdateStatusModal(customer) {
    const select = document.getElementById('modalStatusSelect'); if (!select) return;
    const userRole = (state.currentUser?.role || 'sales').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'administrator';
    let allowedStatuses = isAdmin ? DROPDOWN_OPTIONS.status_1 : getAllowedNextStatuses(customer.status_1);
    select.innerHTML = '<option value="">-- เลือกสถานะ --</option>'; // Always clear first
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
    event.preventDefault(); // Prevent default form submission
    if (!state.editingCustomerId) return;

    const form = event.target;
    const formData = new FormData(form);
    const updatedData = {};
    for (const [key, value] of formData.entries()) {
        // Trim strings, leave other types as is (though form usually gives strings)
        updatedData[key] = typeof value === 'string' ? value.trim() : value;
    }

    // [NEW] Add validation for required 'date' field
    if (!updatedData.date) {
        ui.showStatus('กรุณากรอก "วัน/เดือน/ปี"', true);
        const dateInput = form.querySelector('[name="date"]');
        if (dateInput) dateInput.focus(); // Focus on the empty required field
        return; // Stop submission
    }


    // Normalize all potential date fields AFTER basic validation
    updatedData.date = normalizeDateStringToYYYYMMDD(updatedData.date);
    updatedData.old_appointment = normalizeDateStringToYYYYMMDD(updatedData.old_appointment);
    updatedData.appointment_date = normalizeDateStringToYYYYMMDD(updatedData.appointment_date);
    updatedData.closed_date = normalizeDateStringToYYYYMMDD(updatedData.closed_date);

    // Re-check normalized date (it might become null if format was invalid)
    if (!updatedData.date) {
        ui.showStatus('รูปแบบ "วัน/เดือน/ปี" ไม่ถูกต้อง', true);
        const dateInput = form.querySelector('[name="date"]');
        if (dateInput) dateInput.focus();
        return; // Stop submission if normalization failed
    }


    const originalCustomer = state.customers.find(c => String(c.id) === String(state.editingCustomerId));
    if (!originalCustomer) { ui.showStatus('Error: ไม่พบข้อมูลลูกค้าเดิม', true); return; }

    // --- Deal Closing Logic ---
    const isNowClosing = updatedData.status_1 === 'ปิดการขาย' && updatedData.last_status === '100%' && updatedData.closed_amount;
    // Auto-populate closed_date if closing now and date is missing
    if (isNowClosing && !updatedData.closed_date) {
        updatedData.closed_date = new Date().toISOString().split('T')[0];
        console.log(`Auto-populating closed_date: ${updatedData.closed_date}`);
    }

    // Check completeness if attempting to close
    const isClosingAttempt = updatedData.last_status === '100%' || updatedData.status_1 === 'ปิดการขาย' || updatedData.closed_amount;
    if (isClosingAttempt) {
        const isClosingComplete = updatedData.last_status === '100%' && updatedData.status_1 === 'ปิดการขาย' && updatedData.closed_amount;
        if (!isClosingComplete) {
            ui.showStatus('การปิดการขายต้องกรอก: Last Status (100%), Status Sale (ปิดการขาย), และ ยอดที่ปิดได้ ให้ครบถ้วน', true);
            return;
        }
    }
    // --- End Deal Closing Logic ---

    ui.showLoading(true);
    try {
        // --- API Call ---
        const updatedCustomer = await api.updateCustomer(state.editingCustomerId, updatedData);

        // --- Post-API Normalization (Good Practice) ---
        updatedCustomer.date = normalizeDateStringToYYYYMMDD(updatedCustomer.date);
        updatedCustomer.old_appointment = normalizeDateStringToYYYYMMDD(updatedCustomer.old_appointment);
        updatedCustomer.appointment_date = normalizeDateStringToYYYYMMDD(updatedCustomer.appointment_date);
        updatedCustomer.closed_date = normalizeDateStringToYYYYMMDD(updatedCustomer.closed_date);

        // --- History Logging (Sales Only) ---
        const userRole = (state.currentUser?.role || '').toLowerCase();
        if (userRole === 'sales') {
            const historyPromises = [];
            for (const [key, value] of Object.entries(updatedData)) {
                const originalValue = originalCustomer[key] ?? '';
                const newValue = value ?? '';
                if (String(originalValue) !== String(newValue)) {
                    const header = Object.keys(ui.FIELD_MAPPING).find(h => ui.FIELD_MAPPING[h].field === key) || key;
                    // Format values for logging (especially dates)
                    const originalFormatted = (['date', 'old_appointment', 'appointment_date', 'closed_date'].includes(key)) ? formatDateToDMY(originalValue) : originalValue;
                    const newFormatted = (['date', 'old_appointment', 'appointment_date', 'closed_date'].includes(key)) ? formatDateToDMY(newValue) : newValue;
                    const logNote = `แก้ไข '${header}' จาก '${originalFormatted || 'ว่าง'}' เป็น '${newFormatted || 'ว่าง'}'`; // Show 'ว่าง' for empty
                    historyPromises.push(api.addStatusUpdate(state.editingCustomerId, 'แก้ไขข้อมูล', logNote, state.currentUser.id));
                }
            }
            // Use Promise.allSettled for robustness if one log fails
            if (historyPromises.length > 0) { await Promise.allSettled(historyPromises); }
        }

        // --- Update Local State ---
        const index = state.customers.findIndex(c => String(c.id) === String(state.editingCustomerId));
        if (index !== -1) { state.customers[index] = updatedCustomer; }
        else { state.customers.push(updatedCustomer); } // Fallback

        // --- UI Updates ---
        hideEditModal();
        updateVisibleData(); // Refresh table
        ui.showStatus('บันทึกข้อมูลสำเร็จ', false);

    } catch (error) {
        console.error('Save failed:', error);
        ui.showStatus('บันทึกข้อมูลไม่สำเร็จ: ' + error.message, true);
    } finally {
        ui.showLoading(false);
    }
}


async function handleLogout() {
    if (confirm('ต้องการออกจากระบบหรือไม่?')) {
        await api.signOut();
        window.location.replace('login.html'); // Redirect after sign out
    }
}

async function handleAddCustomer() {
    const leadCodeInput = prompt("กรุณาระบุ 'ลำดับที่' (Lead Code) สำหรับลูกค้าใหม่:\n\n(หากต้องการให้ระบบรันเลขอัตโนมัติ ให้เว้นว่างไว้)", "");
    if (leadCodeInput === null) return; // User cancelled

    ui.showLoading(true);
    try {
        const newCustomer = await api.addCustomer(state.currentUser?.username || 'N/A', leadCodeInput);
        if (newCustomer) {
            // Log creation immediately
            await api.addStatusUpdate(newCustomer.id, 'สร้างลูกค้าใหม่', `สร้างโดย ${state.currentUser?.username || 'System'}`, state.currentUser?.id || null); // Pass user ID

            // Set default call time and normalize dates
            const now = new Date();
            newCustomer.call_time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            newCustomer.date = normalizeDateStringToYYYYMMDD(newCustomer.date); // Should be set by API
            newCustomer.old_appointment = null; // Ensure defaults are null or normalized
            newCustomer.appointment_date = null;
            newCustomer.closed_date = null;

            state.customers.unshift(newCustomer); // Add to beginning of local array
            updateVisibleData(); // Refresh table
            showEditModal(newCustomer.id); // Open edit modal immediately
            ui.showStatus('เพิ่มลูกค้าใหม่สำเร็จ กรุณากรอกข้อมูล', false);
        } else {
            throw new Error("API did not return new customer data."); // More specific error
        }
    } catch (error) {
        console.error("Error adding customer:", error);
        ui.showStatus('เพิ่มลูกค้าไม่สำเร็จ: ' + error.message, true);
    } finally {
        ui.showLoading(false);
    }
}


// Handles clicks on buttons within the table body (Edit, Update, History)
function handleTableClick(event) {
    const button = event.target.closest('button[data-action]'); // More specific selector
    if (!button || button.disabled) return; // Ignore clicks not on buttons or disabled ones

    const action = button.dataset.action;
    const row = button.closest('tr[data-id]');
    const id = row?.dataset.id;
    if (!id) return;

    // Find customer data using the ID
    const customer = state.customers.find(c => String(c.id) === String(id));
    if (!customer) { ui.showStatus('ไม่พบข้อมูลลูกค้าสำหรับ ID นี้', true); return; }

    // Perform action based on button clicked
    if (action === 'edit-customer') showEditModal(id);
    if (action === 'update-status') showUpdateStatusModal(customer);
    if (action === 'view-history') handleViewHistory(id, customer.name || customer.lead_code);
}


async function handleViewHistory(customerId, customerName) {
    ui.showModal('historyModal', { customerName: customerName || 'N/A' });
    const timelineContainer = document.getElementById('historyTimelineContainer');
    if (timelineContainer) timelineContainer.innerHTML = '<p>กำลังโหลดประวัติ...</p>'; // Show loading text
    ui.showLoading(true); // Also show overlay loading
    try {
        const historyData = await api.fetchStatusHistory(customerId);
        ui.renderHistoryTimeline(historyData); // Render fetched data
    } catch (error) {
        console.error("Error fetching history:", error); // Log error
        ui.showStatus('ไม่สามารถโหลดประวัติได้: ' + error.message, true);
        if(timelineContainer) timelineContainer.innerHTML = `<p style="color: red;">เกิดข้อผิดพลาด: ${error.message}</p>`; // Show error in modal
    } finally {
        ui.showLoading(false);
    }
}

// Handles submitting the quick status update modal
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

        // 1. Log the status update first
        await api.addStatusUpdate(customerId, newStatus, notes, state.currentUser.id);
        // 2. Update the customer record
        const updatedCustomer = await api.updateCustomer(customerId, updateData);

        // 3. Normalize dates from response
        updatedCustomer.date = normalizeDateStringToYYYYMMDD(updatedCustomer.date);
        updatedCustomer.old_appointment = normalizeDateStringToYYYYMMDD(updatedCustomer.old_appointment);
        updatedCustomer.appointment_date = normalizeDateStringToYYYYMMDD(updatedCustomer.appointment_date);
        updatedCustomer.closed_date = normalizeDateStringToYYYYMMDD(updatedCustomer.closed_date);

        // 4. Update local state
        const index = state.customers.findIndex(c => String(c.id) === String(customerId));
        if (index !== -1) { state.customers[index] = updatedCustomer; }
        else { state.customers.push(updatedCustomer); } // Fallback

        updateVisibleData(); // Refresh table
        ui.hideModal('statusUpdateModal'); // Close modal
        ui.showStatus('อัปเดตสถานะสำเร็จ', false);
    } catch (error) {
        console.error("Error submitting status update:", error);
        ui.showStatus("เกิดข้อผิดพลาดในการอัปเดต: " + error.message, true);
    } finally {
        ui.showLoading(false);
    }
}


// Handles right-click on table rows for context menu
function handleContextMenu(event) {
    const row = event.target.closest('tr[data-id]');
    if (!row || !row.dataset.id) return;
    const userRole = (state.currentUser?.role || 'sales').toLowerCase();
    // Only show for admin/administrator
    if (userRole !== 'admin' && userRole !== 'administrator') return;
    event.preventDefault(); // Prevent browser default context menu
    state.contextMenuRowId = row.dataset.id; // Store ID for action
    ui.showContextMenu(event); // Show custom menu
}


// Handles clicks on context menu items
async function handleContextMenuItemClick(event) {
    const menuItem = event.target.closest('.context-menu-item[data-action]');
    if (!menuItem) return; // Clicked outside an action item

    const action = menuItem.dataset.action;
    const customerId = state.contextMenuRowId;
    if (!action || !customerId) return;

    ui.hideContextMenu(); // Hide menu immediately

    if (action === 'delete') {
        const customerToDelete = state.customers.find(c => String(c.id) === String(customerId));
        const customerDisplayName = customerToDelete?.name || customerToDelete?.lead_code || `ID: ${customerId}`;
        if (confirm(`คุณต้องการลบลูกค้า "${customerDisplayName}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
            ui.showLoading(true);
            try {
                await api.deleteCustomer(customerId);
                state.customers = state.customers.filter(c => String(c.id) !== String(customerId));
                // Adjust pagination if needed after deletion
                const totalRecords = state.filteredCustomers.length -1; // Predict new count
                const totalPages = Math.max(1, Math.ceil(totalRecords / state.pagination.pageSize));
                if (state.pagination.currentPage > totalPages) {
                     state.pagination.currentPage = totalPages;
                }
                updateVisibleData(); // Refresh table with potentially adjusted page
                ui.showStatus('ลบข้อมูลสำเร็จ', false);
            } catch (error) {
                console.error("Error deleting customer:", error);
                ui.showStatus('ลบข้อมูลไม่สำเร็จ: ' + error.message, true);
            } finally {
                ui.showLoading(false);
            }
        }
    }
    // Add other context menu actions here (e.g., copy)

    state.contextMenuRowId = null; // Clear stored ID
}


// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Basic check if core libraries seem loaded
    if (window.supabase && window.supabase.createClient && typeof ui === 'object' && typeof api === 'object') {
        initializeApp();
        setupEventListeners();
    } else {
        console.error("Critical dependencies (Supabase, UI, API) not found.");
        document.body.innerHTML = '<div style="color: red; padding: 20px;">Error loading application components. Please refresh.</div>';
    }
});
