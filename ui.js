// ================================================================================
// BEAUTY CLINIC CRM - UI LAYER (FINAL + EDIT/DELETE/DROPDOWN FEATURES)
// ================================================================================

const ui = {};

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

ui.showLoading = function(isLoading) {
    document.getElementById('loadingOverlay')?.classList.toggle('show', isLoading);
}

let statusTimeoutId = null;
ui.showStatus = function(message, isError = false) {
    const indicator = document.getElementById('statusIndicator');
    if (!indicator) return;
    clearTimeout(statusTimeoutId);
    indicator.textContent = message;
    indicator.className = `status-indicator show ${isError ? 'error' : 'success'}`;
    statusTimeoutId = setTimeout(() => indicator.classList.remove('show'), 3000);
}

ui.updateUIAfterLogin = function(user) {
    const userBadge = document.querySelector('.user-badge');
    if (userBadge && user) {
        const role = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        userBadge.textContent = `${role} - ${user.username}`;
        const roleColors = { 'administrator': '#dc3545', 'admin': '#007bff', 'sales': '#28a745' };
        userBadge.style.backgroundColor = roleColors[user.role] || '#6c757d';
    }
}

const FIELD_MAPPING = {
    '#': null, 'วัน/เดือน/ปี': 'date', 'ลำดับที่': 'lead_code', 'ชื่อลูกค้า': 'name', 'เบอร์ติดต่อ': 'phone',
    'ช่องทางสื่อ': 'channel', 'ประเภทหัตถการ': 'procedure', 'มัดจำ': 'deposit', 'ขอเบอร์ Y/N': 'confirm_y',
    'มัดจำออนไลน์ Y/N': 'transfer_100', 'CS ผู้ส่ง Lead': 'cs_confirm', 'เซลล์': 'sales', 'Last Status': 'last_status',
    'อัพเดทการเข้าถึง': 'update_access', 'เวลาโทร': 'call_time', 'Status SALE': 'status_1', 'เหตุผล': 'reason',
    'ETC': 'etc', 'HN ลูกค้า': 'hn_customer', 'วันที่นัดผ่าเก่าแล้ว': 'old_appointment', 'DR.': 'dr',
    'ยอดที่ปิดได้': 'closed_amount', 'วันที่นัดทำหัตถการ': 'appointment_date'
};
const HEADERS = Object.keys(FIELD_MAPPING);

function createCell(row, fieldName) {
    const td = document.createElement('td');
    td.dataset.field = fieldName;
    td.textContent = row[fieldName] || '';
    return td;
}

function createActionsCell(row) {
    const td = document.createElement('td');
    td.className = 'actions-cell';
    td.innerHTML = `
        <button class="btn-update" data-action="update-status" data-id="${row.id}" data-name="${escapeHtml(row.name || '')}">อัปเดต</button>
        <button class="btn-history" data-action="view-history" data-id="${row.id}" data-name="${escapeHtml(row.name || '')}">ประวัติ</button>
    `;
    return td;
}

function createRowElement(row, index) {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;
    const rowNumberCell = document.createElement('td');
    rowNumberCell.className = 'row-number';
    rowNumberCell.textContent = index + 1;
    tr.appendChild(rowNumberCell);
    HEADERS.slice(1).forEach(header => {
        const fieldName = FIELD_MAPPING[header];
        if (fieldName) {
            tr.appendChild(createCell(row, fieldName));
        } else {
             tr.appendChild(createActionsCell(row));
        }
    });
    return tr;
}

ui.renderTable = function(customers) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    const fragment = document.createDocumentFragment();
    customers.forEach((row, index) => fragment.appendChild(createRowElement(row, index)));
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
}

ui.prependNewRow = function(customer) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    const newRowElement = createRowElement(customer, 0);
    tbody.prepend(newRowElement);
    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row, index) => {
        const rowNumberCell = row.querySelector('.row-number');
        if (rowNumberCell) rowNumberCell.textContent = index + 1;
    });
    newRowElement.style.backgroundColor = '#d4edda';
    setTimeout(() => { newRowElement.style.backgroundColor = ''; }, 2000);
}

ui.showModal = function(modalId, context = {}) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (modalId === 'statusUpdateModal' || modalId === 'historyModal') {
        const nameElement = modal.querySelector(`#${modalId.replace('Modal','')}CustomerName`);
        if (nameElement) nameElement.textContent = context.customerName || 'N/A';
        if (modalId === 'statusUpdateModal') {
            const customerIdElement = modal.querySelector('#modalCustomerId');
            if (customerIdElement) customerIdElement.value = context.customerId || '';
        }
    }
    modal.style.display = 'flex';
}

ui.hideModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        if (modalId === 'statusUpdateModal') {
            modal.querySelector('#modalStatusSelect').value = '';
            modal.querySelector('#modalNotesText').value = '';
            modal.querySelector('#modalCustomerId').value = '';
        }
        if (modalId === 'historyModal') {
            document.getElementById('historyTimelineContainer').innerHTML = '';
        }
    }
}

ui.renderHistoryTimeline = function(historyData) {
    const container = document.getElementById('historyTimelineContainer');
    if (!container) return;
    if (!historyData || historyData.length === 0) {
        container.innerHTML = '<p>ยังไม่มีประวัติการติดตาม</p>';
        return;
    }
    container.innerHTML = historyData.map(item => `
        <div class="timeline-item">
            <div class="timeline-icon">✓</div>
            <div class="timeline-content">
                <div class="timeline-status">${escapeHtml(item.status)}</div>
                <div class="timeline-notes">${escapeHtml(item.notes || 'ไม่มีบันทึกเพิ่มเติม')}</div>
                <div class="timeline-footer">โดย: ${escapeHtml(item.users ? item.users.username : 'Unknown')} | ${new Date(item.created_at).toLocaleString('th-TH')}</div>
            </div>
        </div>
    `).join('');
}

ui.showContextMenu = function(event) {
    const menu = document.getElementById('contextMenu');
    menu.style.display = 'block';
    menu.style.left = `${event.pageX}px`;
    menu.style.top = `${event.pageY}px`;
};

ui.hideContextMenu = function() {
    const menu = document.getElementById('contextMenu');
    if (menu) menu.style.display = 'none';
};


// 🟡 MODIFIED: อัปเกรดฟังก์ชันให้สร้าง <select> ได้เมื่อมี options ส่งมา
ui.createCellEditor = function(cell, value, options) {
    cell.classList.add('editing');

    if (options && Array.isArray(options)) {
        // ถ้ามี options ให้สร้างเป็น Dropdown (<select>)
        const optionsHtml = options.map(opt => 
            `<option value="${escapeHtml(opt)}" ${opt === value ? 'selected' : ''}>${escapeHtml(opt)}</option>`
        ).join('');
        cell.innerHTML = `<select class="cell-select">${optionsHtml}</select>`;
    } else {
        // ถ้าไม่มี ให้สร้างเป็นช่องกรอกข้อความปกติ (<input>)
        cell.innerHTML = `<input type="text" class="cell-input" value="${escapeHtml(value)}" />`;
    }

    const editor = cell.querySelector('input, select');
    editor.focus();
    if (editor.tagName === 'INPUT') {
        editor.select();
    }
};


ui.revertCellToText = function(cell, value) {
    if (cell) {
        cell.classList.remove('editing');
        cell.textContent = value;
    }
};

ui.removeRow = function(rowId) {
    const row = document.querySelector(`tr[data-id="${rowId}"]`);
    if (row) {
        row.style.backgroundColor = '#f8d7da';
        row.style.transition = 'opacity 0.5s ease';
        row.style.opacity = '0';
        setTimeout(() => row.remove(), 500);
    }
};

window.ui = ui;
