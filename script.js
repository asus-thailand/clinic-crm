// Initial data from Excel
const initialData = [
    {
        date: '1-9-25',
        leadCode: '1146',
        name: 'บุษศะ สะพเขระขัน',
        phone: '0959750848',
        channel: 'Fbc By หมอธีร์',
        procedure: 'ปลูกผม',
        deposit: '3-9-25',
        confirmY: 'Y',
        transfer100: 'N',
        csConfirm: 'CSX',
        sales: 'MAM',
        lastStatus: '75%',
        updateAccess: '1',
        callTime: '17.00น',
        status1: 'ธงเขียว 1',
        reason: 'โอนเงายมาแล้ว',
        etc: '',
        hnCustomer: '',
        oldAppointment: '',
        dr: '',
        closedAmount: '',
        appointmentDate: ''
    },
    {
        date: '1-9-25',
        leadCode: '1147',
        name: 'สเชอ',
        phone: '091-4651453',
        channel: 'Fbc By หมอธีร์',
        procedure: 'ปลูกผม',
        deposit: 'N',
        confirmY: 'Y',
        transfer100: 'N',
        csConfirm: 'CSY',
        sales: 'AU',
        lastStatus: '0%',
        updateAccess: '1',
        callTime: '11.37น',
        status1: 'ธงเขียว 1',
        reason: 'โอนเงายมาแล้ว โอนไปเป็นธงเขียว',
        etc: '',
        hnCustomer: '',
        oldAppointment: '',
        dr: '',
        closedAmount: '',
        appointmentDate: ''
    },
    {
        date: '2-9-25',
        leadCode: '1148',
        name: 'โม',
        phone: '089-2266838',
        channel: 'Fbc By หมอธีร์',
        procedure: 'ปลูกผม',
        deposit: 'N',
        confirmY: 'Y',
        transfer100: 'N',
        csConfirm: 'CSY',
        sales: 'GOLF',
        lastStatus: '',
        updateAccess: '',
        callTime: '',
        status1: 'ธงแดง',
        reason: '',
        etc: '',
        hnCustomer: '',
        oldAppointment: '',
        dr: '',
        closedAmount: '',
        appointmentDate: ''
    },
    {
        date: '2-9-25',
        leadCode: '1149',
        name: 'สมพน อุรุวาส',
        phone: '097-2036277',
        channel: 'Fbc By หมอธีร์',
        procedure: 'ปลูกผม',
        deposit: '4-9-25',
        confirmY: 'Y',
        transfer100: 'N',
        csConfirm: 'CSY',
        sales: 'GOLF',
        lastStatus: '',
        updateAccess: '',
        callTime: '',
        status1: 'ธงเขียว 1',
        reason: '',
        etc: '',
        hnCustomer: '',
        oldAppointment: '',
        dr: '',
        closedAmount: '',
        appointmentDate: ''
    },
    {
        date: '2-9-25',
        leadCode: '1150',
        name: 'ผู้',
        phone: '090-6961515',
        channel: 'Fbc By หมอธีร์',
        procedure: 'ปลูกผม',
        deposit: 'N',
        confirmY: 'Y',
        transfer100: 'N',
        csConfirm: 'CSY',
        sales: 'MAM',
        lastStatus: '',
        updateAccess: '',
        callTime: '',
        status1: 'ธงเขียว 1',
        reason: '',
        etc: '',
        hnCustomer: '',
        oldAppointment: '',
        dr: '',
        closedAmount: '',
        appointmentDate: ''
    },
    {
        date: '2-9-25',
        leadCode: '1151',
        name: 'มูเดีย ซำนันเจอร์',
        phone: '086-2209485',
        channel: 'Fbc By หมอธีร์',
        procedure: 'ปลูกผม',
        deposit: '5-9-25',
        confirmY: 'Y',
        transfer100: 'N',
        csConfirm: 'CSX',
        sales: 'MAM',
        lastStatus: '',
        updateAccess: '',
        callTime: '',
        status1: 'ธงเขียว 2',
        reason: '',
        etc: '',
        hnCustomer: '',
        oldAppointment: '',
        dr: '',
        closedAmount: '',
        appointmentDate: ''
    }
];

let tableData = [...initialData];
let editingCell = null;
let copiedCell = null;
let contextCell = null;
let selectedCell = null;
let autoSaveInterval = null;

// Dropdown options
const dropdownOptions = {
    channel: ['Fbc By หมอธีร์', 'FBC-EYES', 'FBC-Hair', 'Walk-in', 'Online', 'Facebook', 'Instagram', 'Line'],
    procedure: ['ปลูกผม', 'ยกคิ้ว', 'จมูก', 'ตา', 'ฉีดฟิลเลอร์', 'โบท็อกซ์', 'เลเซอร์'],
    sales: ['MAM', 'AU', 'GOLF', 'Online', 'JANE', 'TOM', 'LISA'],
    csConfirm: ['CSX', 'CSY', 'CSZ'],
    confirmY: ['Y', 'N'],
    transfer100: ['Y', 'N'],
    status1: ['ธงเขียว 1', 'ธงเขียว 2', 'ธงเขียว 3', 'ธงเขียว 4', 'ธงแดง', 'โยกทราม', 'นัดงานไว้']
};

// Phone validation
function validatePhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 9 && cleaned.length <= 10;
}

// XSS prevention for search
function sanitizeInput(input) {
    return input.replace(/[<>]/g, '');
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    updateStats();

    tableData.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="row-number">${index + 100}</td>
            <td class="admin-cell" ondblclick="startEdit(this, ${index}, 'date')" onclick="selectCell(this)">${row.date || ''}</td>
            <td class="admin-cell" ondblclick="startEdit(this, ${index}, 'leadCode')" onclick="selectCell(this)">${row.leadCode || ''}</td>
            <td class="admin-cell" ondblclick="startEdit(this, ${index}, 'name')" onclick="selectCell(this)">${row.name || ''}</td>
            <td class="admin-cell" ondblclick="startEdit(this, ${index}, 'phone')" onclick="selectCell(this)">${row.phone || ''}</td>
            <td class="admin-cell has-dropdown" ondblclick="startEdit(this, ${index}, 'channel')" onclick="selectCell(this)">${row.channel || ''}</td>
            <td class="admin-cell has-dropdown" ondblclick="startEdit(this, ${index}, 'procedure')" onclick="selectCell(this)">${row.procedure || ''}</td>
            <td class="admin-cell" ondblclick="startEdit(this, ${index}, 'deposit')" onclick="selectCell(this)">${row.deposit || ''}</td>
            <td class="admin-cell yn-cell ${row.confirmY === 'Y' ? 'yes' : row.confirmY === 'N' ? 'no' : ''} has-dropdown" ondblclick="startEdit(this, ${index}, 'confirmY')" onclick="selectCell(this)">${row.confirmY || ''}</td>
            <td class="admin-cell yn-cell ${row.transfer100 === 'Y' ? 'yes' : row.transfer100 === 'N' ? 'no' : ''} has-dropdown" ondblclick="startEdit(this, ${index}, 'transfer100')" onclick="selectCell(this)">${row.transfer100 || ''}</td>
            <td class="admin-cell has-dropdown" ondblclick="startEdit(this, ${index}, 'csConfirm')" onclick="selectCell(this)">${row.csConfirm || ''}</td>
            <td class="admin-cell has-dropdown" ondblclick="startEdit(this, ${index}, 'sales')" onclick="selectCell(this)">${row.sales || ''}</td>
            <td class="status-cell" ondblclick="startEdit(this, ${index}, 'lastStatus')" onclick="selectCell(this)">${row.lastStatus || ''}</td>
            <td class="status-cell" ondblclick="startEdit(this, ${index}, 'updateAccess')" onclick="selectCell(this)">${row.updateAccess || ''}</td>
            <td class="status-cell" ondblclick="startEdit(this, ${index}, 'callTime')" onclick="selectCell(this)">${row.callTime || ''}</td>
            <td class="status-cell has-dropdown" ondblclick="startEdit(this, ${index}, 'status1')" onclick="selectCell(this)">${row.status1 || ''}</td>
            <td class="etc-cell" ondblclick="startEdit(this, ${index}, 'reason')" onclick="selectCell(this)">${row.reason || ''}</td>
            <td class="etc-cell" ondblclick="startEdit(this, ${index}, 'etc')" onclick="selectCell(this)">${row.etc || ''}</td>
            <td class="etc-cell" ondblclick="startEdit(this, ${index}, 'hnCustomer')" onclick="selectCell(this)">${row.hnCustomer || ''}</td>
            <td class="etc-cell" ondblclick="startEdit(this, ${index}, 'oldAppointment')" onclick="selectCell(this)">${row.oldAppointment || ''}</td>
            <td class="etc-cell" ondblclick="startEdit(this, ${index}, 'dr')" onclick="selectCell(this)">${row.dr || ''}</td>
            <td class="etc-cell" ondblclick="startEdit(this, ${index}, 'closedAmount')" onclick="selectCell(this)">${row.closedAmount || ''}</td>
            <td class="etc-cell" ondblclick="startEdit(this, ${index}, 'appointmentDate')" onclick="selectCell(this)">${row.appointmentDate || ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

function selectCell(cell) {
    // Clear previous selection
    document.querySelectorAll('.selected').forEach(c => c.classList.remove('selected'));
    
    // Select new cell
    cell.classList.add('selected');
    selectedCell = cell;
}

function startEdit(cell, rowIndex, field) {
    if (editingCell) finishEdit();
    
    editingCell = cell;
    const value = tableData[rowIndex][field] || '';
    cell.classList.add('editing');
    
    if (dropdownOptions[field]) {
        const select = document.createElement('select');
        select.className = 'cell-select';
        
        // Add empty option
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '';
        select.appendChild(emptyOption);
        
        dropdownOptions[field].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            if (opt === value) option.selected = true;
            select.appendChild(option);
        });
        
        select.addEventListener('change', () => {
            tableData[rowIndex][field] = select.value;
            finishEdit();
        });
        
        select.addEventListener('blur', finishEdit);
        cell.innerHTML = '';
        cell.appendChild(select);
        select.focus();
    } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'cell-input';
        input.value = value;
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                // Validate phone if it's phone field
                if (field === 'phone' && input.value && !validatePhone(input.value)) {
                    showStatus('เบอร์โทรไม่ถูกต้อง', true);
                    return;
                }
                tableData[rowIndex][field] = input.value;
                finishEdit();
            } else if (e.key === 'Escape') {
                finishEdit();
            }
        });
        
        input.addEventListener('blur', () => {
            if (field === 'phone' && input.value && !validatePhone(input.value)) {
                showStatus('เบอร์โทรไม่ถูกต้อง', true);
                return;
            }
            tableData[rowIndex][field] = input.value;
            finishEdit();
        });
        
        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();
        input.select();
    }
}

function finishEdit() {
    if (!editingCell) return;
    
    editingCell.classList.remove('editing');
    editingCell = null;
    renderTable();
    saveToLocalStorage();
    showStatus('บันทึกแล้ว');
}

function updateStats() {
    document.getElementById('totalCustomers').textContent = tableData.length;
    
    // Count today's customers
    const today = new Date();
    const todayStr = `${today.getDate()}-${today.getMonth() + 1}-${(today.getFullYear() + 543) % 100}`;
    const todayCount = tableData.filter(row => row.date === todayStr).length;
    document.getElementById('todayCustomers').textContent = todayCount;
    
    // Count pending (not closed)
    const pending = tableData.filter(row => !row.closedAmount || row.closedAmount === '').length;
    document.getElementById('pendingCustomers').textContent = pending;
    
    // Count closed
    const closed = tableData.filter(row => row.closedAmount && row.closedAmount !== '').length;
    document.getElementById('closedDeals').textContent = closed;
}

function addNewRow() {
    const newRow = {
        date: '',
        leadCode: (parseInt(tableData[tableData.length - 1]?.leadCode || '1151') + 1).toString(),
        name: '',
        phone: '',
        channel: '',
        procedure: '',
        deposit: '',
        confirmY: '',
        transfer100: '',
        csConfirm: '',
        sales: '',
        lastStatus: '',
        updateAccess: '',
        callTime: '',
        status1: '',
        reason: '',
        etc: '',
        hnCustomer: '',
        oldAppointment: '',
        dr: '',
        closedAmount: '',
        appointmentDate: ''
    };
    
    tableData.push(newRow);
    renderTable();
    saveToLocalStorage();
    showStatus('เพิ่มแถวใหม่แล้ว');
}

function searchTable(query) {
    const sanitized = sanitizeInput(query);
    const rows = document.querySelectorAll('#tableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(sanitized.toLowerCase()) ? '' : 'none';
    });
}

function filterTable() {
    const statusFilter = document.getElementById('statusFilter').value;
    const salesFilter = document.getElementById('salesFilter').value;
    
    const rows = document.querySelectorAll('#tableBody tr');
    rows.forEach((row, index) => {
        let show = true;
        
        if (statusFilter && tableData[index].status1 !== statusFilter) {
            show = false;
        }
        
        if (salesFilter && tableData[index].sales !== salesFilter) {
            show = false;
        }
        
        row.style.display = show ? '' : 'none';
    });
}

function showStatus(message, isError = false) {
    const indicator = document.getElementById('statusIndicator');
    indicator.textContent = message;
    indicator.classList.add('show');
    if (isError) {
        indicator.classList.add('error');
    } else {
        indicator.classList.remove('error');
    }
    setTimeout(() => {
        indicator.classList.remove('show');
    }, 2000);
}

function saveToLocalStorage() {
    try {
        localStorage.setItem('beautyCRMData', JSON.stringify(tableData));
        return true;
    } catch (e) {
        console.error('Failed to save data:', e);
        showStatus('บันทึกไม่สำเร็จ', true);
        return false;
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('beautyCRMData');
        if (saved) {
            tableData = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to load data:', e);
        tableData = [...initialData];
        showStatus('โหลดข้อมูลไม่สำเร็จ', true);
    }
}

function exportData() {
    // Create header row
    const headers = ['#', 'วัน/เดือน/ปี', 'รหัสลีด', 'ชื่อ-สกุล', 'เบอร์โทร', 'ช่องทาง', 'ประเภทหัตถการ', 
                   'มัดจำ', 'ยืนยัน Y/N', 'โอน 100%', 'CS ยัน', 'เซลล์', 'Last Status', 
                   'อัพเดท', 'เวลาโทร', 'Status 1', 'เหตุผล', 'ETC', 'HN', 'นัดผ่าเก่า', 
                   'DR.', 'ยอดปิด', 'นัดทำ'];
    
    let csv = '\ufeff' + headers.join(',') + '\n';
    
    // Add data rows
    tableData.forEach((row, index) => {
        const rowData = [
            index + 100,
            row.date,
            row.leadCode,
            row.name,
            row.phone,
            row.channel,
            row.procedure,
            row.deposit,
            row.confirmY,
            row.transfer100,
            row.csConfirm,
            row.sales,
            row.lastStatus,
            row.updateAccess,
            row.callTime,
            row.status1,
            row.reason,
            row.etc,
            row.hnCustomer,
            row.oldAppointment,
            row.dr,
            row.closedAmount,
            row.appointmentDate
        ].map(val => `"${String(val || '').replace(/"/g, '""')}"`);
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

function switchRole() {
    alert('กำลังพัฒนาฟีเจอร์ Switch Role');
}

function showSettings() {
    alert('กำลังพัฒนาหน้าตั้งค่า');
}

function signOut() {
    if (confirm('ต้องการออกจากระบบ?')) {
        alert('ออกจากระบบแล้ว');
    }
}

// Context menu with improved positioning
document.addEventListener('contextmenu', (e) => {
    const cell = e.target.closest('td');
    if (cell && !cell.classList.contains('row-number')) {
        e.preventDefault();
        contextCell = cell;
        
        const menu = document.getElementById('contextMenu');
        menu.style.display = 'block';
        
        // Calculate position to prevent off-screen
        const menuRect = {width: 150, height: 200}; // Approximate menu size
        let x = e.pageX;
        let y = e.pageY;
        
        if (x + menuRect.width > window.innerWidth + window.scrollX) {
            x = window.innerWidth + window.scrollX - menuRect.width - 5;
        }
        if (y + menuRect.height > window.innerHeight + window.scrollY) {
            y = window.innerHeight + window.scrollY - menuRect.height - 5;
        }
        
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
    }
});

document.addEventListener('click', () => {
    document.getElementById('contextMenu').style.display = 'none';
});

function editCell() {
    if (contextCell) {
        contextCell.dispatchEvent(new Event('dblclick'));
    }
}

function copyCell() {
    if (contextCell) {
        copiedCell = contextCell.textContent;
        showStatus('คัดลอกเซลล์แล้ว');
    }
}

function pasteCell() {
    if (contextCell && copiedCell !== null) {
        const rowIndex = contextCell.parentElement.rowIndex - 1;
        const cellIndex = contextCell.cellIndex;
        
        const fields = ['date', 'leadCode', 'name', 'phone', 'channel', 'procedure', 'deposit', 
                       'confirmY', 'transfer100', 'csConfirm', 'sales', 'lastStatus', 
                       'updateAccess', 'callTime', 'status1', 'reason', 'etc', 'hnCustomer',
                       'oldAppointment', 'dr', 'closedAmount', 'appointmentDate'];
        
        if (rowIndex >= 0 && fields[cellIndex - 1]) {
            tableData[rowIndex][fields[cellIndex - 1]] = copiedCell;
            renderTable();
            saveToLocalStorage();
            showStatus('วางเซลล์แล้ว');
        }
    }
}

function insertRowAbove() {
    if (contextCell) {
        const rowIndex = contextCell.parentElement.rowIndex - 1;
        const newRow = {
            date: '', leadCode: '', name: '', phone: '', channel: '', procedure: '',
            deposit: '', confirmY: '', transfer100: '', csConfirm: '', sales: '',
            lastStatus: '', updateAccess: '', callTime: '', status1: '', reason: '',
            etc: '', hnCustomer: '', oldAppointment: '', dr: '', closedAmount: '', appointmentDate: ''
        };
        
        tableData.splice(rowIndex, 0, newRow);
        renderTable();
        saveToLocalStorage();
        showStatus('แทรกแถวด้านบนแล้ว');
    }
}

function insertRowBelow() {
    if (contextCell) {
        const rowIndex = contextCell.parentElement.rowIndex - 1;
        const newRow = {
            date: '', leadCode: '', name: '', phone: '', channel: '', procedure: '',
            deposit: '', confirmY: '', transfer100: '', csConfirm: '', sales: '',
            lastStatus: '', updateAccess: '', callTime: '', status1: '', reason: '',
            etc: '', hnCustomer: '', oldAppointment: '', dr: '', closedAmount: '', appointmentDate: ''
        };
        
        tableData.splice(rowIndex + 1, 0, newRow);
        renderTable();
        saveToLocalStorage();
        showStatus('แทรกแถวด้านล่างแล้ว');
    }
}

function deleteRow() {
    if (contextCell) {
        const rowIndex = contextCell.parentElement.rowIndex - 1;
        if (confirm('ต้องการลบแถวนี้?')) {
            tableData.splice(rowIndex, 1);
            renderTable();
            saveToLocalStorage();
            showStatus('ลบแถวแล้ว');
        }
    }
}

function clearCell() {
    if (contextCell) {
        const rowIndex = contextCell.parentElement.rowIndex - 1;
        const cellIndex = contextCell.cellIndex;
        
        const fields = ['date', 'leadCode', 'name', 'phone', 'channel', 'procedure', 'deposit', 
                       'confirmY', 'transfer100', 'csConfirm', 'sales', 'lastStatus', 
                       'updateAccess', 'callTime', 'status1', 'reason', 'etc', 'hnCustomer',
                       'oldAppointment', 'dr', 'closedAmount', 'appointmentDate'];
        
        if (rowIndex >= 0 && fields[cellIndex - 1]) {
            tableData[rowIndex][fields[cellIndex - 1]] = '';
            renderTable();
            saveToLocalStorage();
            showStatus('ล้างเซลล์แล้ว');
        }
    }
}

// Initialize auto-save
function initAutoSave() {
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    autoSaveInterval = setInterval(() => {
        if (saveToLocalStorage()) {
            showStatus('Auto-saved');
        }
    }, 30000);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    saveToLocalStorage();
});

// Initialize
loadFromLocalStorage();
renderTable();
initAutoSave();
