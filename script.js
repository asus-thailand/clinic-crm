// --- การเชื่อมต่อ Supabase และระบบป้องกัน ---
const SUPABASE_URL = 'https://dmzsughhxdgpnazvjtci.supabase.co'; // ❗ วาง URL ของคุณที่นี่
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtenN1Z2hoeGRncG5henZqdGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1Nzk4NDIsImV4cCI6MjA3MzE1NTg0Mn0.eeWTW871ork6ZH43U_ergJ7rb1ePMT7ztPOdh5hgqLM'; // ❗ วาง Anon Key ของคุณที่นี่

// ตรวจสอบว่าใส่ค่า URL และ Key แล้วหรือยัง
if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    alert('กรุณาตั้งค่า SUPABASE_URL และ SUPABASE_ANON_KEY ในไฟล์ script.js ก่อน');
}

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ฟังก์ชัน "ยามเฝ้าประตู"
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        // ถ้าไม่มี session (ยังไม่ล็อกอิน) ให้เด้งกลับไปที่หน้า login.html
        window.location.href = 'login.html';
    }
}

// ฟังก์ชันออกจากระบบ
async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error logging out:', error);
    } else {
        // หลังจาก logout สำเร็จ ให้กลับไปหน้า login
        window.location.href = 'login.html';
    }
}

// เรียกใช้ "ยามเฝ้าประตู" ทันทีที่เปิดหน้าเว็บ
checkAuth();
// ------------------------------------------

// --- โค้ดเดิมของแอปพลิเคชัน ---
// (ส่วนนี้เหมือนเดิมทุกอย่าง)
let currentUserRole = 'sales'; // ค่านี้จะถูกแทนที่ด้วยข้อมูลจริงในอนาคต

const initialData = [
    { date: '1-9-25', leadCode: '1146', name: 'บุษศะ สะพเขระขัน', phone: '0959750848', channel: 'Fbc By หมอธีร์', procedure: 'ปลูกผม', deposit: '3-9-25', confirmY: 'Y', transfer100: 'N', csConfirm: 'CSX', sales: 'MAM', lastStatus: '75%', updateAccess: '1', callTime: '17.00น', status1: 'ธงเขียว 1', reason: 'โอนเงายมาแล้ว', etc: '', hnCustomer: '', oldAppointment: '', dr: '', closedAmount: '', appointmentDate: '' },
    { date: '1-9-25', leadCode: '1147', name: 'สเชอ', phone: '091-4651453', channel: 'Fbc By หมอธีร์', procedure: 'ปลูกผม', deposit: 'N', confirmY: 'Y', transfer100: 'N', csConfirm: 'CSY', sales: 'AU', lastStatus: '0%', updateAccess: '1', callTime: '11.37น', status1: 'ธงเขียว 1', reason: 'โอนเงายมาแล้ว โอนไปเป็นธงเขียว', etc: '', hnCustomer: '', oldAppointment: '', dr: '', closedAmount: '', appointmentDate: '' },
    { date: '2-9-25', leadCode: '1148', name: 'โม', phone: '089-2266838', channel: 'Fbc By หมอธีร์', procedure: 'ปลูกผม', deposit: 'N', confirmY: 'Y', transfer100: 'N', csConfirm: 'CSY', sales: 'GOLF', lastStatus: '', updateAccess: '', callTime: '', status1: 'ธงแดง', reason: '', etc: '', hnCustomer: '', oldAppointment: '', dr: '', closedAmount: '', appointmentDate: '' },
    { date: '2-9-25', leadCode: '1149', name: 'สมพน อุรุวาส', phone: '097-2036277', channel: 'Fbc By หมอธีร์', procedure: 'ปลูกผม', deposit: '4-9-25', confirmY: 'Y', transfer100: 'N', csConfirm: 'CSY', sales: 'GOLF', lastStatus: '', updateAccess: '', callTime: '', status1: 'ธงเขียว 1', reason: '', etc: '', hnCustomer: '', oldAppointment: '', dr: '', closedAmount: '', appointmentDate: '' },
    { date: '2-9-25', leadCode: '1150', name: 'ผู้', phone: '090-6961515', channel: 'Fbc By หมอธีร์', procedure: 'ปลูกผม', deposit: 'N', confirmY: 'Y', transfer100: 'N', csConfirm: 'CSY', sales: 'MAM', lastStatus: '', updateAccess: '', callTime: '', status1: 'ธงเขียว 1', reason: '', etc: '', hnCustomer: '', oldAppointment: '', dr: '', closedAmount: '', appointmentDate: '' },
    { date: '2-9-25', leadCode: '1151', name: 'มูเดีย ซำนันเจอร์', phone: '086-2209485', channel: 'Fbc By หมอธีร์', procedure: 'ปลูกผม', deposit: '5-9-25', confirmY: 'Y', transfer100: 'N', csConfirm: 'CSX', sales: 'MAM', lastStatus: '', updateAccess: '', callTime: '', status1: 'ธงเขียว 2', reason: '', etc: '', hnCustomer: '', oldAppointment: '', dr: '', closedAmount: '', appointmentDate: '' }
];

let tableData = [...initialData];
let editingCell = null;
let copiedCell = null;
let contextCell = null;
let selectedCell = null;
let autoSaveInterval = null;

const dropdownOptions = {
    channel: ['Fbc By หมอธีร์', 'FBC-EYES', 'FBC-Hair', 'Walk-in', 'Online', 'Facebook', 'Instagram', 'Line'],
    procedure: ['ปลูกผม', 'ยกคิ้ว', 'จมูก', 'ตา', 'ฉีดฟิลเลอร์', 'โบท็อกซ์', 'เลเซอร์'],
    sales: ['MAM', 'AU', 'GOLF', 'Online', 'JANE', 'TOM', 'LISA'],
    csConfirm: ['CSX', 'CSY', 'CSZ'],
    confirmY: ['Y', 'N'],
    transfer100: ['Y', 'N'],
    status1: ['ธงเขียว 1', 'ธงเขียว 2', 'ธงเขียว 3', 'ธงเขียว 4', 'ธงแดง', 'โยกทราม', 'นัดงานไว้']
};

function validatePhone(phone) { const cleaned = phone.replace(/\D/g, ''); return cleaned.length >= 9 && cleaned.length <= 10; }
function sanitizeInput(input) { return input.replace(/[<>]/g, ''); }

function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    updateStats();
    tableData.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="row-number">${index + 100}</td><td class="admin-cell" ondblclick="startEdit(this, ${index}, 'date')" onclick="selectCell(this)">${row.date || ''}</td><td class="admin-cell" ondblclick="startEdit(this, ${index}, 'leadCode')" onclick="selectCell(this)">${row.leadCode || ''}</td><td class="admin-cell" ondblclick="startEdit(this, ${index}, 'name')" onclick="selectCell(this)">${row.name || ''}</td><td class="admin-cell" ondblclick="startEdit(this, ${index}, 'phone')" onclick="selectCell(this)">${row.phone || ''}</td><td class="admin-cell has-dropdown" ondblclick="startEdit(this, ${index}, 'channel')" onclick="selectCell(this)">${row.channel || ''}</td><td class="admin-cell has-dropdown" ondblclick="startEdit(this, ${index}, 'procedure')" onclick="selectCell(this)">${row.procedure || ''}</td><td class="admin-cell" ondblclick="startEdit(this, ${index}, 'deposit')" onclick="selectCell(this)">${row.deposit || ''}</td><td class="admin-cell yn-cell ${row.confirmY === 'Y' ? 'yes' : row.confirmY === 'N' ? 'no' : ''} has-dropdown" ondblclick="startEdit(this, ${index}, 'confirmY')" onclick="selectCell(this)">${row.confirmY || ''}</td><td class="admin-cell yn-cell ${row.transfer100 === 'Y' ? 'yes' : row.transfer100 === 'N' ? 'no' : ''} has-dropdown" ondblclick="startEdit(this, ${index}, 'transfer100')" onclick="selectCell(this)">${row.transfer100 || ''}</td><td class="admin-cell has-dropdown" ondblclick="startEdit(this, ${index}, 'csConfirm')" onclick="selectCell(this)">${row.csConfirm || ''}</td><td class="admin-cell has-dropdown" ondblclick="startEdit(this, ${index}, 'sales')" onclick="selectCell(this)">${row.sales || ''}</td><td class="status-cell" ondblclick="startEdit(this, ${index}, 'lastStatus')" onclick="selectCell(this)">${row.lastStatus || ''}</td><td class="status-cell" ondblclick="startEdit(this, ${index}, 'updateAccess')" onclick="selectCell(this)">${row.updateAccess || ''}</td><td class="status-cell" ondblclick="startEdit(this, ${index}, 'callTime')" onclick="selectCell(this)">${row.callTime || ''}</td><td class="status-cell has-dropdown" ondblclick="startEdit(this, ${index}, 'status1')" onclick="selectCell(this)">${row.status1 || ''}</td><td class="etc-cell" ondblclick="startEdit(this, ${index}, 'reason')" onclick="selectCell(this)">${row.reason || ''}</td><td class="etc-cell" ondblclick="startEdit(this, ${index}, 'etc')" onclick="selectCell(this)">${row.etc || ''}</td><td class="etc-cell" ondblclick="startEdit(this, ${index}, 'hnCustomer')" onclick="selectCell(this)">${row.hnCustomer || ''}</td><td class="etc-cell" ondblclick="startEdit(this, ${index}, 'oldAppointment')" onclick="selectCell(this)">${row.oldAppointment || ''}</td><td class="etc-cell" ondblclick="startEdit(this, ${index}, 'dr')" onclick="selectCell(this)">${row.dr || ''}</td><td class="etc-cell" ondblclick="startEdit(this, ${index}, 'closedAmount')" onclick="selectCell(this)">${row.closedAmount || ''}</td><td class="etc-cell" ondblclick="startEdit(this, ${index}, 'appointmentDate')" onclick="selectCell(this)">${row.appointmentDate || ''}</td>`;
        tbody.appendChild(tr);
    });
}
function selectCell(cell) { document.querySelectorAll('.selected').forEach(c => c.classList.remove('selected')); cell.classList.add('selected'); selectedCell = cell; }
function startEdit(cell, rowIndex, field) { if (currentUserRole === 'viewer') { showStatus('คุณไม่มีสิทธิ์แก้ไขข้อมูล', true); return; } if (editingCell) finishEdit(); editingCell = cell; const value = tableData[rowIndex][field] || ''; cell.classList.add('editing'); if (dropdownOptions[field]) { const select = document.createElement('select'); select.className = 'cell-select'; const emptyOption = document.createElement('option'); emptyOption.value = ''; emptyOption.textContent = ''; select.appendChild(emptyOption); dropdownOptions[field].forEach(opt => { const option = document.createElement('option'); option.value = opt; option.textContent = opt; if (opt === value) option.selected = true; select.appendChild(option); }); select.addEventListener('change', () => { tableData[rowIndex][field] = select.value; finishEdit(); }); select.addEventListener('blur', finishEdit); cell.innerHTML = ''; cell.appendChild(select); select.focus(); } else { const input = document.createElement('input'); input.type = 'text'; input.className = 'cell-input'; input.value = value; input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { if (field === 'phone' && input.value && !validatePhone(input.value)) { showStatus('เบอร์โทรไม่ถูกต้อง', true); return; } tableData[rowIndex][field] = input.value; finishEdit(); } else if (e.key === 'Escape') { finishEdit(true); } }); input.addEventListener('blur', () => { if (field === 'phone' && input.value && !validatePhone(input.value)) { showStatus('เบอร์โทรไม่ถูกต้อง', true); return; } tableData[rowIndex][field] = input.value; finishEdit(); }); cell.innerHTML = ''; cell.appendChild(input); input.focus(); input.select(); } }
function finishEdit(cancel = false) { if (!editingCell) return; editingCell.classList.remove('editing'); editingCell = null; if (!cancel) { saveToLocalStorage(); showStatus('บันทึกแล้ว'); } renderTable(); }
function updateStats() { document.getElementById('totalCustomers').textContent = tableData.length; const today = new Date(); const todayStr = `${today.getDate()}-${today.getMonth() + 1}-${(today.getFullYear() + 543) % 100}`; const todayCount = tableData.filter(row => row.date === todayStr).length; document.getElementById('todayCustomers').textContent = todayCount; const pending = tableData.filter(row => !row.closedAmount || row.closedAmount === '').length; document.getElementById('pendingCustomers').textContent = pending; const closed = tableData.filter(row => row.closedAmount && row.closedAmount !== '').length; document.getElementById('closedDeals').textContent = closed; }
function addNewRow() { if (currentUserRole === 'viewer') { showStatus('คุณไม่มีสิทธิ์เพิ่มข้อมูล', true); return; } const newRow = { date: '', leadCode: (parseInt(tableData[tableData.length - 1]?.leadCode || '1151') + 1).toString(), name: '', phone: '', channel: '', procedure: '', deposit: '', confirmY: '', transfer100: '', csConfirm: '', sales: '', lastStatus: '', updateAccess: '', callTime: '', status1: '', reason: '', etc: '', hnCustomer: '', oldAppointment: '', dr: '', closedAmount: '', appointmentDate: '' }; tableData.push(newRow); renderTable(); saveToLocalStorage(); showStatus('เพิ่มแถวใหม่แล้ว'); }
function searchTable(query) { const sanitized = sanitizeInput(query); const rows = document.querySelectorAll('#tableBody tr'); rows.forEach(row => { const text = row.textContent.toLowerCase(); row.style.display = text.includes(sanitized.toLowerCase()) ? '' : 'none'; }); }
function filterTable() { const statusFilter = document.getElementById('statusFilter').value; const salesFilter = document.getElementById('salesFilter').value; const rows = document.querySelectorAll('#tableBody tr'); rows.forEach((row, index) => { let show = true; if (statusFilter && tableData[index].status1 !== statusFilter) { show = false; } if (salesFilter && tableData[index].sales !== salesFilter) { show = false; } row.style.display = show ? '' : 'none'; }); }
function showStatus(message, isError = false) { const indicator = document.getElementById('statusIndicator'); indicator.textContent = message; indicator.classList.add('show'); indicator.classList.toggle('error', isError); setTimeout(() => { indicator.classList.remove('show'); }, 2000); }
function saveToLocalStorage() { try { localStorage.setItem('beautyCRMData', JSON.stringify(tableData)); return true; } catch (e) { console.error('Failed to save data:', e); showStatus('บันทึกไม่สำเร็จ', true); return false; } }
function loadFromLocalStorage() { try { const saved = localStorage.getItem('beautyCRMData'); if (saved) { tableData = JSON.parse(saved); } } catch (e) { console.error('Failed to load data:', e); tableData = [...initialData]; showStatus('โหลดข้อมูลไม่สำเร็จ', true); } }
function exportData() { const headers = ['#', 'วัน/เดือน/ปี', 'รหัสลีด', 'ชื่อ-สกุล', 'เบอร์โทร', 'ช่องทาง', 'ประเภทหัตถการ', 'มัดจำ', 'ยืนยัน Y/N', 'โอน 100%', 'CS ยัน', 'เซลล์', 'Last Status', 'อัพเดท', 'เวลาโทร', 'Status 1', 'เหตุผล', 'ETC', 'HN', 'นัดผ่าเก่า', 'DR.', 'ยอดปิด', 'นัดทำ']; let csv = '\ufeff' + headers.join(',') + '\n'; tableData.forEach((row, index) => { const rowData = Object.values(row).map(val => `"${String(val || '').replace(/"/g, '""')}"`); csv += `${index + 100},${rowData.join(',')}\n`; }); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `beauty_clinic_crm_${new Date().toISOString().split('T')[0]}.csv`; a.click(); showStatus('Export สำเร็จ'); }
function switchRole() { alert('กำลังพัฒนาฟีเจอร์ Switch Role'); }
function showSettings() { alert('กำลังพัฒนาหน้าตั้งค่า'); }
document.addEventListener('contextmenu', (e) => { const cell = e.target.closest('td'); if (cell && !cell.classList.contains('row-number')) { e.preventDefault(); contextCell = cell; const menu = document.getElementById('contextMenu'); menu.style.display = 'block'; const menuRect = {width: 150, height: 200}; let x = e.pageX, y = e.pageY; if (x + menuRect.width > window.innerWidth) x = window.innerWidth - menuRect.width - 5; if (y + menuRect.height > window.innerHeight) y = window.innerHeight - menuRect.height - 5; menu.style.left = `${x}px`; menu.style.top = `${y}px`; } });
document.addEventListener('click', () => { document.getElementById('contextMenu').style.display = 'none'; if (editingCell) finishEdit(true); });
function editCell() { if (contextCell) contextCell.dispatchEvent(new Event('dblclick')); }
function copyCell() { if (contextCell) { copiedCell = contextCell.textContent; showStatus('คัดลอกเซลล์แล้ว'); } }
function pasteCell() { if (contextCell && copiedCell !== null) { if (currentUserRole === 'viewer') { showStatus('คุณไม่มีสิทธิ์แก้ไขข้อมูล', true); return; } const rowIndex = contextCell.parentElement.rowIndex - 1; const cellIndex = contextCell.cellIndex -1; const field = Object.keys(tableData[0])[cellIndex]; if (field) { tableData[rowIndex][field] = copiedCell; renderTable(); saveToLocalStorage(); showStatus('วางเซลล์แล้ว'); } } }
function insertRowAction(offset) { if (currentUserRole !== 'administrator') { showStatus('คุณไม่มีสิทธิ์เพิ่ม/แทรกแถว', true); return; } if (contextCell) { const rowIndex = contextCell.parentElement.rowIndex - 1; const newRow = Object.fromEntries(Object.keys(initialData[0]).map(key => [key, ''])); tableData.splice(rowIndex + offset, 0, newRow); renderTable(); saveToLocalStorage(); showStatus(offset ? 'แทรกแถวด้านล่างแล้ว' : 'แทรกแถวด้านบนแล้ว'); } }
function insertRowAbove() { insertRowAction(0); }
function insertRowBelow() { insertRowAction(1); }
function deleteRow() { if (currentUserRole !== 'administrator') { showStatus('คุณไม่มีสิทธิ์ลบข้อมูล', true); return; } if (contextCell) { const rowIndex = contextCell.parentElement.rowIndex - 1; if (confirm('ต้องการลบแถวนี้?')) { tableData.splice(rowIndex, 1); renderTable(); saveToLocalStorage(); showStatus('ลบแถวแล้ว'); } } }
function clearCell() { if (currentUserRole === 'viewer') { showStatus('คุณไม่มีสิทธิ์แก้ไขข้อมูล', true); return; } if (contextCell) { const rowIndex = contextCell.parentElement.rowIndex - 1; const cellIndex = contextCell.cellIndex -1; const field = Object.keys(tableData[0])[cellIndex]; if (field) { tableData[rowIndex][field] = ''; renderTable(); saveToLocalStorage(); showStatus('ล้างเซลล์แล้ว'); } } }
function initAutoSave() { if (autoSaveInterval) clearInterval(autoSaveInterval); autoSaveInterval = setInterval(() => { if (saveToLocalStorage()) { } }, 60000); }
function updateUIByRole() { const userBadge = document.querySelector('.user-badge'); const addUserButton = document.getElementById('addUserButton'); const deleteRowMenuItem = document.getElementById('deleteRowMenuItem'); addUserButton.style.display = 'none'; deleteRowMenuItem.style.display = 'none'; let permissions = { 'administrator': { badge: 'Administrator', color: '#dc3545', canAdd: true, canDelete: true }, 'sales': { badge: 'Sales', color: '#007bff', canAdd: true, canDelete: false }, 'viewer': { badge: 'Viewer', color: '#6c757d', canAdd: false, canDelete: false } }; let currentPermission = permissions[currentUserRole]; if (currentPermission) { userBadge.textContent = currentPermission.badge; userBadge.style.backgroundColor = currentPermission.color; if (currentPermission.canAdd) addUserButton.style.display = 'inline-block'; if (currentPermission.canDelete) deleteRowMenuItem.style.display = 'block'; } }

window.addEventListener('beforeunload', saveToLocalStorage);
loadFromLocalStorage();
renderTable();
initAutoSave();
updateUIByRole();

