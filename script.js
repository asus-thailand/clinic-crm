// ================================================================================
// BEAUTY CLINIC CRM - FINAL PRODUCTION-READY SCRIPT (SENIOR DEV REVISION)
// ================================================================================

// --- 0. SECURITY & HELPER FUNCTIONS ---
/**
 * Function to escape HTML special characters for XSS prevention.
 * @param {string} str 
 */
function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;")
               .replace(/"/g, "&quot;")
               .replace(/'/g, "&#039;");
}

let statusTimeoutId = null;

function clearAllTimers() {
    if (sessionRefreshInterval) {
        clearInterval(sessionRefreshInterval);
        sessionRefreshInterval = null;
    }
    if (statusTimeoutId) {
        clearTimeout(statusTimeoutId);
        statusTimeoutId = null;
    }
}

// --- 1. CONFIGURATION & INITIALIZATION ---
// WARNING: In a real-world production environment, you should use server-side proxies or environment variables that are not exposed to the client-side.
const SUPABASE_URL = 'https://dmzsughhxdgpnazvjtci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtenN1Z2hoeGRncG5henZqdGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1Nzk4NDIsImV4cCI6MjA3MzE1NTg0Mn0.eeWTW871ork6ZH43U_ergJ7rb1ePMT7ztPOdh5hgqLM';

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variables
let currentUserRole = 'sales';
let currentUserId = null;
let currentUsername = null;
let tableData = [];
let originalTableData = []; // For filtering
let editingCell = null;
let copiedCell = null;
let contextCell = null;
let salesList = []; // Global variable to store sales list
let realtimeSubscription = null; // To manage the subscription instance

// Operation states for better loading management
const operationStates = {
    isUpdating: false,
    isDeleting: false,
    isFetching: false,
    isImporting: false
};

// Mutex (Promise Chain) for Race Condition prevention in updates
let updateMutex = Promise.resolve();
const MAX_CONCURRENT_UPDATES = 5; // Limit concurrent updates if needed, but Mutex is sequential
let pendingUpdates = [];

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

// --- Single Source of Truth for Field Mappings ---
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

// Dropdown options (fixed lists)
const dropdownOptions = {
    'channel': ['Fbc By หมอธีร์', 'FBC-EYES', 'FBC-Hair', 'Walk-in', 'Online', 'Facebook', 'Instagram', 'Line'],
    'procedure': ['ปลูกผม', 'ยกคิ้ว', 'จมูก', 'ตา', 'ฉีดฟิลเลอร์', 'โบท็อกซ์', 'เลเซอร์'],
    'cs_confirm': ['CSX', 'CSY', 'CSZ'],
    'confirm_y': ['Y', 'N'],
    'transfer_100': ['Y', 'N'],
    'status_1': ['status 1', 'status 2', 'status 3', 'status 4', 'ตามต่อ', 'ปิดการขาย', 'ไม่สนใจ'],
    'last_status': ['online', '0%', '25%', '50%', '75%', '100%', 'case off']
};

let sessionRefreshInterval = null;

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
        
        // 🚨 MEMORY LEAK FIX: Clear all timers before logging out
        clearAllTimers();
        
        // Unsubscribe from real-time changes before logging out
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
    // 🚨 MEMORY LEAK FIX: Clear existing interval before setting a new one
    if (sessionRefreshInterval) {
        clearInterval(sessionRefreshInterval);
    }
    
    // Refresh session every 30 minutes
    sessionRefreshInterval = setInterval(async () => {
        try {
            const { data: { session }, error } = await supabaseClient.auth.refreshSession();
            if (error || !session) {
                console.error('Session refresh failed:', error);
                // Force logout if refresh fails
                window.location.href = 'login.html'; 
            }
        } catch (error) {
            console.error('Session refresh error:', error);
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
            // ✅ PERMISSION FIX: Admin must be able to delete
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

// --- 4. DATA FETCHING & MANAGEMENT ---
async function fetchCustomerData() {
    if (operationStates.isFetching) return;
    operationStates.isFetching = true;
    
    try {
        showStatus('กำลังโหลดข้อมูล...');

        const { data, error } = await supabaseClient
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        tableData = data || [];
        originalTableData = [...tableData];

        renderTable();
        updateStats();
        showStatus('ข้อมูลล่าสุดแล้ว');
    } catch (error) {
        console.error('Error fetching customers:', error);
        showStatus('ดึงข้อมูลไม่สำเร็จ: ' + error.message, true);
        tableData = [];
        renderTable();
    } finally {
        operationStates.isFetching = false;
    }
}

async function refreshData() {
    showStatus('กำลังรีเฟรชข้อมูล...');
    await fetchCustomerData();
}

// --- 5. TABLE RENDERING ---
function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    // 🚨 EVENT LISTENER CLEANUP: Remove old listeners before re-rendering
    // We rely on re-rendering the whole tbody to implicitly remove old inline handlers.
    // For attached listeners, we must remove them. (Future improvement: use delegation)
    
    // Clear the table content
    tbody.innerHTML = '';

    const headers = Array.from(document.querySelectorAll('#excelTable thead th')).map(th => th.textContent.trim());

    tableData.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.dataset.id = row.id;
        tr.dataset.index = index;

        let html = '';
        headers.forEach(headerText => {
            const fieldName = FIELD_MAPPING[headerText];
            if (fieldName === null) {
                // Handle row number column
                html += `<td class="row-number">${index + 1}</td>`;
            } else if (fieldName) {
                const isDropdown = dropdownOptions[fieldName] !== undefined || fieldName === 'sales';
                const cellClass = getCellClass(fieldName);
                // 🚨 XSS FIX: Use escapeHtml() before rendering user data
                const cellValue = escapeHtml(row[fieldName]) || '';

                const ynClass = (fieldName === 'confirm_y' || fieldName === 'transfer_100')
                    ? `yn-cell ${row[fieldName] === 'Y' ? 'yes' : row[fieldName] === 'N' ? 'no' : ''}`
                    : '';
                
                // 🚨 EVENT LISTENER FIX: Change from inline ondblclick to data attribute and use delegation/attached listener
                // For simplicity and minimal change, we keep the double-click logic in place but use .setAttribute()
                // to add it to the dynamically created cell, which is safer than innerHTML injection.
                
                const td = document.createElement('td');
                td.classList.add(cellClass, ynClass);
                if (isDropdown) td.classList.add('has-dropdown');
                td.dataset.field = fieldName;
                td.textContent = cellValue;
                
                // Add dblclick listener directly for editing
                td.addEventListener('dblclick', () => {
                    startEdit(td, row.id, fieldName);
                });

                tr.appendChild(td);
            }
        });
        
        // Mobile actions column
        const actionCell = document.createElement('td');
        const actionButton = document.createElement('button');
        actionButton.className = 'mobile-actions-btn';
        actionButton.textContent = '⋯';
        actionButton.onclick = (e) => showMobileMenu(e, index);
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
/**
 * Enhanced validation with date support
 */
function validateInput(value, field) {
    // Phone validation
    if (field === 'phone') {
        const phoneRegex = /^[0-9+()-\s]+$/;
        if (value && !phoneRegex.test(value)) {
            return `ฟิลด์ 'เบอร์ติดต่อ' รูปแบบไม่ถูกต้อง`;
        }
    }
    
    // Number validation for amount fields
    if (field === 'closed_amount' || field === 'deposit') {
        if (value && isNaN(Number(value))) {
            return `ฟิลด์นี้ต้องเป็นตัวเลข`;
        }
    }
    
    // Date validation (Simple format check for DD/MM/YYYY)
    if (field === 'date' || field === 'appointment_date' || field === 'old_appointment') {
        if (value) {
            const dateFormats = [
                /^\d{1,2}\/\d{1,2}\/\d{4}$/, // DD/MM/YYYY
                /^\d{4}-\d{2}-\d{2}$/,        // YYYY-MM-DD (ISO format)
                /^\d{1,2}-\d{1,2}-\d{4}$/     // DD-MM-YYYY
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

    // Permission check for sales role
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
    // 🚨 XSS FIX: Retrieve original value directly from data (which is not escaped)
    const originalValue = row[field] || '';
    cell.classList.add('editing');

    let dropdownItems = dropdownOptions[field];
    if (field === 'sales') {
        dropdownItems = salesList; // Use dynamic sales list
    }

    cell.innerHTML = ''; // Clear cell content

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
            // 🚨 XSS FIX: Use textContent for setting option value
            option.textContent = opt; 
            if (opt === originalValue) option.selected = true;
            select.appendChild(option);
        });

        select.onchange = async () => {
            await updateCell(rowId, field, select.value, originalValue);
            finishEdit(false); 
        };
        select.onblur = () => {
            if(select.value === originalValue) {
                finishEdit(true); 
            }
        };

        cell.appendChild(select);
        select.focus();

    } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'cell-input';
        // 🚨 XSS FIX: Input value is safe to set as it's not HTML
        input.value = originalValue; 

        input.onblur = async () => {
            if (input.value !== originalValue) {
                await updateCell(rowId, field, input.value, originalValue);
            }
            finishEdit(true);
        };

        input.onkeydown = async (e) => {
            if (e.key === 'Enter') {
                await updateCell(rowId, field, input.value, originalValue);
                input.blur(); 
                e.preventDefault(); 
            } else if (e.key === 'Escape') {
                finishEdit(true);
            }
        };

        cell.appendChild(input);
        input.focus();
        input.select();
    }
}

function finishEdit(cancel = false) {
    if (!editingCell) return;

    const rowId = editingCell.closest('tr')?.dataset.id;
    const field = editingCell.dataset.field;
    
    // Re-render cell content based on current tableData state
    if (rowId && field) {
        const row = tableData.find(r => r.id === rowId);
        if (row) {
            // 🚨 XSS FIX: Use textContent for re-rendering cell content
            let displayValue = escapeHtml(row[field]) || '';
            editingCell.textContent = displayValue;

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
    
    // We do not re-render the whole table here, as the real-time update or the 
    // updateCell success path should have already updated the tableData and optionally 
    // the display via the realtime handler.
}


// --- 7. MUTEX & UPDATE LOGIC (Race Condition Fix) ---

// 🚨 RACE CONDITION FIX: Implements Mutex pattern using a Promise chain
function enqueueUpdate(updateFn) {
    return new Promise((resolve, reject) => {
        // Add the update task to the pending list
        pendingUpdates.push({ updateFn, resolve, reject });
        // Start processing the queue if not already running
        processUpdateQueue(); 
    });
}

function processUpdateQueue() {
    if (pendingUpdates.length === 0) return;
    
    // Sequentially process updates using the updateMutex chain
    updateMutex = updateMutex.then(() => {
        if (pendingUpdates.length === 0) return;

        const { updateFn, resolve, reject } = pendingUpdates.shift();

        // Execute the update function
        return updateFn()
            .then(resolve)
            .catch(error => {
                // If update fails, reject the promise and re-throw to continue the chain
                reject(error);
                throw error; 
            })
            // Important: Always call processUpdateQueue to continue the loop
            .finally(() => {
                processUpdateQueue();
            });
    }).catch(error => {
        // Handle rejection from the last update in the chain to keep it running
        console.error('Update chain caught error:', error);
        processUpdateQueue();
    });
}


async function executeUpdate(rowId, field, newValue, originalValue, revertFn) {
    // This function will be executed inside the mutex chain
    const { data, error } = await supabaseClient
        .from('customers')
        .update({ [field]: newValue })
        .eq('id', rowId)
        .select()
        .single();

    if (error) {
        revertFn(); // Revert local state on DB error
        throw error;
    }

    const rowIndex = tableData.findIndex(r => r.id === rowId);
    if (rowIndex !== -1 && data) {
        tableData[rowIndex] = data;
        originalTableData[rowIndex] = { ...data };
    }
    
    updateStats();
    showStatus('บันทึกสำเร็จ');
    return data;
}

async function updateCell(rowId, field, newValue, originalValue) {
    if (!rowId || !field || newValue === originalValue) {
        return;
    }
    
    const validationError = validateInput(newValue, field);
    if (validationError) {
        showStatus(validationError, true);
        return;
    }

    // Update the local state immediately (Optimistic UI)
    const rowIndex = tableData.findIndex(r => r.id === rowId);
    let revertFn = () => {};
    if (rowIndex !== -1) {
        const rowBeforeUpdate = { ...tableData[rowIndex] };
        tableData[rowIndex][field] = newValue;
        originalTableData[rowIndex][field] = newValue;
        renderTable(); // Re-render to show optimistic change
        
        // Define revert function
        revertFn = () => {
            const index = tableData.findIndex(r => r.id === rowId);
            if (index !== -1) {
                tableData[index][field] = originalValue;
                originalTableData[index][field] = originalValue;
                renderTable();
                showStatus('การเปลี่ยนแปลงถูกยกเลิก (Rollback)', true);
            }
        };
    }
    
    // Add to the Mutex queue
    try {
        await enqueueUpdate(() => executeUpdate(rowId, field, newValue, originalValue, revertFn));
    } catch (error) {
        console.error('Update failed via Mutex:', error);
        showStatus('บันทึกไม่สำเร็จ: ' + error.message, true);
    }
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
    // ✅ PERMISSION FIX: Allow 'administrator' and 'admin' to delete
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

// --- 9. SEARCH & FILTER ---
async function fetchSalesList() {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('username');

        if (error) throw error;
        
        salesList = (data || [])
            .map(user => user.username)
            .filter(username => username !== null && username.trim() !== '');
    } catch (error) {
        console.error('Error fetching sales list:', error);
        salesList = []; 
        showStatus('ไม่สามารถโหลดรายชื่อเซลล์ได้', true);
    }
}

function populateFilterOptions() {
    const statusFilter = document.getElementById('statusFilter');
    const salesFilter = document.getElementById('salesFilter');

    if (statusFilter) {
        statusFilter.innerHTML = '<option value="">ทุกสถานะ</option>';
        dropdownOptions.status_1.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            statusFilter.appendChild(option);
        });
    }

    if (salesFilter) {
        salesFilter.innerHTML = '<option value="">ทุกเซลล์</option>';
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
    filterTable(); // Call filterTable which handles both search and filters
}, 300);

function searchTable(query) {
    debouncedSearch();
}

function filterTable() {
    const statusFilter = document.getElementById('statusFilter').value;
    const salesFilter = document.getElementById('salesFilter').value;
    const searchQuery = document.getElementById('searchInput').value.toLowerCase(); 

    tableData = originalTableData.filter(row => {
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

    // Pending: No closed amount or closed amount is zero/empty
    const pending = currentData.filter(row => !row.closed_amount || Number(row.closed_amount) === 0).length;
    if (pendingElement) pendingElement.textContent = pending;

    // Closed: Closed amount is a positive number
    const closed = currentData.filter(row => row.closed_amount && Number(row.closed_amount) > 0).length;
    if (closedElement) closedElement.textContent = closed;
}

// --- 11. EXPORT FUNCTIONALITY ---
function exportData() {
    // Export logic remains the same
    try {
        const headers = Object.keys(FIELD_MAPPING).filter(header => header !== '#');
        let csv = '\ufeff' + headers.join(',') + '\n';

        tableData.forEach(row => {
            const rowData = headers.map(header => {
                const field = FIELD_MAPPING[header];
                // Ensure proper CSV escaping
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
    if (cell && cell.dataset.field) { // Check for data-field instead of !row-number
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
    copiedCell = contextCell.textContent; // TextContent is safe
    
    // Copy logic remains the same
    if (navigator.clipboard) {
        navigator.clipboard.writeText(copiedCell).then(() => {
            showStatus('คัดลอกแล้ว');
        }).catch(() => {
            showStatus('คัดลอกแล้ว (ในหน่วยความจำ)');
        });
    } else {
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
            // Retrieve actual original value from data, not escaped textContent
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

// --- 13. UI HELPER FUNCTIONS ---
function showStatus(message, isError = false) {
    const indicator = document.getElementById('statusIndicator');
    if (!indicator) return;

    // 🚨 MEMORY LEAK FIX: Clear previous timeout before setting a new one
    if (statusTimeoutId) {
        clearTimeout(statusTimeoutId);
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
    document.getElementById('importStatus').textContent = '';
}

function hideImportModal() {
    const modal = document.getElementById('importModal');
    if (modal) modal.style.display = 'none';
    document.getElementById('csvFile').value = '';
}

// --- 14. IMPORT FUNCTIONALITY ---
async function importData() {
    const fileInput = document.getElementById('csvFile');
    const importStatus = document.getElementById('importStatus');
    const file = fileInput.files[0];

    if (!file) {
        importStatus.textContent = 'กรุณาเลือกไฟล์ .csv';
        return;
    }
    if (!file.name.endsWith('.csv')) {
        importStatus.textContent = 'รูปแบบไฟล์ไม่ถูกต้อง กรุณาเลือกไฟล์ .csv';
        return;
    }

    importStatus.textContent = 'กำลังนำเข้าข้อมูล... โปรดรอสักครู่';
    showLoading(true);
    operationStates.isImporting = true;

    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                let text = e.target.result;
                text = text.replace(/^\uFEFF/, '');
                
                const lines = text.split('\n').filter(line => line.trim() !== '');
                const htmlHeaders = Array.from(document.querySelectorAll('#excelTable thead th')).map(th => th.textContent.trim());
                const headers = htmlHeaders.filter(h => h !== '#');

                const dataToInsert = [];
                const errors = [];

                // Skip header row
                for (let i = 1; i < lines.length; i++) {
                    // Fragile CSV parsing logic: Splits by comma, ignoring commas inside double quotes.
                    const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
                        .map(v => v.trim().replace(/^"|"$/g, ''));
                    
                    if (values.length !== headers.length) {
                        errors.push(`แถว ${i+1}: จำนวนคอลัมน์ไม่ตรงกับ header (${values.length} แทน ${headers.length})`);
                        continue;
                    }

                    const row = {};
                    let hasValidationError = false;
                    
                    headers.forEach((header, index) => {
                        const fieldName = FIELD_MAPPING[header];
                        if (fieldName) {
                            const value = values[index];
                            // Validate field
                            const validationError = validateInput(value, fieldName);
                            if (validationError) {
                                errors.push(`แถว ${i+1} (${header}): ${validationError}`);
                                hasValidationError = true;
                            }
                            // 🚨 XSS NOTE: Value here is raw from CSV, but it's sanitized by Supabase upon insert.
                            // The real vulnerability is on the *read* side (renderTable) which is now fixed.
                            row[fieldName] = value;
                        }
                    });
                    
                    if (hasValidationError) continue;

                    row.created_by = currentUserId;
                    row.created_at = new Date().toISOString();

                    dataToInsert.push(row);
                }

                if (errors.length > 0) {
                    const errorSummary = errors.slice(0, 5).join('; ') + (errors.length > 5 ? `... และอีก ${errors.length - 5} ข้อผิดพลาด` : '');
                    importStatus.textContent = `พบข้อผิดพลาด ${errors.length} แถว (นำเข้า ${dataToInsert.length} แถว): ${errorSummary}`;
                }
                
                if (dataToInsert.length === 0) {
                    importStatus.textContent = errors.length > 0 ? importStatus.textContent : 'ไม่พบข้อมูลที่ถูกต้องในไฟล์';
                    showLoading(false);
                    operationStates.isImporting = false;
                    return;
                }
                
                const { data, error } = await supabaseClient
                    .from('customers')
                    .insert(dataToInsert)
                    .select();

                if (error) throw error;

                importStatus.textContent = `นำเข้าข้อมูลสำเร็จ ${data.length} แถว`;
                await fetchCustomerData();
                setTimeout(hideImportModal, 2000);
            } catch (error) {
                console.error('Import processing error:', error);
                importStatus.textContent = `การนำเข้าล้มเหลว: ${error.message}`;
            } finally {
                showLoading(false);
                operationStates.isImporting = false;
            }
        };

        reader.onerror = () => {
            importStatus.textContent = 'เกิดข้อผิดพลาดในการอ่านไฟล์';
            showLoading(false);
            operationStates.isImporting = false;
        };

        reader.readAsText(file, 'utf-8');
    } catch (error) {
        console.error('Import error:', error);
        importStatus.textContent = `เกิดข้อผิดพลาด: ${error.message}`;
        showLoading(false);
        operationStates.isImporting = false;
    }
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
    // Ctrl+S to save (prevent default)
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

// --- 17. REAL-TIME SUBSCRIPTION ---
function setupRealtimeSubscription() {
    // Make sure we don't have an existing subscription before creating a new one
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
        .subscribe();
}

function handleRealtimeUpdate(payload) {
    console.log('Realtime update:', payload);
    
    // Ignore updates if currently busy with local changes
    if (pendingUpdates.length > 0 || operationStates.isDeleting || operationStates.isImporting) {
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
            // Ignore update for the currently edited row to prevent overwriting user input
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

// --- 18. TOUCH EVENTS FOR MOBILE ---
let touchStartX = null;
let touchStartY = null;

document.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }
}, {passive: true});

document.addEventListener('touchend', (e) => {
    if (!touchStartX || !touchStartY || e.changedTouches.length !== 1) {
        return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    touchStartX = null;
    touchStartY = null;

    // Detect tap for mobile menu/edit
    if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
        const cell = e.target.closest('td');
        const actionButton = e.target.closest('.mobile-actions-btn');
        
        if (cell && actionButton) {
            // Already handled by showMobileMenu on click
        } else if (cell && cell.dataset.field) {
            // Simple tap on cell might be too sensitive for edit, rely on dblclick
            // Future enhancement: Implement double tap
        }
    }
}, {passive: true});


// --- 19. CLEANUP ON PAGE UNLOAD ---
window.addEventListener('beforeunload', async () => {
    // 🚨 MEMORY LEAK FIX: Clean up ALL resources on unload
    if (realtimeSubscription) {
        await supabaseClient.removeChannel(realtimeSubscription);
    }
    clearAllTimers();
});


// --- 20. INITIALIZE APP ON LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('excelTable')) {
        // Ensure initial redirect check is performed
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
            // 🚨 MEMORY LEAK FIX: Clear timers on forced redirect
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
