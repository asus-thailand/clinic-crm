// ================================================================================
// BEAUTY CLINIC CRM - FIXED COMPLETE SCRIPT
// ================================================================================

// --- 1. CONFIGURATION & INITIALIZATION ---
// Supabase Configuration
// WARNING: In a real-world production environment, you should use server-side proxies or environment variables that are not exposed to the client-side.
// For demonstration purposes, we keep the keys here.
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

// Update queue for handling race conditions
let updateQueue = [];
let isProcessingQueue = false;

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

// Session refresh interval
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
        
        // Clear session refresh interval
        if (sessionRefreshInterval) {
            clearInterval(sessionRefreshInterval);
            sessionRefreshInterval = null;
        }
        
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
    // Refresh session every 30 minutes
    sessionRefreshInterval = setInterval(async () => {
        try {
            const { data: { session }, error } = await supabaseClient.auth.refreshSession();
            if (error || !session) {
                console.error('Session refresh failed:', error);
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
            // ✅ จุดที่ 1: แก้ไขสิทธิ์ canDelete จาก false เป็น true
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
                const cellValue = row[fieldName] || '';

                const ynClass = (fieldName === 'confirm_y' || fieldName === 'transfer_100')
                    ? `yn-cell ${cellValue === 'Y' ? 'yes' : cellValue === 'N' ? 'no' : ''}`
                    : '';

                html += `<td class="${cellClass} ${isDropdown ? 'has-dropdown' : ''} ${ynClass}"
                          ondblclick="startEdit(this, '${row.id}', '${fieldName}')"
                          data-field="${fieldName}">${cellValue}</td>`;
            }
        });
        
        // Mobile actions column
        html += `<td><button class="mobile-actions-btn" onclick="showMobileMenu(event, ${index})">⋯</button></td>`;
        
        tr.innerHTML = html;
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
    
    // Date validation
    if (field === 'date' || field === 'appointment_date' || field === 'old_appointment') {
        if (value) {
            // Allow multiple date formats
            const dateFormats = [
                /^\d{1,2}\/\d{1,2}\/\d{4}$/, // DD/MM/YYYY
                /^\d{4}-\d{2}-\d{2}$/,        // YYYY-MM-DD
                /^\d{1,2}-\d{1,2}-\d{4}$/     // DD-MM-YYYY
            ];
            
            const isValidFormat = dateFormats.some(regex => regex.test(value));
            if (!isValidFormat) {
                return 'รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น DD/MM/YYYY)';
            }
            
            // Try to parse date to check validity
            const parts = value.split(/[\/\-]/);
            if (parts.length === 3) {
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]);
                const year = parseInt(parts[2]);
                
                if (month < 1 || month > 12) {
                    return 'เดือนไม่ถูกต้อง (1-12)';
                }
                if (day < 1 || day > 31) {
                    return 'วันไม่ถูกต้อง (1-31)';
                }
                if (year < 1900 || year > 2100) {
                    return 'ปีไม่ถูกต้อง';
                }
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
    const originalValue = row[field] || '';
    cell.classList.add('editing');

    let dropdownItems = dropdownOptions[field];
    if (field === 'sales') {
        dropdownItems = salesList; // Use dynamic sales list
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

        select.onchange = async () => {
            await updateCell(rowId, field, select.value, originalValue);
        };
        select.onblur = () => finishEdit(false);

        cell.innerHTML = '';
        cell.appendChild(select);
        select.focus();

    } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'cell-input';
        input.value = originalValue;

        input.onblur = async () => {
            if (input.value !== originalValue) {
                await updateCell(rowId, field, input.value, originalValue);
            } else {
                finishEdit(true);
            }
        };

        input.onkeydown = async (e) => {
            if (e.key === 'Enter') {
                await updateCell(rowId, field, input.value, originalValue);
            } else if (e.key === 'Escape') {
                finishEdit(true);
            }
        };

        cell.innerHTML = '';
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
            editingCell.textContent = row[field] || '';

            if (field === 'confirm_y' || field === 'transfer_100') {
                editingCell.className = editingCell.className.replace(/\b(yes|no)\b/g, '');
                if (row[field] === 'Y') editingCell.classList.add('yes');
                else if (row[field] === 'N') editingCell.classList.add('no');
            }
        }
    } else {
        editingCell.textContent = editingCell.querySelector('input')?.value || editingCell.querySelector('select')?.value || '';
    }
       
    editingCell.classList.remove('editing');
    editingCell = null;
}

// Enhanced update queue processor
async function processUpdateQueue() {
    if (isProcessingQueue || updateQueue.length === 0) return;
    
    isProcessingQueue = true;
    
    while (updateQueue.length > 0) {
        const update = updateQueue.shift();
        try {
            await executeUpdate(update);
        } catch (error) {
            console.error('Update failed:', error);
            // Revert on failure
            if (update.revert) {
                update.revert();
            }
        }
    }
    
    isProcessingQueue = false;
}

async function executeUpdate(update) {
    const { rowId, field, newValue, originalValue } = update;
    
    const { data, error } = await supabaseClient
        .from('customers')
        .update({ [field]: newValue })
        .eq('id', rowId)
        .select()
        .single();

    if (error) throw error;

    const rowIndex = tableData.findIndex(r => r.id === rowId);
    if (rowIndex !== -1 && data) {
        tableData[rowIndex] = data;
        originalTableData[rowIndex] = { ...data };
    }
    
    updateStats();
    showStatus('บันทึกสำเร็จ');
}

async function updateCell(rowId, field, newValue, originalValue) {
    if (!rowId || !field) {
        showStatus('ข้อผิดพลาด: ข้อมูลไม่ครบถ้วน', true);
        return;
    }
    
    // Validate input before sending to DB
    const validationError = validateInput(newValue, field);
    if (validationError) {
        showStatus(validationError, true);
        
        // Rollback on validation error
        const rowIndex = tableData.findIndex(r => r.id === rowId);
        if (rowIndex !== -1) {
            tableData[rowIndex][field] = originalValue;
            originalTableData[rowIndex][field] = originalValue;
            renderTable();
        }

        finishEdit(true);
        return;
    }

    // Add to update queue
    updateQueue.push({
        rowId,
        field,
        newValue,
        originalValue,
        revert: () => {
            const rowIndex = tableData.findIndex(r => r.id === rowId);
            if (rowIndex !== -1) {
                tableData[rowIndex][field] = originalValue;
                originalTableData[rowIndex][field] = originalValue;
                renderTable();
            }
        }
    });
    
    finishEdit();
    processUpdateQueue();
}

// --- 7. ROW OPERATIONS ---
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

        const nextLeadCode = (latestLead && !latestLeadError) ? parseInt(latestLead.lead_code) + 1 : 1001;

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
    // ✅ จุดที่ 2: แก้ไขเงื่อนไขการตรวจสอบสิทธิ์
    // จากเดิม: if (currentUserRole !== 'administrator')
    // เป็น:   if (!['administrator', 'admin'].includes(currentUserRole))
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

// --- 8. SEARCH & FILTER ---
async function fetchSalesList() {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('username');

        if (error) throw error;

        // Check if data exists and is an array
        if (!data || !Array.isArray(data)) {
            salesList = [];
            return;
        }

        // Filter out null usernames and store the list
        salesList = data.map(user => user.username).filter(username => username !== null);
    } catch (error) {
        console.error('Error fetching sales list:', error);
        salesList = []; // Set default empty array
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
        salesList.forEach(sales => {
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

const debouncedSearch = debounce((query) => {
    if (!query) {
        tableData = [...originalTableData];
        renderTable();
        updateStats();
        return;
    }

    const searchQuery = query.toLowerCase();
    tableData = originalTableData.filter(row => {
        return Object.values(row).some(value =>
            String(value || '').toLowerCase().includes(searchQuery)
        );
    });

    renderTable();
    updateStats();
}, 300);

function searchTable(query) {
    debouncedSearch(query);
}

function filterTable() {
    const statusFilter = document.getElementById('statusFilter').value;
    const salesFilter = document.getElementById('salesFilter').value;

    tableData = originalTableData.filter(row => {
        let matchStatus = !statusFilter || row.status_1 === statusFilter;
        let matchSales = !salesFilter || row.sales === salesFilter;
        return matchStatus && matchSales;
    });

    renderTable();
    updateStats();
}

// --- 9. STATISTICS ---
function updateStats() {
    const totalElement = document.getElementById('totalCustomers');
    const todayElement = document.getElementById('todayCustomers');
    const pendingElement = document.getElementById('pendingCustomers');
    const closedElement = document.getElementById('closedDeals');

    if (totalElement) totalElement.textContent = tableData.length;

    const today = new Date().toLocaleDateString('th-TH');
    const todayCount = tableData.filter(row => row.date === today).length;
    if (todayElement) todayElement.textContent = todayCount;

    const pending = tableData.filter(row => !row.closed_amount).length;
    if (pendingElement) pendingElement.textContent = pending;

    const closed = tableData.filter(row => row.closed_amount).length;
    if (closedElement) closedElement.textContent = closed;
}

// --- 10. EXPORT FUNCTIONALITY ---
function exportData() {
    try {
        const headers = Object.keys(FIELD_MAPPING).filter(header => header !== '#');
        let csv = '\ufeff' + headers.join(',') + '\n';

        tableData.forEach(row => {
            const rowData = headers.map(header => {
                const field = FIELD_MAPPING[header];
                return row[field] || '';
            });
            const formattedRowData = rowData.map(val => `"${String(val).replace(/"/g, '""')}"`);
            csv += formattedRowData.join(',') + '\n';
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

// --- 11. CONTEXT MENU ---
document.addEventListener('contextmenu', (e) => {
    const cell = e.target.closest('td');
    if (cell && !cell.classList.contains('row-number')) {
        e.preventDefault();
        contextCell = cell;
        showContextMenu(e.pageX, e.pageY);
    }
});

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

    contextCell = event.target.closest('tr').querySelector('td:not(.row-number)');
    if (!contextCell) return;

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
        startEdit(contextCell, rowId, field);
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
        const originalValue = contextCell.textContent;
        await updateCell(rowId, field, copiedCell, originalValue);
        showStatus('วางแล้ว');
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
        const originalValue = contextCell.textContent;
        await updateCell(rowId, field, '', originalValue);
        showStatus('ล้างเซลล์แล้ว');
    } else {
        showStatus('ไม่สามารถล้างเซลล์นี้ได้', true);
    }
}

function insertRowAbove() {
    showStatus('กำลังพัฒนาฟีเจอร์นี้', true);
}

function insertRowBelow() {
    showStatus('กำลังพัฒนาฟีเจอร์นี้', true);
}

// --- 12. UI HELPER FUNCTIONS ---
function showStatus(message, isError = false) {
    const indicator = document.getElementById('statusIndicator');
    if (!indicator) return;

    indicator.textContent = message;
    indicator.classList.add('show');
    indicator.classList.toggle('error', isError);

    clearTimeout(indicator.hideTimeout);
    indicator.hideTimeout = setTimeout(() => {
        indicator.classList.remove('show');
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

// --- 13. IMPORT FUNCTIONALITY ---
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
                // Remove BOM if present
                text = text.replace(/^\uFEFF/, '');
                
                const lines = text.split('\n').filter(line => line.trim() !== '');

                // Use headers from HTML to map fields
                const htmlHeaders = Array.from(document.querySelectorAll('#excelTable thead th')).map(th => th.textContent.trim());
                const headers = htmlHeaders.filter(h => h !== '#');

                const dataToInsert = [];
                const errors = [];

                // Skip header row
                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
                        .map(v => v.trim().replace(/^"|"$/g, ''));
                    
                    if (values.length !== headers.length) {
                        errors.push(`แถว ${i+1}: จำนวนคอลัมน์ไม่ตรงกับ header`);
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
                                errors.push(`แถว ${i+1}: ${validationError}`);
                                hasValidationError = true;
                            }
                            row[fieldName] = value;
                        }
                    });
                    
                    if (hasValidationError) continue;

                    row.created_by = currentUserId;
                    row.created_at = new Date().toISOString();

                    dataToInsert.push(row);
                }

                if (errors.length > 0 && errors.length < 10) {
                    importStatus.textContent = `พบข้อผิดพลาด ${errors.length} แถว: ${errors.join('; ')}`;
                } else if (errors.length >= 10) {
                    importStatus.textContent = `พบข้อผิดพลาดมากกว่า 10 แถว กรุณาตรวจสอบไฟล์`;
                }
                
                if (dataToInsert.length === 0) {
                    importStatus.textContent = 'ไม่พบข้อมูลที่ถูกต้องในไฟล์';
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

// --- 14. PLACEHOLDER FUNCTIONS ---
function switchRole() {
    showStatus('ฟีเจอร์ Switch Role กำลังพัฒนา', true);
}

function showSettings() {
    showStatus('หน้าตั้งค่ากำลังพัฒนา', true);
}

// --- 15. KEYBOARD SHORTCUTS ---
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

// --- 16. REAL-TIME SUBSCRIPTION ---
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

    if (payload.eventType === 'INSERT') {
        if (!tableData.find(r => r.id === payload.new.id)) {
            tableData.unshift(payload.new);
            originalTableData.unshift({ ...payload.new });
            renderTable();
            updateStats();
            showStatus('มีข้อมูลใหม่เข้ามา');
        }
    } else if (payload.eventType === 'UPDATE') {
        const index = tableData.findIndex(r => r.id === payload.new.id);
        if (index !== -1) {
            tableData[index] = payload.new;
            originalTableData[index] = { ...payload.new };
            renderTable();
            updateStats();
        }
    } else if (payload.eventType === 'DELETE') {
        const index = tableData.findIndex(r => r.id === payload.old.id);
        if (index !== -1) {
            tableData.splice(index, 1);
            originalTableData.splice(index, 1);
            renderTable();
            updateStats();
            showStatus('มีข้อมูลถูกลบ');
        }
    }
}

// --- 17. TOUCH EVENTS FOR MOBILE ---
let touchStartX = null;
let touchStartY = null;

document.addEventListener('touchstart', handleTouchStart, {passive: false});
document.addEventListener('touchend', handleTouchEnd, {passive: false});

function handleTouchStart(e) {
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}

function handleTouchEnd(e) {
    if (!touchStartX || !touchStartY) {
        return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    // Reset values
    touchStartX = null;
    touchStartY = null;

    // Detect swipe gestures if needed
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 50) {
            // Swipe right - could trigger some action
        } else if (deltaX < -50) {
            // Swipe left - could trigger some action
        }
    }
}

// --- 18. CLEANUP ON PAGE UNLOAD ---
window.addEventListener('beforeunload', async () => {
    // Clean up subscriptions
    if (realtimeSubscription) {
        await supabaseClient.removeChannel(realtimeSubscription);
    }
    
    // Clear intervals
    if (sessionRefreshInterval) {
        clearInterval(sessionRefreshInterval);
    }
});

// --- 19. INITIALIZE APP ON LOAD ---
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

// --- 20. HANDLE SESSION EXPIRY ---
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        if (!session) {
            window.location.href = 'login.html';
        }
    }
});

// --- 21. ERROR BOUNDARY ---
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    showStatus('เกิดข้อผิดพลาด: ' + e.error.message, true);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    showStatus('เกิดข้อผิดพลาด: ' + e.reason, true);
});
