// =======================================================
// TODO: ขั้นตอนที่ 1 - ใส่ SUPABASE URL และ KEY ของคุณที่นี่
// =======================================================
const supabaseUrl = 'https://dmzsughhxdgpnazvjtci.supabase.co'; // ใส่ URL ของคุณที่นี่
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtenN1Z2hoeGRncG5henZqdGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1Nzk4NDIsImV4cCI6MjA3MzE1NTg0Mn0.eeWTW871ork6ZH43U_ergJ7rb1ePMT7ztPOdh5hgqLM'; // ใส่ Key (anon public) ของคุณที่นี่
const supabase = supabase.createClient(supabaseUrl, supabaseKey);
// =======================================================

let tableData = [];
let editingCell = null;
let copiedCell = null;
let selectedCell = null;
let contextCell = null;

// Dropdown options (เหมือนเดิม)
const dropdownOptions = {
    channel: ['Fbc By หมอธีร์', 'FBC-EYES', 'FBC-Hair', 'Walk-in', 'Online', 'Facebook', 'Instagram', 'Line'],
    procedure: ['ปลูกผม', 'ยกคิ้ว', 'จมูก', 'ตา', 'ฉีดฟิลเลอร์', 'โบท็อกซ์', 'เลเซอร์'],
    sales: ['MAM', 'AU', 'GOLF', 'Online', 'JANE', 'TOM', 'LISA'],
    csConfirm: ['CSX', 'CSY', 'CSZ'],
    confirmY: ['Y', 'N'],
    transfer100: ['Y', 'N'],
    status1: ['ธงเขียว 1', 'ธงเขียว 2', 'ธงเขียว 3', 'ธงเขียว 4', 'ธีคบราม', 'โยคทราม', 'นัดนงไว้']
};

// ฟังก์ชันสำหรับดึงข้อมูลจาก Supabase
async function fetchCustomers() {
    showStatus('กำลังโหลดข้อมูล...');
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error('Error fetching customers:', error);
        alert('ไม่สามารถโหลดข้อมูลได้: ' + error.message);
        return;
    }
    
    tableData = data;
    renderTable();
    showStatus('โหลดข้อมูลสำเร็จ');
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    updateStats();

    tableData.forEach((row) => {
        const tr = document.createElement('tr');
        // เพิ่ม data-id เพื่อให้เรารู้ว่าแถวนี้คือข้อมูล id ไหนใน database
        tr.setAttribute('data-id', row.id); 
        tr.innerHTML = `
            <td class="row-number">${row.id}</td>
            <td class="admin-cell" ondblclick="startEdit(this)" onclick="selectCell(this)">${row.date || ''}</td>
            <td class="admin-cell" ondblclick="startEdit(this)" onclick="selectCell(this)">${row.lead_code || ''}</td>
            <td class="admin-cell" ondblclick="startEdit(this)" onclick="selectCell(this)">${row.name || ''}</td>
            <td class="admin-cell" ondblclick="startEdit(this)" onclick="selectCell(this)">${row.phone || ''}</td>
            <td class="admin-cell has-dropdown" ondblclick="startEdit(this)" onclick="selectCell(this)">${row.channel || ''}</td>
            <td class="admin-cell has-dropdown" ondblclick="startEdit(this)" onclick="selectCell(this)">${row.procedure || ''}</td>
            <td class="admin-cell" ondblclick="startEdit(this)" onclick="selectCell(this)">${row.deposit || ''}</td>
            <td class="admin-cell yn-cell ${row.confirm_y === 'Y' ? 'yes' : row.confirm_y === 'N' ? 'no' : ''} has-dropdown" ondblclick="startEdit(this)" onclick="selectCell(this)">${row.confirm_y || ''}</td>
            <td class="admin-cell yn-cell ${row.transfer_100 === 'Y' ? 'yes' : row.transfer_100 === 'N' ? 'no' : ''} has-dropdown" ondblclick="startEdit(this)" onclick="selectCell(this)">${row.transfer_100 || ''}</td>
            <td class="admin-cell has-dropdown" ondblclick="startEdit(this)" onclick="selectCell(this)">${row.cs_confirm || ''}</td>
            <td class="admin-cell has-dropdown" ondblclick="startEdit(this)" onclick="selectCell(this)">${row.sales || ''}</td>
            <td class="status-cell" ondblclick="startEdit(this)" onclick="selectCell(this)">${row.last_status || ''}</td>
            <td class="status-cell" ondblclick="startEdit(this)" onclick="selectCell(this)">${row.update_access || ''}</td>
            <td class="status-cell" ondblclick="startEdit(this)" onclick="selectCell(this)">${row.call_time || ''}</td>
            <td class="status-cell has-dropdown" ondblclick="startEdit(this)" onclick="selectCell(this)">${row.status_1 || ''}</td>
            <td class="etc-cell" ondblclick="startEdit(this)" onclick="selectCell(this)">${row.reason || ''}</td>
            <td class="etc-cell" ondblclick="startEdit(this)" onclick="selectCell(this)">${row.etc || ''}</td>
            <td class="etc-cell" ondblclick="startEdit(this)" onclick="selectCell(this)">${row.hn_customer || ''}</td>
            <td class="etc-cell" ondblclick="startEdit(this)" onclick="selectCell(this)">${row.old_appointment || ''}</td>
            <td class="etc-cell" ondblclick="startEdit(this)" onclick="selectCell(this)">${row.dr || ''}</td>
            <td class="etc-cell" ondblclick="startEdit(this)" onclick="selectCell(this)">${row.closed_amount || ''}</td>
            <td class="etc-cell" ondblclick="startEdit(this)" onclick="selectCell(this)">${row.appointment_date || ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

const columnMapping = ['id', 'date', 'lead_code', 'name', 'phone', 'channel', 'procedure', 'deposit', 'confirm_y', 'transfer_100', 'cs_confirm', 'sales', 'last_status', 'update_access', 'call_time', 'status_1', 'reason', 'etc', 'hn_customer', 'old_appointment', 'dr', 'closed_amount', 'appointment_date'];

function startEdit(cell) {
    if (editingCell) finishEdit();

    editingCell = cell;
    const originalValue = cell.textContent;
    const field = columnMapping[cell.cellIndex];

    cell.classList.add('editing');
    
    if (dropdownOptions[field]) {
        // (โค้ดส่วน Dropdown เหมือนเดิม)
        const select = document.createElement('select');
        select.className = 'cell-select';
        
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '';
        select.appendChild(emptyOption);
        
        dropdownOptions[field].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            if (opt === originalValue) option.selected = true;
            select.appendChild(option);
        });
        
        select.addEventListener('change', () => finishEdit());
        select.addEventListener('blur', () => finishEdit());
        cell.innerHTML = '';
        cell.appendChild(select);
        select.focus();

    } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'cell-input';
        input.value = originalValue;
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') finishEdit();
            else if (e.key === 'Escape') {
                cell.textContent = originalValue; // คืนค่าเดิม
                finishEdit(true); // true = cancel
            }
        });
        
        input.addEventListener('blur', () => finishEdit());
        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();
        input.select();
    }
}

async function finishEdit(cancel = false) {
    if (!editingCell) return;

    const row = editingCell.parentElement;
    const rowId = row.getAttribute('data-id');
    const field = columnMapping[editingCell.cellIndex];
    
    let newValue;
    if (editingCell.firstChild?.tagName === 'INPUT' || editingCell.firstChild?.tagName === 'SELECT') {
        newValue = editingCell.firstChild.value;
    } else {
        newValue = editingCell.textContent;
    }
    
    editingCell.classList.remove('editing');
    editingCell.textContent = newValue;
    
    if (!cancel && rowId && field) {
        showStatus('กำลังบันทึก...');
        const { error } = await supabase
            .from('customers')
            .update({ [field]: newValue })
            .eq('id', rowId);

        if (error) {
            console.error('Error updating row:', error);
            alert('ไม่สามารถบันทึกข้อมูลได้: ' + error.message);
            showStatus('บันทึกไม่สำเร็จ');
            fetchCustomers();
        } else {
            showStatus('บันทึกแล้ว');
            const rowIndex = tableData.findIndex(r => r.id == rowId);
            if (rowIndex > -1) tableData[rowIndex][field] = newValue;
        }
    }
    
    editingCell = null;
}

// (FIXED) ฟังก์ชันเพิ่มลูกค้าใหม่ลง Supabase (พร้อมสร้าง lead_code)
async function addNewRow() {
    showStatus('กำลังเพิ่มแถวใหม่...');
    
    // หา lead_code ที่มากที่สุดที่มีอยู่ แล้วบวก 1
    const maxLeadCode = tableData.reduce((max, row) => {
        const currentCode = parseInt(row.lead_code, 10);
        // isNaN checkเผื่อบางแถวไม่มี lead_code
        return !isNaN(currentCode) && currentCode > max ? currentCode : max;
    }, 0);
    
    const newLeadCode = (maxLeadCode > 0 ? maxLeadCode + 1 : 1146).toString(); // ถ้ายังไม่มีข้อมูลเลย ให้เริ่มที่ 1146

    const newCustomer = { 
        name: 'ลูกค้าใหม่',
        phone: 'N/A',
        lead_code: newLeadCode // เพิ่ม lead_code เข้าไปในข้อมูลที่จะส่ง
    }; 
    
    const { data, error } = await supabase
        .from('customers')
        .insert([newCustomer])
        .select();

    if (error) {
        console.error('Error adding new row:', error);
        alert('ไม่สามารถเพิ่มลูกค้าใหม่ได้: ' + error.message);
    } else {
        showStatus('เพิ่มลูกค้าใหม่สำเร็จ');
        fetchCustomers(); 
    }
}

async function deleteRow() {
    if (contextCell) {
        const row = contextCell.parentElement;
        const rowId = row.getAttribute('data-id');
        const customerName = row.cells[3].textContent;

        if (rowId && confirm(`ต้องการลบลูกค้า '${customerName}' (ID: ${rowId}) จริงๆ หรือไม่?`)) {
            showStatus('กำลังลบ...');
            const { error } = await supabase
                .from('customers')
                .delete()
                .eq('id', rowId);

            if (error) {
                console.error('Error deleting row:', error);
                alert('ไม่สามารถลบข้อมูลได้: ' + error.message);
            } else {
                showStatus('ลบข้อมูลสำเร็จ');
                row.remove(); 
                tableData = tableData.filter(r => r.id != rowId);
            }
        }
    }
}

function selectCell(cell) {
    document.querySelectorAll('.selected').forEach(c => c.classList.remove('selected'));
    cell.classList.add('selected');
    selectedCell = cell;
}

function updateStats() {
    document.getElementById('totalCustomers').textContent = tableData.length;
}

function searchTable(query) {
    const rows = document.querySelectorAll('#tableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
}

function filterTable() {
    const statusFilter = document.getElementById('statusFilter').value;
    const salesFilter = document.getElementById('salesFilter').value;
    
    const rows = document.querySelectorAll('#tableBody tr');
    rows.forEach((row, index) => {
        let show = true;
        
        if (statusFilter && tableData[index].status_1 !== statusFilter) {
            show = false;
        }
        
        if (salesFilter && tableData[index].sales !== salesFilter) {
            show = false;
        }
        
        row.style.display = show ? '' : 'none';
    });
}

function showStatus(message) {
    const indicator = document.getElementById('statusIndicator');
    indicator.textContent = message;
    indicator.classList.add('show');
    setTimeout(() => {
        indicator.classList.remove('show');
    }, 2000);
}

function exportData() {
    const headers = Object.keys(tableData[0] || {});
    let csv = '\ufeff' + headers.join(',') + '\n';
    
    tableData.forEach(row => {
        const rowData = headers.map(header => `"${String(row[header] || '').replace(/"/g, '""')}"`);
        csv += rowData.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beauty_clinic_crm_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showStatus('Export สำเร็จ');
}

document.addEventListener('contextmenu', (e) => {
    const cell = e.target.closest('td');
    if (cell && !cell.classList.contains('row-number')) {
        e.preventDefault();
        contextCell = cell;
        const menu = document.getElementById('contextMenu');
        menu.style.display = 'block';
        menu.style.left = e.pageX + 'px';
        menu.style.top = e.pageY + 'px';
    }
});

document.addEventListener('click', () => {
    document.getElementById('contextMenu').style.display = 'none';
});

function editCell() { if (contextCell) { contextCell.dispatchEvent(new Event('dblclick')); } }
function copyCell() { if (contextCell) { copiedCell = contextCell.textContent; showStatus('คัดลอกเซลล์แล้ว'); } }
function pasteCell() { /* (Needs rework for database) */ }
function insertRowAbove() { addNewRow(); }
function insertRowBelow() { addNewRow(); }
function clearCell() { /* (Needs rework for database) */ }

// ==========================================
// เริ่มการทำงานของเว็บ: ดึงข้อมูลจาก Supabase
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    fetchCustomers();
});
