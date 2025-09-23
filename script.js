// ส่วนที่ 1: การเชื่อมต่อ SUPABASE และระบบ AUTHENTICATION
// =================================================================
const SUPABASE_URL = 'https://dmzsughhxdgpnazvjtci.supabase.co'; // ❗ วาง URL ของคุณที่นี่
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtenN1Z2hoeGRncG5henZqdGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1Nzk4NDIsImV4cCI6MjA3MzE1NTg0Mn0.eeWTW871ork6ZH43U_ergJ7rb1ePMT7ztPOdh5hgqLM'; // ❗ วาง Anon Key ของคุณที่นี่

if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    alert('กรุณาตั้งค่า SUPABASE_URL และ SUPABASE_ANON_KEY ในไฟล์ script.js ก่อน');
}

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUserRole = 'sales'; // กำหนดค่าเริ่มต้น
let tableData = []; // ข้อมูลจะถูกดึงมาจาก Supabase

// --- ฟังก์ชันหลักในการเริ่มต้นแอป ---
async function initializeApp() {
    // 1. ตรวจสอบว่าล็อกอินหรือยัง และดึง Role
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    const userId = session.user.id;
    const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('role, username')
        .eq('id', userId)
        .single();

    if (userError) {
        console.error('Error fetching user profile:', userError);
        currentUserRole = 'sales'; // fallback role
    } else {
        currentUserRole = userData.role;
        sessionStorage.setItem('currentUsername', userData.username);
    }

    // 2. อัปเดต UI ตามสิทธิ์
    updateUIByRole();
    
    // 3. ดึงข้อมูลลูกค้าจาก Supabase
    await fetchCustomerData();
}

// --- ฟังก์ชันดึงข้อมูลลูกค้า ---
async function fetchCustomerData() {
    showStatus('กำลังดึงข้อมูล...');
    const { data, error } = await supabaseClient
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching customers:', error);
        showStatus('ดึงข้อมูลไม่สำเร็จ', true);
    } else {
        tableData = data;
        renderTable();
        showStatus('ข้อมูลล่าสุดแล้ว');
    }
}

// --- ฟังก์ชันออกจากระบบ ---
async function handleLogout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        console.error('Error logging out:', error);
    }
    window.location.href = 'login.html';
}

// =================================================================
// ส่วนที่ 2: การจัดการ UI และสิทธิ์การใช้งาน
// =================================================================

function updateUIByRole() {
    const userBadge = document.querySelector('.user-badge');
    const addUserButton = document.getElementById('addUserButton');
    const deleteRowMenuItem = document.getElementById('deleteRowMenuItem');

    addUserButton.style.display = 'none';
    if(deleteRowMenuItem) deleteRowMenuItem.style.display = 'none';

    const permissions = {
        'administrator': { badge: 'Administrator', canAdd: true, canDelete: true },
        'admin': { badge: 'Admin', canAdd: true, canDelete: false },
        'sales': { badge: 'Sales', canAdd: true, canDelete: false }
    };
    const currentPermission = permissions[currentUserRole];
    
    if (currentPermission) {
        userBadge.textContent = currentPermission.badge;
        userBadge.style.backgroundColor = currentUserRole === 'administrator' ? '#dc3545' : (currentUserRole === 'admin' ? '#007bff' : '#28a745');
        if (currentPermission.canAdd) addUserButton.style.display = 'inline-block';
        if (currentPermission.canDelete && deleteRowMenuItem) deleteRowMenuItem.style.display = 'block';
    }
}

function showStatus(message, isError = false) {
    const indicator = document.getElementById('statusIndicator');
    if (!indicator) return;
    indicator.textContent = message;
    indicator.classList.add('show');
    indicator.classList.toggle('error', isError);
    setTimeout(() => {
        indicator.classList.remove('show');
    }, 2000);
}

// =================================================================
// ส่วนที่ 3: การทำงานของตาราง (CRUD Operations & UI)
// =================================================================
let editingCell = null;
let copiedCell = null;
let contextCell = null;
let selectedCell = null;

const dropdownOptions = {
    channel: ['Fbc By หมอธีร์', 'FBC-EYES', 'FBC-Hair', 'Walk-in', 'Online', 'Facebook', 'Instagram', 'Line'],
    procedure: ['ปลูกผม', 'ยกคิ้ว', 'จมูก', 'ตา', 'ฉีดฟิลเลอร์', 'โบท็อกซ์', 'เลเซอร์'],
    sales: ['MAM', 'AU', 'GOLF', 'Online', 'JANE', 'TOM', 'LISA'],
    csConfirm: ['CSX', 'CSY', 'CSZ'],
    confirmY: ['Y', 'N'],
    transfer100: ['Y', 'N'],
    status1: ['ธงเขียว 1', 'ธงเขียว 2', 'ธงเขียว 3', 'ธงเขียว 4', 'ธงแดง', 'โยกทราม', 'นัดงานไว้']
};

function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    tableData.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.dataset.id = row.id; // Store Supabase ID on the row
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
    updateStats();
}

function startEdit(cell, rowIndex, field) {
    if (currentUserRole === 'viewer') {
        showStatus('คุณไม่มีสิทธิ์แก้ไขข้อมูล', true);
        return;
    }
    if (currentUserRole === 'sales' && field === 'sales') {
        showStatus('คุณไม่มีสิทธิ์แก้ไขเซลล์นี้', true);
        return;
    }
    if (editingCell) finishEdit();
    
    editingCell = cell;
    const originalValue = tableData[rowIndex][field] || '';
    cell.classList.add('editing');

    const finishEditing = async (newValue) => {
        if (newValue !== originalValue) {
            const rowId = cell.parentElement.dataset.id;
            const updateObject = {};
            updateObject[field] = newValue;

            const { error } = await supabaseClient
                .from('customers')
                .update(updateObject)
                .eq('id', rowId);

            if (error) {
                showStatus('อัปเดตข้อมูลไม่สำเร็จ', true);
                console.error(error);
                cell.textContent = originalValue; // Revert on error
            } else {
                tableData[rowIndex][field] = newValue;
                showStatus('บันทึกแล้ว');
            }
        }
        editingCell.classList.remove('editing');
        editingCell = null;
        renderTable();
    };

    if (dropdownOptions[field]) {
        // ... (โค้ดสร้าง dropdown)
    } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'cell-input';
        input.value = originalValue;
        input.onblur = () => finishEditing(input.value);
        input.onkeydown = (e) => {
            if (e.key === 'Enter') input.blur();
            if (e.key === 'Escape') {
                editingCell.classList.remove('editing');
                editingCell = null;
                renderTable(); // Cancel edit
            }
        };
        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();
        input.select();
    }
}

async function addNewRow() {
    if (!['administrator', 'admin', 'sales'].includes(currentUserRole)) {
        showStatus('คุณไม่มีสิทธิ์เพิ่มข้อมูล', true);
        return;
    }
    const currentUsername = sessionStorage.getItem('currentUsername');
    const newRowData = { sales: currentUsername }; // Assign current user as salesperson

    const { data, error } = await supabaseClient
        .from('customers')
        .insert([newRowData])
        .select();

    if (error) {
        showStatus('เพิ่มข้อมูลไม่สำเร็จ', true);
        console.error(error);
    } else {
        showStatus('เพิ่มแถวใหม่สำเร็จ');
        await fetchCustomerData();
    }
}

async function deleteRow() {
    if (currentUserRole !== 'administrator') {
        showStatus('คุณไม่มีสิทธิ์ลบข้อมูล', true);
        return;
    }
    if (contextCell) {
        const rowId = contextCell.parentElement.dataset.id;
        if (confirm('ต้องการลบแถวนี้ใช่หรือไม่?')) {
            const { error } = await supabaseClient
                .from('customers')
                .delete()
                .eq('id', rowId);
            
            if (error) {
                showStatus('ลบข้อมูลไม่สำเร็จ', true);
                console.error(error);
            } else {
                showStatus('ลบข้อมูลสำเร็จ');
                await fetchCustomerData();
            }
        }
    }
}

// --- ฟังก์ชันอื่นๆ ---
function updateStats() {
    // ... โค้ดคำนวณสถิติ ...
}
// ... และฟังก์ชันอื่นๆ ที่จำเป็นทั้งหมด ...
// ... searchTable, filterTable, context menu functions, etc. ...

// --- Event Listeners ---
document.addEventListener('contextmenu', (e) => {
    // ... context menu logic
});
document.addEventListener('click', (e) => {
    // ... hide context menu logic
});

// --- Initialize App ---
initializeApp();
