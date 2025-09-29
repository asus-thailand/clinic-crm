// ================================================================================
// BEAUTY CLINIC CRM - FINAL PRODUCTION-READY SCRIPT (SENIOR DEV REVISION)
// FIXES: CRITICAL BUG (process.env) and Best Practices
// ================================================================================

// --- 0. SECURITY & HELPER FUNCTIONS ---
/**
 * Function to escape HTML special characters for XSS prevention.
 * @param {string} str 
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);
    return str.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;")
               .replace(/"/g, "&quot;")
               .replace(/'/g, "&#039;");
}

// Timer management (FIXED MEMORY LEAK)
let statusTimeoutId = null;
let sessionRefreshInterval = null;
const activeTimers = new Set(); // Use Set for better memory leak management

function addTimer(timerId) {
    activeTimers.add(timerId);
}

function removeTimer(timerId) {
    activeTimers.delete(timerId);
    clearTimeout(timerId);
}

function clearAllTimers() {
    // Clear session refresh
    if (sessionRefreshInterval) {
        clearInterval(sessionRefreshInterval);
        sessionRefreshInterval = null;
    }
    
    // Clear status timeout
    if (statusTimeoutId) {
        clearTimeout(statusTimeoutId);
        statusTimeoutId = null;
    }
    
    // Clear all active timers
    activeTimers.forEach(timerId => clearTimeout(timerId));
    activeTimers.clear();
}

// --- 1. CONFIGURATION & INITIALIZATION (FIXED SECURITY: API KEYS) ---
// 🔴 CRITICAL FIX: ใช้ window.SUPABASE_URL แทน process.env เพื่อให้ทำงานบน Browser ได้
const SUPABASE_URL = window.SUPABASE_URL || 'https://dmzsughhxdgpnazvjtci.supabase.co'; 
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtenN1Z2hoeGRncG5henZqdGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1Nzk4NDIsImV4cCI6MjA3MzE1NTg0Mn0.eeWTW871ork6ZH43U_ergJ7rb1ePMT7ztPOdh5hgqLM';

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variables (ADJUSTED: Using const for reference stability)
let currentUserRole = 'sales';
let currentUserId = null;
let currentUsername = null;
// 💡 BEST PRACTICE FIX: Use const and array methods for managing array content
const tableData = []; 
const originalTableData = [];
let editingCell = null;
let copiedCell = null;
let contextCell = null;
const salesList = []; // Use const for array reference
let realtimeSubscription = null;

// Operation states
const operationStates = {
    isUpdating: false,
    isDeleting: false,
    isFetching: false,
    isImporting: false
};

// Mutex for preventing race conditions (FIXED RACE CONDITION)
let updateMutex = Promise.resolve();
const pendingUpdates = new Map(); // Use Map to prevent redundant updates on the same cell

// Define fields that sales can edit
const salesEditableFields = [
    'last_status',
    'update_access',
    'call_time',
    'status_1',
    'reason',
    'etc',
    'hn_customer',
    'old_appointment',
    'dr',
    'closed_amount',
    'appointment_date',
    'sales'
];

// Field Mapping
const FIELD_MAPPING = {
    '#': null,
    'วัน/เดือน/ปี': 'date',
    'ลำดับที่': 'lead_code',
    'ชื่อลูกค้า': 'name',
    'เบอร์ติดต่อ': 'phone',
    'ช่องทางสื่อ': 'channel',
    'ประเภทหัตถการ': 'procedure',
    'มัดจำ': 'deposit',
    'ขอเบอร์ Y/N': 'confirm_y',
    'มัดจำออนไลน์ Y/N': 'transfer_100',
    'CS ผู้ส่ง Lead': 'cs_confirm',
    'เซลล์': 'sales',
    'Last Status': 'last_status',
    'อัพเดทการเข้าถึง': 'update_access',
    'เวลาโทร': 'call_time',
    'Status SALE': 'status_1',
    'เหตุผล': 'reason',
    'ETC': 'etc',
    'HN ลูกค้า': 'hn_customer',
    'วันที่นัดผ่าเก่าแล้ว': 'old_appointment',
    'DR.': 'dr',
    'ยอดที่ปิดได้': 'closed_amount',
    'วันที่นัดทำหัตถการ': 'appointment_date'
};

// Dropdown options
const dropdownOptions = {
    'channel': ['Fbc By หมอธีร์', 'FBC-EYES', 'FBC-Hair', 'Walk-in', 'Online', 'Facebook', 'Instagram', 'Line'],
    'procedure': ['ปลูกผม', 'ยกคิ้ว', 'จมูก', 'ตา', 'ฉีดฟิลเลอร์', 'โบท็อกซ์', 'เลเซอร์'],
    'cs_confirm': ['CSX', 'CSY', 'CSZ'],
    'confirm_y': ['Y', 'N'],
    'transfer_100': ['Y', 'N'],
    'status_1': ['status 1', 'status 2', 'status 3', 'status 4', 'ตามต่อ', 'ปิดการขาย', 'ไม่สนใจ'],
    'last_status': ['online', '0%', '25%', '50%', '75%', '100%', 'case off']
};

// --- 2. MAIN APP INITIALIZATION ---
async function initializeApp() {
    showLoading(true);

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = 'login.html';
            return;
        }

        currentUserId = session.user.id;

        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('role, username, full_name')
            .eq('id', currentUserId)
            .single();

        if (userError || !userData) {
            await createDefaultUserProfile(session.user);
        } else {
            currentUserRole = userData.role || 'sales';
            currentUsername = userData.username || userData.full_name || session.user.email.split('@')[0];
        }

        updateUIByRole();
        await fetchSalesList();
        populateFilterOptions();
        await fetchCustomerData();
        setupRealtimeSubscription();
        setupSessionRefresh();

    } catch (error) {
        console.error('Initialization error:', error);
        showStatus('เกิดข้อผิดพลาดในการเริ่มต้นระบบ: ' + error.message, true);
    } finally {
        showLoading(false);
    }
}

// --- 3. USER & AUTH FUNCTIONS ---
async function createDefaultUserProfile(user) {
    const username = user.email.split('@')[0];
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .insert({
                id: user.id,
                username: username,
                full_name: username,
                role: 'sales'
            })
            .select()
            .single();

        if (!error && data) {
            currentUsername = data.username;
            currentUserRole = data.role;
        }
    } catch (error) {
        console.error('Error creating user profile:', error);
    }
}

async function handleLogout() {
    if (confirm('ต้องการออกจากระบบหรือไม่?')) {
        showLoading(true);
        
        // Clean up all resources (FIXED MEMORY LEAK)
        clearAllTimers();
        
        // Unsubscribe from realtime
        if (realtimeSubscription) {
            await supabaseClient.removeChannel(realtimeSubscription);
            realtimeSubscription = null;
        }

        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            console.error('Error logging out:', error);
            showStatus('ออกจากระบบไม่สำเร็จ', true);
            showLoading(false);
        } else {
            window.location.href = 'login.html';
        }
    }
}

function setupSessionRefresh() {
    // Clear existing interval
    if (sessionRefreshInterval) {
        clearInterval(sessionRefreshInterval);
    }
    
    // Refresh session every 30 minutes
    sessionRefreshInterval = setInterval(async () => {
        try {
            const { data: { session }, error } = await supabaseClient.auth.refreshSession();
            if (error || !session) {
                console.error('Session refresh failed:', error);
                clearAllTimers();
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('Session refresh error:', error);
            clearAllTimers();
            window.location.href = 'login.html';
        }
    }, 30 * 60 * 1000); // 30 minutes
}

function updateUIByRole() {
    const userBadge = document.querySelector('.user-badge');
    const userPermissions = document.getElementById('userPermissions');
    const addUserButton = document.getElementById('addUserButton');
    const deleteRowMenuItem = document.getElementById('deleteRowMenuItem');
    const importButton = document.getElementById('importButton');

    const permissions = {
        'administrator': {
            badge: 'Administrator',
            badgeColor: '#dc3545',
            text: 'Full Access - Edit, Delete, Manage All',
            canAdd: true,
            canDelete: true,
            canEditAll: true,
            canImport: true
        },
        'admin': {
            badge: 'Admin',
            badgeColor: '#007bff',
            text: 'Edit All, Add New, Delete',
            canAdd: true,
            canDelete: true,
            canEditAll: true,
            canImport: false
        },
        'sales': {
            badge: 'Sales',
            badgeColor: '#28a745',
            text: 'Edit Own, Add New',
            canAdd: true,
            canDelete: false,
            canEditAll: false,
            canImport: false
        },
        'viewer': {
            badge: 'Viewer',
            badgeColor: '#6c757d',
            text: 'View Only',
            canAdd: false,
            canDelete: false,
            canEditAll: false,
            canImport: false
        }
    };

    const perm = permissions[currentUserRole] || permissions['viewer'];

    if (userBadge) {
        userBadge.textContent = `${perm.badge} - ${currentUsername || 'User'}`;
        userBadge.style.backgroundColor = perm.badgeColor;
    }

    if (userPermissions) {
        userPermissions.textContent = perm.text;
    }

    if (addUserButton) {
        addUserButton.style.display = perm.canAdd ? 'inline-block' : 'none';
    }

    if (deleteRowMenuItem) {
        deleteRowMenuItem.style.display = perm.canDelete ? 'block' : 'none';
    }

    if (importButton) {
        importButton.style.display = perm.canImport ? 'inline-block' : 'none';
    }
}

// --- 4. DATA FETCHING & MANAGEMENT (FIXED LOGIC ERROR: Minor B) ---
async function fetchCustomerData() {
    if (operationStates.isFetching) return;
    operationStates.isFetching = true;
    
    try {
        showStatus('กำลังโหลดข้อมูล...');

        const { data, error } = await supabaseClient
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // ❌ LOGIC FIX: Use array mutation methods to preserve the const reference
        tableData.length = 0; 
        originalTableData.length = 0;
        tableData.push(...(data || []));
        originalTableData.push(...(data || []));

        renderTable();
        updateStats();
        showStatus('ข้อมูลล่าสุดแล้ว');
    } catch (error) {
        console.error('Error fetching customers:', error);
        showStatus('ดึงข้อมูลไม่สำเร็จ: ' + error.message, true);
        tableData.length = 0;
        originalTableData.length = 0;
        renderTable();
    } finally {
        operationStates.isFetching = false;
    }
}

async function refreshData() {
    showStatus('กำลังรีเฟรชข้อมูล...');
    await fetchCustomerData();
}

// --- 5. TABLE RENDERING (FIXED XSS & MEMORY LEAK) ---
function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    // Clear old content and event listeners (FIXED MEMORY LEAK)
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }

    const headers = Array.from(document.querySelectorAll('#excelTable thead th')).map(th => th.textContent.trim());

    tableData.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.dataset.id = row.id;
        tr.dataset.index = index;

        headers.forEach(headerText => {
            const fieldName = FIELD_MAPPING[headerText];
            const td = document.createElement('td');
            
            if (fieldName === null) {
                // Row number column
                td.className = 'row-number';
                // 💡 MINOR ADJUSTMENT: No need for String(index + 1)
                td.textContent = index + 1; 
            } else if (fieldName) {
                const isDropdown = dropdownOptions[fieldName] !== undefined || fieldName === 'sales';
                const cellClass = getCellClass(fieldName);
                const cellValue = row[fieldName] || '';
                
                td.className = cellClass;
                if (isDropdown) td.classList.add('has-dropdown');
                
                if (fieldName === 'confirm_y' || fieldName === 'transfer_100') {
                    td.classList.add('yn-cell');
                    if (row[fieldName] === 'Y') td.classList.add('yes');
                    else if (row[fieldName] === 'N') td.classList.add('no');
                }
                
                td.dataset.field = fieldName;
                // Use textContent to prevent XSS (FIXED XSS)
                td.textContent = cellValue; 
                
                // Add event listener for double click (FIXED MEMORY LEAK/INLINE)
                td.addEventListener('dblclick', function() {
                    startEdit(this, row.id, fieldName);
                });
            }
            
            tr.appendChild(td);
        });
        
        // Mobile actions column
        const actionCell = document.createElement('td');
        const actionButton = document.createElement('button');
        actionButton.className = 'mobile-actions-btn';
        actionButton.textContent = '⋯';
        actionButton.addEventListener('click', function(e) {
            showMobileMenu(e, index);
        });
        actionCell.appendChild(actionButton);
        tr.appendChild(actionCell);
        
        tbody.appendChild(tr);
    });
}

function getCellClass(field) {
    const adminFields = ['date', 'lead_code', 'name', 'phone', 'channel', 'procedure', 'deposit', 'confirm_y', 'transfer_100', 'cs_confirm', 'sales'];
    const statusFields = ['last_status', 'update_access', 'call_time', 'status_1'];
    const etcFields = ['reason', 'etc', 'hn_customer', 'old_appointment', 'dr', 'closed_amount', 'appointment_date'];

    if (adminFields.includes(field)) return 'admin-cell';
    if (statusFields.includes(field)) return 'status-cell';
    if (etcFields.includes(field)) return 'etc-cell';
    return '';
}

// --- 6. CELL EDITING ---
function validateInput(value, field) {
    // Phone validation (FIXED LOGIC ERROR: Allow empty string)
    if (field === 'phone') {
        const phoneRegex = /^[0-9+()-\s]*$/;
        // ❌ LOGIC FIX: Only check regex if value is NOT empty. Empty string ('') is always valid.
        if (value && !phoneRegex.test(value)) { 
            return `ฟิลด์ 'เบอร์ติดต่อ' รูปแบบไม่ถูกต้อง`;
        }
    }
    
    // Number validation
    if (field === 'closed_amount' || field === 'deposit') {
        if (value && isNaN(Number(value))) {
            return `ฟิลด์นี้ต้องเป็นตัวเลข`;
        }
    }
    
    // Date validation
    if (field === 'date' || field === 'appointment_date' || field === 'old_appointment') {
        if (value) {
            const dateFormats = [
                /^\d{1,2}\/\d{1,2}\/\d{4}$/,
                /^\d{4}-\d{2}-\d{2}$/,
                /^\d{1,2}-\d{1,2}-\d{4}$/
            ];
            
            const isValidFormat = dateFormats.some(regex => regex.test(value));
            if (!isValidFormat) {
                return 'รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น DD/MM/YYYY)';
            }
        }
    }
    
    // Lead code validation
    if (field === 'lead_code') {
        if (value && !(/^\d+$/.test(value))) {
            return 'รหัสลีดต้องเป็นตัวเลขเท่านั้น';
        }
    }
    
    return null;
}

function startEdit(cell, rowId, field) {
    const row = tableData.find(r => r.id === rowId);
    if (!row) {
        showStatus('ไม่พบข้อมูลที่จะแก้ไข', true);
        return;
    }

    // Permission check
    if (currentUserRole === 'sales') {
        const isOwner = row.sales === currentUsername;
        const isEditableField = salesEditableFields.includes(field);

        if (!isOwner) {
            showStatus('คุณสามารถแก้ไขได้เฉพาะลูกค้าของคุณเท่านั้น', true);
            return;
        }

        if (!isEditableField) {
            showStatus('คุณไม่มีสิทธิ์แก้ไขคอลัมน์นี้', true);
            return;
        }
    }

    if (currentUserRole === 'viewer') {
        showStatus('คุณไม่มีสิทธิ์แก้ไขข้อมูล', true);
        return;
    }

    if (editingCell) finishEdit(true);

    editingCell = cell;
    const originalValue = row[field] || '';
    cell.classList.add('editing');

    let dropdownItems = dropdownOptions[field];
    if (field === 'sales') {
        dropdownItems = salesList;
    }

    // Clear cell safely
    while (cell.firstChild) {
        cell.removeChild(cell.firstChild);
    }

    if (dropdownItems) {
        const select = document.createElement('select');
        select.className = 'cell-select';

        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '-- เลือก --';
        select.appendChild(emptyOption);

        dropdownItems.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            if (opt === originalValue) option.selected = true;
            select.appendChild(option);
        });

        select.addEventListener('change', async function() {
            await updateCell(rowId, field, select.value, originalValue);
            finishEdit(false);
        });

        select.addEventListener('blur', function() {
            if (select.value === originalValue) {
                finishEdit(true);
            }
        });

        cell.appendChild(select);
        select.focus();

    } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'cell-input';
        input.value = originalValue;

        input.addEventListener('blur', async function() {
            if (input.value !== originalValue) {
                await updateCell(rowId, field, input.value, originalValue);
            }
            finishEdit(true);
        });

        input.addEventListener('keydown', async function(e) {
            if (e.key === 'Enter') {
                await updateCell(rowId, field, input.value, originalValue);
                input.blur();
                e.preventDefault();
            } else if (e.key === 'Escape') {
                finishEdit(true);
            }
        });

        cell.appendChild(input);
        input.focus();
        input.select();
    }
}

function finishEdit(cancel = false) {
    if (!editingCell) return;

    const rowId = editingCell.closest('tr')?.dataset.id;
    const field = editingCell.dataset.field;
    
    if (rowId && field) {
        const row = tableData.find(r => r.id === rowId);
        if (row) {
            // Use textContent to prevent XSS
            editingCell.textContent = row[field] || '';

            // Re-apply Y/N classes
            if (field === 'confirm_y' || field === 'transfer_100') {
                editingCell.classList.remove('yes', 'no');
                if (row[field] === 'Y') editingCell.classList.add('yes');
                else if (row[field] === 'N') editingCell.classList.add('no');
            }
        }
    }
       
    editingCell.classList.remove('editing');
    editingCell = null;
}

// --- 7. UPDATE LOGIC (FIXED RACE CONDITION) ---
async function updateCell(rowId, field, newValue, originalValue) {
    if (!rowId || !field || newValue === originalValue) {
        return;
    }
    
    const validationError = validateInput(newValue, field);
    if (validationError) {
        showStatus(validationError, true);
        return;
    }

    // Check if there's already a pending update for this cell (FIXED RACE CONDITION)
    const updateKey = `${rowId}-${field}`;
    if (pendingUpdates.has(updateKey)) {
        showStatus('กำลังอัพเดทอยู่ กรุณารอสักครู่', true);
        return;
    }

    // Mark as pending
    pendingUpdates.set(updateKey, true);

    // Update local state immediately (Optimistic UI)
    const rowIndex = tableData.findIndex(r => r.id === rowId);
    if (rowIndex !== -1) {
        // Update content of existing const array
        tableData[rowIndex][field] = newValue;
        originalTableData[rowIndex][field] = newValue;
    }

    try {
        // Execute update with mutex
        await executeUpdateWithMutex(rowId, field, newValue, originalValue);
    } catch (error) {
        // Rollback on error
        if (rowIndex !== -1) {
            tableData[rowIndex][field] = originalValue;
            originalTableData[rowIndex][field] = originalValue;
            renderTable();
        }
        console.error('Update failed:', error);
        showStatus('บันทึกไม่สำเร็จ: ' + error.message, true);
    } finally {
        pendingUpdates.delete(updateKey);
    }
}

function executeUpdateWithMutex(rowId, field, newValue, originalValue) {
    return new Promise((resolve, reject) => {
        updateMutex = updateMutex.then(async () => {
            try {
                const { data, error } = await supabaseClient
                    .from('customers')
                    .update({ [field]: newValue })
                    .eq('id', rowId)
                    .select()
                    .single();

                if (error) throw error;

                const rowIndex = tableData.findIndex(r => r.id === rowId);
                if (rowIndex !== -1 && data) {
                    // Update content of existing const array
                    tableData[rowIndex] = data;
                    originalTableData[rowIndex] = { ...data };
                }
                
                updateStats();
                showStatus('บันทึกสำเร็จ');
                resolve(data);
            } catch (error) {
                reject(error);
            }
        }).catch(error => {
            console.error('Mutex chain error:', error);
            reject(error);
        });
    });
}

// --- 8. ROW OPERATIONS ---
async function addNewRow() {
    if (!['administrator', 'admin', 'sales'].includes(currentUserRole)) {
        showStatus('คุณไม่มีสิทธิ์เพิ่มข้อมูล', true);
        return;
    }

    try {
        showLoading(true);

        const { data: latestLead, error: latestLeadError } = await supabaseClient
            .from('customers')
            .select('lead_code')
            .order('lead_code', { ascending: false })
            .limit(1)
            .single();

        const nextLeadCode = (latestLead && !latestLeadError && latestLead.lead_code) 
            ? parseInt(latestLead.lead_code) + 1 
            : 1001;

        const newRow = {
            lead_code: nextLeadCode.toString(),
            sales: currentUsername,
            date: new Date().toLocaleDateString('th-TH'),
            created_by: currentUserId
        };

        const { data, error } = await supabaseClient
            .from('customers')
            .insert([newRow])
            .select()
            .single();

        if (error) throw error;

        if (data) {
            // Update content of existing const array
            tableData.unshift(data);
            originalTableData.unshift({ ...data });
            renderTable();
            updateStats();
        }
        showStatus('เพิ่มข้อมูลสำเร็จ');
    } catch (error) {
        console.error('Add error:', error);
        showStatus('เพิ่มข้อมูลไม่สำเร็จ: ' + error.message, true);
    } finally {
        showLoading(false);
    }
}

async function deleteRow() {
    if (!['administrator', 'admin'].includes(currentUserRole)) {
        showStatus('คุณไม่มีสิทธิ์ลบข้อมูล', true);
        return;
    }

    if (!contextCell) {
        showStatus('ไม่พบเซลล์ที่เลือก', true);
        return;
    }

    const rowId = contextCell.parentElement?.dataset.id;
    
    if (!rowId) {
        showStatus('ไม่พบ ID ของแถวที่ต้องการลบ', true);
        return;
    }

    if (confirm('ต้องการลบแถวนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
        try {
            showLoading(true);
            operationStates.isDeleting = true;
            
            const { error } = await supabaseClient
                .from('customers')
                .delete()
                .eq('id', rowId);

            if (error) throw error;

            const index = tableData.findIndex(r => r.id === rowId);
            if (index !== -1) {
                // Update content of existing const array
                tableData.splice(index, 1);
                originalTableData.splice(index, 1);
                renderTable();
                updateStats();
            }
            showStatus('ลบข้อมูลสำเร็จ');
        } catch (error) {
            console.error('Delete error:', error);
            showStatus('ลบข้อมูลไม่สำเร็จ: ' + error.message, true);
        } finally {
            showLoading(false);
            operationStates.isDeleting = false;
        }
    }
}

// --- 9. SEARCH & FILTER (FIXED LOGIC ERROR: Minor B) ---
async function fetchSalesList() {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('username');

        if (error) throw error;
        
        // ❌ LOGIC FIX: Update content of existing const array
        salesList.length = 0;
        salesList.push(...(data || [])
            .map(user => user.username)
            .filter(username => username !== null && username.trim() !== ''));
    } catch (error) {
        console.error('Error fetching sales list:', error);
        salesList.length = 0;
        showStatus('ไม่สามารถโหลดรายชื่อเซลล์ได้', true);
    }
}

function populateFilterOptions() {
    const statusFilter = document.getElementById('statusFilter');
    const salesFilter = document.getElementById('salesFilter');

    if (statusFilter) {
        while (statusFilter.options.length > 1) {
            statusFilter.remove(1);
        }
        dropdownOptions.status_1.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            statusFilter.appendChild(option);
        });
    }

    if (salesFilter) {
        while (salesFilter.options.length > 1) {
            salesFilter.remove(1);
        }
        const sortedSalesList = [...salesList].sort((a, b) => a.localeCompare(b));
        sortedSalesList.forEach(sales => {
            const option = document.createElement('option');
            option.value = sales;
            option.textContent = sales;
            salesFilter.appendChild(option);
        });
    }
}

function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

const debouncedSearch = debounce(() => {
    filterTable();
}, 300);

function searchTable(query) {
    debouncedSearch();
}

function filterTable() {
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const salesFilter = document.getElementById('salesFilter')?.value || '';
    const searchQuery = document.getElementById('searchInput')?.value.toLowerCase() || '';

    // Filter using originalTableData
    const filteredData = originalTableData.filter(row => {
        let matchStatus = !statusFilter || row.status_1 === statusFilter;
        let matchSales = !salesFilter || row.sales === salesFilter;
        
        let matchSearch = true;
        if (searchQuery) {
            matchSearch = Object.values(row).some(value =>
                String(value || '').toLowerCase().includes(searchQuery)
            );
        }
        
        return matchStatus && matchSales && matchSearch;
    });

    // ❌ LOGIC FIX: Update content of existing const array
    tableData.length = 0;
    tableData.push(...filteredData);
    
    renderTable();
    updateStats();
}

// --- 10. STATISTICS ---
function updateStats() {
    const totalElement = document.getElementById('totalCustomers');
    const todayElement = document.getElementById('todayCustomers');
    const pendingElement = document.getElementById('pendingCustomers');
    const closedElement = document.getElementById('closedDeals');

    const currentData = tableData;
    
    if (totalElement) totalElement.textContent = currentData.length;

    const today = new Date().toLocaleDateString('th-TH');
    const todayCount = currentData.filter(row => row.date === today).length;
    if (todayElement) todayElement.textContent = todayCount;

    const pending = currentData.filter(row => !row.closed_amount || Number(row.closed_amount) === 0).length;
    if (pendingElement) pendingElement.textContent = pending;

    const closed = currentData.filter(row => row.closed_amount && Number(row.closed_amount) > 0).length;
    if (closedElement) closedElement.textContent = closed;
}

// --- 11. EXPORT FUNCTIONALITY ---
function exportData() {
    try {
        const headers = Object.keys(FIELD_MAPPING).filter(header => header !== '#');
        let csv = '\ufeff' + headers.join(',') + '\n';

        tableData.forEach(row => {
            const rowData = headers.map(header => {
                const field = FIELD_MAPPING[header];
                let val = row[field] === null || row[field] === undefined ? '' : String(row[field]);
                if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                    val = '"' + val.replace(/"/g, '""') + '"';
                }
                return val;
            });
            csv += rowData.join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `beauty_clinic_crm_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showStatus('Export สำเร็จ');
    } catch (error) {
        console.error('Export error:', error);
        showStatus('Export ไม่สำเร็จ', true);
    }
}

// --- 12. CONTEXT MENU & UI HELPER FUNCTIONS ---
document.addEventListener('contextmenu', (e) => {
    const cell = e.target.closest('td');
    if (cell && cell.dataset.field) {
        e.preventDefault();
        contextCell = cell;
        
        const rowId = contextCell.parentElement?.dataset.id;
        const field = contextCell.dataset.field;
        const row = tableData.find(r => r.id === rowId);

        let canEdit = true;
        if (currentUserRole === 'sales') {
             canEdit = row && row.sales === currentUsername && salesEditableFields.includes(field);
        } else if (currentUserRole === 'viewer') {
            canEdit = false;
        }

        updateContextMenuForCell(canEdit);
        showContextMenu(e.pageX, e.pageY);
    }
});

function updateContextMenuForCell(canEdit) {
    const editItem = document.querySelector('#contextMenu .context-menu-item:nth-child(1)');
    const pasteItem = document.querySelector('#contextMenu .context-menu-item:nth-child(3)');
    const clearItem = document.querySelector('#contextMenu .context-menu-item:nth-child(5)');

    if (editItem) editItem.style.display = canEdit ? 'block' : 'none';
    if (pasteItem) pasteItem.style.display = canEdit ? 'block' : 'none';
    if (clearItem) clearItem.style.display = canEdit ? 'block' : 'none';
}

function showContextMenu(x, y) {
    const menu = document.getElementById('contextMenu');
    if (!menu) return;

    menu.style.display = 'block';

    const menuRect = menu.getBoundingClientRect();
    const maxX = window.innerWidth - menuRect.width - 5;
    const maxY = window.innerHeight - menuRect.height - 5;

    menu.style.left = Math.min(x, maxX) + 'px';
    menu.style.top = Math.min(y, maxY) + 'px';
}

document.addEventListener('click', () => {
    const menu = document.getElementById('contextMenu');
    if (menu) menu.style.display = 'none';
});

function showMobileMenu(event, rowIndex) {
    event.stopPropagation();
    const menu = document.getElementById('contextMenu');
    if (!menu) return;

    const row = event.target.closest('tr');
    contextCell = row.querySelector('td:not(.row-number)');
    if (!contextCell) return;
    
    const rowId = contextCell.parentElement?.dataset.id;
    const field = contextCell.dataset.field;
    const dataRow = tableData.find(r => r.id === rowId);

    let canEdit = true;
    if (currentUserRole === 'sales') {
         canEdit = dataRow && dataRow.sales === currentUsername && salesEditableFields.includes(field);
    } else if (currentUserRole === 'viewer') {
        canEdit = false;
    }
    updateContextMenuForCell(canEdit);

    const cellRect = event.target.getBoundingClientRect();

    menu.style.display = 'block';

    const menuRect = menu.getBoundingClientRect();
    const maxX = window.innerWidth - menuRect.width - 5;
    const maxY = window.innerHeight - menuRect.height - 5;

    menu.style.left = Math.min(cellRect.left, maxX) + 'px';
    menu.style.top = Math.min(cellRect.bottom + 5, maxY) + 'px';
}

// Context menu actions
function editCell() {
    if (!contextCell) {
        showStatus('ไม่พบเซลล์ที่เลือก', true);
        return;
    }
    const rowId = contextCell.parentElement?.dataset.id;
    const field = contextCell.dataset.field;

    if (rowId && field) {
        const row = tableData.find(r => r.id === rowId);
        let canEdit = true;
        if (currentUserRole === 'sales') {
            canEdit = row && row.sales === currentUsername && salesEditableFields.includes(field);
        } else if (currentUserRole === 'viewer') {
            canEdit = false;
        }

        if (canEdit || currentUserRole === 'administrator' || currentUserRole === 'admin') {
            startEdit(contextCell, rowId, field);
        } else {
             showStatus('คุณไม่มีสิทธิ์แก้ไขเซลล์นี้', true);
        }
    } else {
        showStatus('ไม่สามารถแก้ไขเซลล์นี้ได้', true);
    }
}

function copyCell() {
    if (!contextCell) {
        showStatus('ไม่พบเซลล์ที่เลือก', true);
        return;
    }
    copiedCell = contextCell.textContent;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(copiedCell).then(() => {
            showStatus('คัดลอกแล้ว');
        }).catch(() => {
            showStatus('คัดลอกแล้ว (ในหน่วยความจำ)');
        });
    } else {
        // Fallback for browsers without clipboard API
        showStatus('คัดลอกแล้ว (ในหน่วยความจำ)');
    }
}

async function pasteCell() {
    if (!contextCell || copiedCell === null) {
        showStatus('ไม่มีข้อมูลที่จะวาง', true);
        return;
    }
    const rowId = contextCell.parentElement?.dataset.id;
    const field = contextCell.dataset.field;

    if (rowId && field) {
        const row = tableData.find(r => r.id === rowId);
        let canEdit = true;
        if (currentUserRole === 'sales') {
            canEdit = row && row.sales === currentUsername && salesEditableFields.includes(field);
        } else if (currentUserRole === 'viewer') {
            canEdit = false;
        }
        
        if (canEdit || currentUserRole === 'administrator' || currentUserRole === 'admin') {
            const originalValue = row[field];
            await updateCell(rowId, field, copiedCell, originalValue);
            showStatus('วางแล้ว');
        } else {
             showStatus('คุณไม่มีสิทธิ์วางข้อมูลในเซลล์นี้', true);
        }
    } else {
        showStatus('ไม่สามารถวางในเซลล์นี้ได้', true);
    }
}

async function clearCell() {
    if (!contextCell) {
        showStatus('ไม่พบเซลล์ที่เลือก', true);
        return;
    }
    const rowId = contextCell.parentElement?.dataset.id;
    const field = contextCell.dataset.field;

    if (rowId && field) {
        const row = tableData.find(r => r.id === rowId);
        let canEdit = true;
        if (currentUserRole === 'sales') {
            canEdit = row && row.sales === currentUsername && salesEditableFields.includes(field);
        } else if (currentUserRole === 'viewer') {
            canEdit = false;
        }

        if (canEdit || currentUserRole === 'administrator' || currentUserRole === 'admin') {
            const originalValue = row[field];
            await updateCell(rowId, field, '', originalValue);
            showStatus('ล้างเซลล์แล้ว');
        } else {
            showStatus('คุณไม่มีสิทธิ์ล้างเซลล์นี้', true);
        }
    } else {
        showStatus('ไม่สามารถล้างเซลล์นี้ได้', true);
    }
}

// --- 13. UI HELPER FUNCTIONS (FIXED MEMORY LEAK) ---
function showStatus(message, isError = false) {
    const indicator = document.getElementById('statusIndicator');
    if (!indicator) return;

    // Clear previous timeout (FIXED MEMORY LEAK)
    if (statusTimeoutId) {
        clearTimeout(statusTimeoutId);
        statusTimeoutId = null;
    }

    indicator.classList.remove('success', 'error');
    indicator.textContent = message;
    indicator.classList.add('show');
    indicator.classList.toggle('error', isError);

    if (!isError) {
        indicator.classList.add('success');
    }

    statusTimeoutId = setTimeout(() => {
        indicator.classList.remove('show');
        statusTimeoutId = null;
    }, 3000);
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('show', show);
    }
}

function showImportModal() {
    if (currentUserRole !== 'administrator') {
        showStatus('คุณไม่มีสิทธิ์นำเข้าข้อมูล', true);
        return;
    }
    const modal = document.getElementById('importModal');
    if (modal) modal.style.display = 'flex';
    const importStatus = document.getElementById('importStatus');
    if (importStatus) importStatus.textContent = '';
}

function hideImportModal() {
    const modal = document.getElementById('importModal');
    if (modal) modal.style.display = 'none';
    const fileInput = document.getElementById('csvFile');
    if (fileInput) fileInput.value = '';
}

// --- 14. IMPORT FUNCTIONALITY (IMPROVED CSV PARSING) ---
async function importData() {
    const fileInput = document.getElementById('csvFile');
    const importStatus = document.getElementById('importStatus');
    const file = fileInput?.files[0];

    if (!file) {
        if (importStatus) importStatus.textContent = 'กรุณาเลือกไฟล์ .csv';
        return;
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        if (importStatus) importStatus.textContent = 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)';
        return;
    }
    
    if (!file.name.endsWith('.csv')) {
        if (importStatus) importStatus.textContent = 'รูปแบบไฟล์ไม่ถูกต้อง กรุณาเลือกไฟล์ .csv';
        return;
    }

    if (importStatus) importStatus.textContent = 'กำลังนำเข้าข้อมูล... โปรดรอสักครู่';
    showLoading(true);
    operationStates.isImporting = true;

    try {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                let text = e.target.result;
                text = text.replace(/^\uFEFF/, ''); // Remove BOM
                
                const parsedData = parseCSV(text);
                if (!parsedData || parsedData.length === 0) {
                    if (importStatus) importStatus.textContent = 'ไม่พบข้อมูลในไฟล์';
                    return;
                }
                
                const htmlHeaders = Array.from(document.querySelectorAll('#excelTable thead th'))
                    .map(th => th.textContent.trim())
                    .filter(h => h !== '#');
                
                const dataToInsert = [];
                const errors = [];

                parsedData.forEach((row, index) => {
                    if (index === 0) return; // Skip header row
                    
                    const newRow = {};
                    let hasValidationError = false;
                    
                    htmlHeaders.forEach((header, colIndex) => {
                        const fieldName = FIELD_MAPPING[header];
                        if (fieldName && row[colIndex] !== undefined) {
                            const value = row[colIndex].trim();
                            const validationError = validateInput(value, fieldName);
                            if (validationError) {
                                errors.push(`แถว ${index + 1} (${header}): ${validationError}`);
                                hasValidationError = true;
                            }
                            newRow[fieldName] = value;
                        }
                    });
                    
                    if (!hasValidationError && Object.keys(newRow).length > 0) {
                        newRow.created_by = currentUserId;
                        newRow.created_at = new Date().toISOString();
                        dataToInsert.push(newRow);
                    }
                });

                if (errors.length > 0 && importStatus) {
                    const errorSummary = errors.slice(0, 5).join('; ');
                    importStatus.textContent = `พบข้อผิดพลาด: ${errorSummary}`;
                }
                
                if (dataToInsert.length === 0) {
                    if (importStatus) importStatus.textContent = 'ไม่มีข้อมูลที่สามารถนำเข้าได้';
                    return;
                }
                
                const { data, error } = await supabaseClient
                    .from('customers')
                    .insert(dataToInsert)
                    .select();

                if (error) throw error;

                if (importStatus) importStatus.textContent = `นำเข้าข้อมูลสำเร็จ ${data.length} แถว`;
                await fetchCustomerData();
                setTimeout(hideImportModal, 2000);
                
            } catch (error) {
                console.error('Import processing error:', error);
                if (importStatus) importStatus.textContent = `การนำเข้าล้มเหลว: ${error.message}`;
            } finally {
                showLoading(false);
                operationStates.isImporting = false;
            }
        };

        reader.onerror = () => {
            if (importStatus) importStatus.textContent = 'เกิดข้อผิดพลาดในการอ่านไฟล์';
            showLoading(false);
            operationStates.isImporting = false;
        };

        reader.readAsText(file, 'utf-8');
    } catch (error) {
        console.error('Import error:', error);
        if (importStatus) importStatus.textContent = `เกิดข้อผิดพลาด: ${error.message}`;
        showLoading(false);
        operationStates.isImporting = false;
    }
}

// Improved CSV parser
function parseCSV(text) {
    const lines = text.split('\n');
    const result = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '') continue;
        
        const row = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            const nextChar = line[j + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    j++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                row.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        row.push(current); // Add last field
        result.push(row);
    }
    
    return result;
}

// --- 15. PLACEHOLDER FUNCTIONS ---
function switchRole() {
    showStatus('ฟีเจอร์ Switch Role กำลังพัฒนา', true);
}

function showSettings() {
    showStatus('หน้าตั้งค่ากำลังพัฒนา', true);
}

// --- 16. KEYBOARD SHORTCUTS ---
document.addEventListener('keydown', (e) => {
    // Ctrl+S to save
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        showStatus('บันทึกอัตโนมัติทำงานอยู่');
    }

    // Ctrl+F to focus search
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.focus();
    }

    // Escape to cancel editing
    if (e.key === 'Escape' && editingCell) {
        finishEdit(true);
    }
});

// --- 17. REAL-TIME SUBSCRIPTION (WITH RECONNECTION) ---
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

function setupRealtimeSubscription() {
    // Clean up existing subscription
    if (realtimeSubscription) {
        supabaseClient.removeChannel(realtimeSubscription);
    }

    realtimeSubscription = supabaseClient
        .channel('customers_changes')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'customers'
        }, handleRealtimeUpdate)
        .on('system', { event: 'error' }, (payload) => {
            console.error('Realtime error:', payload);
            reconnectRealtime();
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Realtime subscription active');
                reconnectAttempts = 0;
            } else if (status === 'CHANNEL_ERROR') {
                console.error('Realtime subscription error');
                reconnectRealtime();
            }
        });
}

function reconnectRealtime() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('Max reconnection attempts reached');
        showStatus('การเชื่อมต่อ Realtime ขัดข้อง', true);
        return;
    }
    
    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    
    setTimeout(() => {
        console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        setupRealtimeSubscription();
    }, delay);
}

function handleRealtimeUpdate(payload) {
    // console.log('Realtime update:', payload); 
    
    // Ignore if busy with local operations
    if (pendingUpdates.size > 0 || operationStates.isDeleting || operationStates.isImporting) {
        return;
    }

    const newRow = payload.new;
    const oldRow = payload.old;

    if (payload.eventType === 'INSERT') {
        if (!tableData.find(r => r.id === newRow.id)) {
            tableData.unshift(newRow);
            originalTableData.unshift({ ...newRow });
            renderTable();
            updateStats();
            showStatus('มีข้อมูลใหม่เข้ามา');
        }
    } else if (payload.eventType === 'UPDATE') {
        const index = tableData.findIndex(r => r.id === newRow.id);
        if (index !== -1) {
            // Don't update if currently editing this row
            if (editingCell && editingCell.closest('tr')?.dataset.id === newRow.id) {
                return;
            }
            
            tableData[index] = newRow;
            originalTableData[index] = { ...newRow };
            renderTable();
            updateStats();
            if (newRow.created_by !== currentUserId) {
                showStatus('ข้อมูลได้รับการอัพเดทจากผู้ใช้อื่น');
            }
        }
    } else if (payload.eventType === 'DELETE') {
        const index = tableData.findIndex(r => r.id === oldRow.id);
        if (index !== -1) {
            tableData.splice(index, 1);
            originalTableData.splice(index, 1);
            renderTable();
            updateStats();
            showStatus('มีข้อมูลถูกลบ');
        }
    }
}

// --- 18. TOUCH EVENTS FOR MOBILE (IMPROVED) ---
let touchStartX = null;
let touchStartY = null;
let touchStartTime = null;
let lastTapTime = 0;

document.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartTime = Date.now();
    }
}, {passive: true});

document.addEventListener('touchend', (e) => {
    if (!touchStartX || !touchStartY || e.changedTouches.length !== 1) {
        return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    const deltaTime = Date.now() - touchStartTime;

    touchStartX = null;
    touchStartY = null;
    touchStartTime = null;

    // Detect tap
    if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && deltaTime < 300) {
        const currentTime = Date.now();
        const tapDelta = currentTime - lastTapTime;
        lastTapTime = currentTime;
        
        // Double tap detection (FIXED UX)
        if (tapDelta < 300) {
            const cell = e.target.closest('td');
            if (cell && cell.dataset.field) {
                const rowId = cell.parentElement?.dataset.id;
                const field = cell.dataset.field;
                if (rowId && field) {
                    startEdit(cell, rowId, field);
                }
            }
        }
    }
}, {passive: true});

// --- 19. CLEANUP ON PAGE UNLOAD ---
window.addEventListener('beforeunload', async () => {
    clearAllTimers();
    if (realtimeSubscription) {
        await supabaseClient.removeChannel(realtimeSubscription);
    }
});

// --- 20. INITIALIZE APP ON LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('excelTable')) {
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                initializeApp();
            } else {
                window.location.href = 'login.html';
            }
        });
    }
});

// --- 21. HANDLE SESSION EXPIRY ---
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        if (!session) {
            clearAllTimers();
            window.location.href = 'login.html';
        }
    }
});

// --- 22. ERROR BOUNDARY ---
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    if (e.message && !e.message.includes('Script error.')) {
        showStatus('เกิดข้อผิดพลาด: ' + (e.error?.message || e.message), true);
    }
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    showStatus('เกิดข้อผิดพลาด: ' + (e.reason?.message || e.reason), true);
});
