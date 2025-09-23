// ================================================================================
// BEAUTY CLINIC CRM - COMPLETE SCRIPT
// ================================================================================

// --- 1. CONFIGURATION & INITIALIZATION ---
const SUPABASE_URL = 'https://dmzsughhxdgpnazvjtci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtenN1Z2hoeGRncG5henZqdGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1Nzk4NDIsImV4cCI6MjA3MzE1NTg0Mn0.eeWTW871ork6ZH43U_ergJ7rb1ePMT7ztPOdh5hgqLM';

// Check configuration
if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    alert('กรุณาตั้งค่า SUPABASE_URL และ SUPABASE_ANON_KEY ในไฟล์ script.js ก่อน');
}

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
let selectedCell = null;

// Dropdown options
const dropdownOptions = {
    channel: ['Fbc By หมอธีร์', 'FBC-EYES', 'FBC-Hair', 'Walk-in', 'Online', 'Facebook', 'Instagram', 'Line'],
    procedure: ['ปลูกผม', 'ยกคิ้ว', 'จมูก', 'ตา', 'ฉีดฟิลเลอร์', 'โบท็อกซ์', 'เลเซอร์'],
    sales: ['MAM', 'AU', 'GOLF', 'Online', 'JANE', 'TOM', 'LISA'],
    cs_confirm: ['CSX', 'CSY', 'CSZ'],
    confirm_y: ['Y', 'N'],
    transfer_100: ['Y', 'N'],
    status_1: ['ธงเขียว 1', 'ธงเขียว 2', 'ธงเขียว 3', 'ธงเขียว 4', 'ธงแดง', 'โยกทราม', 'นัดงานไว้']
};

// --- 2. MAIN APP INITIALIZATION ---
async function initializeApp() {
    showLoading(true);
    
    try {
        // Check authentication
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = 'login.html';
            return;
        }
        
        currentUserId = session.user.id;
        
        // Get user profile and role
        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('role, username, full_name')
            .eq('id', currentUserId)
            .single();
        
        if (userError) {
            console.error('Error fetching user profile:', userError);
            // Create default user profile if not exists
            await createDefaultUserProfile(session.user);
        } else {
            currentUserRole = userData.role || 'sales';
            currentUsername = userData.username || session.user.email.split('@')[0];
            sessionStorage.setItem('currentUsername', currentUsername);
            sessionStorage.setItem('currentUserRole', currentUserRole);
        }
        
        // Update UI based on role
        updateUIByRole();
        
        // Fetch customer data
        await fetchCustomerData();
        
    } catch (error) {
        console.error('Initialization error:', error);
        showStatus('เกิดข้อผิดพลาดในการเริ่มต้นระบบ', true);
    } finally {
        showLoading(false);
    }
}

// --- 3. USER & AUTH FUNCTIONS ---
async function createDefaultUserProfile(user) {
    const username = user.email.split('@')[0];
    const { error } = await supabaseClient
        .from('users')
        .insert({
            id: user.id,
            username: username,
            full_name: username,
            role: 'sales'
        });
    
    if (!error) {
        currentUsername = username;
        currentUserRole = 'sales';
    }
}

async function handleLogout() {
    if (confirm('ต้องการออกจากระบบหรือไม่?')) {
        showLoading(true);
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

function updateUIByRole() {
    const userBadge = document.querySelector('.user-badge');
    const userPermissions = document.getElementById('userPermissions');
    const addUserButton = document.getElementById('addUserButton');
    const deleteRowMenuItem = document.getElementById('deleteRowMenuItem');
    
    const permissions = {
        'administrator': {
            badge: 'Administrator',
            badgeColor: '#dc3545',
            text: 'Full Access - Edit, Delete, Manage All',
            canAdd: true,
            canDelete: true,
            canEditAll: true
        },
        'admin': {
            badge: 'Admin',
            badgeColor: '#007bff',
            text: 'Edit All, Add New',
            canAdd: true,
            canDelete: false,
            canEditAll: true
        },
        'sales': {
            badge: 'Sales',
            badgeColor: '#28a745',
            text: 'Edit Own, Add New',
            canAdd: true,
            canDelete: false,
            canEditAll: false
        },
        'viewer': {
            badge: 'Viewer',
            badgeColor: '#6c757d',
            text: 'View Only',
            canAdd: false,
            canDelete: false,
            canEditAll: false
        }
    };
    
    const perm = permissions[currentUserRole] || permissions['viewer'];
    
    if (userBadge) {
        userBadge.textContent = perm.badge;
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
}

// --- 4. DATA FETCHING & MANAGEMENT ---
async function fetchCustomerData() {
    try {
        const { data, error } = await supabaseClient
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        tableData = data || [];
        originalTableData = [...tableData];
        renderTable();
        updateStats();
        showStatus('ข้อมูลล่าสุดแล้ว');
        
    } catch (error) {
        console.error('Error fetching customers:', error);
        showStatus('ดึงข้อมูลไม่สำเร็จ', true);
        tableData = [];
        renderTable();
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
    
    tableData.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.dataset.id = row.id;
        tr.dataset.index = index;
        
        tr.innerHTML = `
            <td class="row-number">${index + 1}</td>
            <td class="admin-cell" ondblclick="startEdit(this, ${index}, 'date')">${row.date || ''}</td>
            <td class="admin-cell" ondblclick="startEdit(this, ${index}, 'lead_code')">${row.lead_code || ''}</td>
            <td class="admin-cell" ondblclick="startEdit(this, ${index}, 'name')">${row.name || ''}</td>
            <td class="admin-cell" ondblclick="startEdit(this, ${index}, 'phone')">${row.phone || ''}</td>
            <td class="admin-cell has-dropdown" ondblclick="startEdit(this, ${index}, 'channel')">${row.channel || ''}</td>
            <td class="admin-cell has-dropdown" ondblclick="startEdit(this, ${index}, 'procedure')">${row.procedure || ''}</td>
            <td class="admin-cell" ondblclick="startEdit(this, ${index}, 'deposit')">${row.deposit || ''}</td>
            <td class="admin-cell yn-cell ${row.confirm_y === 'Y' ? 'yes' : row.confirm_y === 'N' ? 'no' : ''} has-dropdown" ondblclick="startEdit(this, ${index}, 'confirm_y')">${row.confirm_y || ''}</td>
            <td class="admin-cell yn-cell ${row.transfer_100 === 'Y' ? 'yes' : row.transfer_100 === 'N' ? 'no' : ''} has-dropdown" ondblclick="startEdit(this, ${index}, 'transfer_100')">${row.transfer_100 || ''}</td>
            <td class="admin-cell has-dropdown" ondblclick="startEdit(this, ${index}, 'cs_confirm')">${row.cs_confirm || ''}</td>
            <td class="admin-cell has-dropdown" ondblclick="startEdit(this, ${index}, 'sales')">${row.sales || ''}</td>
            <td class="status-cell" ondblclick="startEdit(this, ${index}, 'last_status')">${row.last_status || ''}</td>
            <td class="status-cell" ondblclick="startEdit(this, ${index}, 'update_access')">${row.update_access || ''}</td>
            <td class="status-cell" ondblclick="startEdit(this, ${index}, 'call_time')">${row.call_time || ''}</td>
            <td class="status-cell has-dropdown" ondblclick="startEdit(this, ${index}, 'status_1')">${row.status_1 || ''}</td>
            <td class="etc-cell" ondblclick="startEdit(this, ${index}, 'reason')">${row.reason || ''}</td>
            <td class="etc-cell" ondblclick="startEdit(this, ${index}, 'etc')">${row.etc || ''}</td>
            <td class="etc-cell" ondblclick="startEdit(this, ${index}, 'hn_customer')">${row.hn_customer || ''}</td>
            <td class="etc-cell" ondblclick="startEdit(this, ${index}, 'old_appointment')">${row.old_appointment || ''}</td>
            <td class="etc-cell" ondblclick="startEdit(this, ${index}, 'dr')">${row.dr || ''}</td>
            <td class="etc-cell" ondblclick="startEdit(this, ${index}, 'closed_amount')">${row.closed_amount || ''}</td>
            <td class="etc-cell" ondblclick="startEdit(this, ${index}, 'appointment_date')">${row.appointment_date || ''}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

// --- 6. CELL EDITING ---
function startEdit(cell, rowIndex, field) {
    // ❗ --- เพิ่มโค้ดตรวจสอบสิทธิ์สำหรับ Sales ---
    if (currentUserRole === 'sales') {
        // รายชื่อคอลัมน์ที่ Sales "ห้าม" แก้ไข
        const salesReadOnlyFields = [
            'date', 
            'lead_code', 
            'name', 
            'phone', 
            'channel', 
            'procedure', 
            'confirm_y', 
            'transfer_100', 
            'cs_confirm', 
            'sales'
            // หมายเหตุ: เพิ่มชื่อคอลัมน์อื่นๆ ที่ไม่ต้องการให้ Sales แก้ไขได้ที่นี่
        ];

        if (salesReadOnlyFields.includes(field)) {
            showStatus('Sales ไม่มีสิทธิ์แก้ไขข้อมูลส่วนนี้', true);
            return; // หยุดการทำงานทันที ไม่ให้เข้าสู่โหมดแก้ไข
        }
    }
    // --- สิ้นสุดโค้ดส่วนใหม่ ---

    // โค้ดส่วนที่เหลือของฟังก์ชันยังคงเหมือนเดิม
    if (currentUserRole === 'viewer') {
        showStatus('คุณไม่มีสิทธิ์แก้ไขข้อมูล', true);
        return;
    }
    
    if (editingCell) finishEdit(true);
    
    editingCell = cell;
    const originalValue = tableData[rowIndex][field] || '';
    cell.classList.add('editing');
    
    // ... (โค้ดส่วนที่เหลือของฟังก์ชัน startEdit) ...
    // ...
}
    
    if (dropdownOptions[field]) {
        const select = document.createElement('select');
        select.className = 'cell-select';
        
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '-- เลือก --';
        select.appendChild(emptyOption);
        
        dropdownOptions[field].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            if (opt === originalValue) option.selected = true;
            select.appendChild(option);
        });
        
        select.onchange = async () => {
            await updateCell(rowIndex, field, select.value);
        };
        
        select.onblur = () => finishEdit(true);
        
        cell.innerHTML = '';
        cell.appendChild(select);
        select.focus();
        
    } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'cell-input';
        input.value = originalValue;
        
        input.onblur = async () => {
            await updateCell(rowIndex, field, input.value);
        };
        
        input.onkeydown = async (e) => {
            if (e.key === 'Enter') {
                await updateCell(rowIndex, field, input.value);
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
    if (editingCell) {
        editingCell.classList.remove('editing');
        editingCell = null;
        if (!cancel) renderTable();
    }
}

async function updateCell(rowIndex, field, newValue) {
    const rowId = tableData[rowIndex].id;
    const updateData = {};
    updateData[field] = newValue || null;
    updateData['updated_by'] = currentUserId;
    
    try {
        const { error } = await supabaseClient
            .from('customers')
            .update(updateData)
            .eq('id', rowId);
        
        if (error) throw error;
        
        tableData[rowIndex][field] = newValue;
        originalTableData[rowIndex][field] = newValue;
        showStatus('บันทึกสำเร็จ');
        finishEdit();
        updateStats();
        
    } catch (error) {
        console.error('Update error:', error);
        showStatus('อัปเดตไม่สำเร็จ', true);
        finishEdit(true);
    }
}

// --- 7. ROW OPERATIONS ---
async function addNewRow() {
    if (!['administrator', 'admin', 'sales'].includes(currentUserRole)) {
        showStatus('คุณไม่มีสิทธิ์เพิ่มข้อมูล', true);
        return;
    }
    
    // Generate new lead code
    const lastLeadCode = tableData.length > 0 
        ? Math.max(...tableData.map(r => parseInt(r.lead_code) || 0)) 
        : 1150;
    
    const newRow = {
        lead_code: (lastLeadCode + 1).toString(),
        sales: currentUsername,
        date: new Date().toLocaleDateString('th-TH'),
        created_by: currentUserId
    };
    
    try {
        const { data, error } = await supabaseClient
            .from('customers')
            .insert([newRow])
            .select();
        
        if (error) throw error;
        
        showStatus('เพิ่มข้อมูลสำเร็จ');
        await fetchCustomerData();
        
    } catch (error) {
        console.error('Add error:', error);
        showStatus('เพิ่มข้อมูลไม่สำเร็จ', true);
    }
}

async function deleteRow() {
    if (!['administrator', 'admin'].includes(currentUserRole)) {
        showStatus('คุณไม่มีสิทธิ์ลบข้อมูล', true);
        return;
    }
    
    if (contextCell) {
        const rowId = contextCell.parentElement.dataset.id;
        
        if (confirm('ต้องการลบแถวนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
            try {
                const { error } = await supabaseClient
                    .from('customers')
                    .delete()
                    .eq('id', rowId);
                
                if (error) throw error;
                
                showStatus('ลบข้อมูลสำเร็จ');
                await fetchCustomerData();
                
            } catch (error) {
                console.error('Delete error:', error);
                showStatus('ลบข้อมูลไม่สำเร็จ', true);
            }
        }
    }
}

// --- 8. SEARCH & FILTER ---
function searchTable(query) {
    if (!query) {
        tableData = [...originalTableData];
        renderTable();
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
    
    // Today's customers
    const today = new Date().toLocaleDateString('th-TH');
    const todayCount = tableData.filter(row => row.date === today).length;
    if (todayElement) todayElement.textContent = todayCount;
    
    // Pending (no closed amount)
    const pending = tableData.filter(row => !row.closed_amount).length;
    if (pendingElement) pendingElement.textContent = pending;
    
    // Closed deals
    const closed = tableData.filter(row => row.closed_amount).length;
    if (closedElement) closedElement.textContent = closed;
}

// --- 10. EXPORT FUNCTIONALITY ---
function exportData() {
    const headers = [
        '#', 'วัน/เดือน/ปี', 'รหัสลีด', 'ชื่อ-สกุล', 'เบอร์โทร',
        'ช่องทาง', 'ประเภทหัตถการ', 'มัดจำ', 'ยืนยัน Y/N', 'โอน 100%',
        'CS ยัน', 'เซลล์', 'Last Status', 'อัพเดท', 'เวลาโทร',
        'Status 1', 'เหตุผล', 'ETC', 'HN', 'นัดผ่าเก่า',
        'DR.', 'ยอดปิด', 'นัดทำ'
    ];
    
    let csv = '\ufeff' + headers.join(',') + '\n';
    
    tableData.forEach((row, index) => {
        const rowData = [
            index + 1,
            row.date || '',
            row.lead_code || '',
            row.name || '',
            row.phone || '',
            row.channel || '',
            row.procedure || '',
            row.deposit || '',
            row.confirm_y || '',
            row.transfer_100 || '',
            row.cs_confirm || '',
            row.sales || '',
            row.last_status || '',
            row.update_access || '',
            row.call_time || '',
            row.status_1 || '',
            row.reason || '',
            row.etc || '',
            row.hn_customer || '',
            row.old_appointment || '',
            row.dr || '',
            row.closed_amount || '',
            row.appointment_date || ''
        ].map(val => `"${String(val).replace(/"/g, '""')}"`);
        
        csv += rowData.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `beauty_clinic_crm_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    showStatus('Export สำเร็จ');
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
    
    // Adjust position to stay within viewport
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

// Context menu actions
function editCell() {
    if (contextCell) {
        contextCell.dispatchEvent(new MouseEvent('dblclick'));
    }
}

function copyCell() {
    if (contextCell) {
        copiedCell = contextCell.textContent;
        showStatus('คัดลอกแล้ว');
    }
}

async function pasteCell() {
    if (contextCell && copiedCell !== null) {
        const rowIndex = parseInt(contextCell.parentElement.dataset.index);
        const cellIndex = contextCell.cellIndex;
        
        // Map cell index to field name
        const fieldMap = [
            null, 'date', 'lead_code', 'name', 'phone', 'channel', 'procedure',
            'deposit', 'confirm_y', 'transfer_100', 'cs_confirm', 'sales',
            'last_status', 'update_access', 'call_time', 'status_1',
            'reason', 'etc', 'hn_customer', 'old_appointment', 'dr',
            'closed_amount', 'appointment_date'
        ];
        
        const field = fieldMap[cellIndex];
        if (field) {
            await updateCell(rowIndex, field, copiedCell);
            showStatus('วางแล้ว');
        }
    }
}

async function clearCell() {
    if (contextCell) {
        const rowIndex = parseInt(contextCell.parentElement.dataset.index);
        const cellIndex = contextCell.cellIndex;
        
        const fieldMap = [
            null, 'date', 'lead_code', 'name', 'phone', 'channel', 'procedure',
            'deposit', 'confirm_y', 'transfer_100', 'cs_confirm', 'sales',
            'last_status', 'update_access', 'call_time', 'status_1',
            'reason', 'etc', 'hn_customer', 'old_appointment', 'dr',
            'closed_amount', 'appointment_date'
        ];
        
        const field = fieldMap[cellIndex];
        if (field) {
            await updateCell(rowIndex, field, '');
            showStatus('ล้างเซลล์แล้ว');
        }
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
    
    setTimeout(() => {
        indicator.classList.remove('show');
    }, 3000);
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('show', show);
    }
}

// --- 13. PLACEHOLDER FUNCTIONS ---
function switchRole() {
    showStatus('ฟีเจอร์ Switch Role กำลังพัฒนา', true);
}

function showSettings() {
    showStatus('หน้าตั้งค่ากำลังพัฒนา', true);
}

// --- 14. KEYBOARD SHORTCUTS ---
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

// --- 15. INITIALIZE APP ON LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the main page
    if (document.getElementById('excelTable')) {
        initializeApp();
    }
});

