// ================================================================================
// BEAUTY CLINIC CRM - UI LAYER (COMPLETE FIXED VERSION 100%)
// ================================================================================

const ui = {};

// ================================================================================
// UTILITY FUNCTIONS
// ================================================================================

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[m]);
}

// ================================================================================
// LOADING & STATUS INDICATORS
// ================================================================================

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

// ================================================================================
// USER INTERFACE UPDATES
// ================================================================================

ui.updateUIAfterLogin = function(user) {
    const userBadge = document.querySelector('.user-badge');
    if (userBadge && user) {
        const role = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        userBadge.textContent = `${role} - ${user.username}`;
        
        const roleColors = {
            'administrator': '#dc3545',
            'admin': '#007bff',
            'sales': '#28a745'
        };
        userBadge.style.backgroundColor = roleColors[user.role] || '#6c757d';
    }
}

// ================================================================================
// FIELD MAPPING & CONSTANTS
// ================================================================================

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
    'อัพเดทการเข้าถึง': 'update_access',
    'Last Status': 'last_status',
    'เวลาโทร': 'call_time',
    'Staus Sale': 'status_1',
    'เหตุผล': 'reason',
    'ETC': 'etc',
    'HN ลูกค้า': 'hn_customer',
    'วันที่นัด CS': 'old_appointment',
    'DR.': 'dr',
    'ยอดที่ปิดได้': 'closed_amount',
    'วันที่นัดทำหัตถการ': 'appointment_date',
    'จัดการ': null
};

ui.FIELD_MAPPING = FIELD_MAPPING;
const HEADERS = Object.keys(FIELD_MAPPING);

// ================================================================================
// TABLE RENDERING
// ================================================================================

function createCell(row, fieldName) {
    const td = document.createElement('td');
    td.dataset.field = fieldName;
    td.textContent = row[fieldName] || '';
    // ✅ [Mobile-First Update] ลบ Logic ที่ไม่จำเป็นสำหรับการแก้ไขในตารางออก
    // การควบคุมสิทธิ์ทั้งหมดจะอยู่ที่ปุ่มและ class ของแถว (tr)
    return td;
}

function createActionsCell(row, currentUser) {
    const td = document.createElement('td');
    td.className = 'actions-cell';
    
    const displayName = row.name || row.lead_code || row.phone || 'N/A';

    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'administrator';
    const isOwner = row.sales === currentUser.username;
    const canEdit = isAdmin || isOwner;

    const disabledAttribute = !canEdit ? 'disabled' : '';

    td.innerHTML = `
        <button class="btn-edit" data-action="edit-customer" data-id="${row.id}" ${disabledAttribute}>แก้ไข</button>
        <button class="btn-update" data-action="update-status" data-id="${row.id}" data-name="${escapeHtml(displayName)}" ${disabledAttribute}>อัปเดต</button>
        <button class="btn-history" data-action="view-history" data-id="${row.id}" data-name="${escapeHtml(displayName)}">ประวัติ</button>
    `;
    return td;
}

function createRowElement(row, index, currentUser) {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;

    if (row.status_1 === 'ปิดการขาย' && row.last_status === '100%' && row.closed_amount) {
        tr.classList.add('row-deal-closed');
    }

    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'administrator';
    const isOwner = row.sales === currentUser.username;
    
    if (!isAdmin && !isOwner) {
        tr.classList.add('read-only-row');
    }
    
    const rowNumberCell = document.createElement('td');
    rowNumberCell.className = 'row-number';
    rowNumberCell.textContent = index + 1;
    tr.appendChild(rowNumberCell);
    
    HEADERS.slice(1).forEach(header => {
        const fieldName = FIELD_MAPPING[header];
        if (fieldName) {
            tr.appendChild(createCell(row, fieldName));
        } else if (header === 'จัดการ') {
            tr.appendChild(createActionsCell(row, currentUser));
        }
    });
    
    return tr;
}

ui.renderTable = function(customers, currentUser, salesEditableFields) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    const fragment = document.createDocumentFragment();
    customers.forEach((row, index) => {
        fragment.appendChild(createRowElement(row, index, currentUser, salesEditableFields));
    });
    
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
}

// ================================================================================
// MODAL & FORM MANAGEMENT
// ================================================================================

ui.showModal = function(modalId, context = {}) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    if (modalId === 'statusUpdateModal' || modalId === 'historyModal') {
        const nameElement = modal.querySelector(`#${modalId.replace('Modal', '')}CustomerName`);
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
    if (!modal) return;
    
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

ui.buildEditForm = function(customer, currentUser, salesEditableFields, salesList, dropdownOptions) {
    const form = document.getElementById('editCustomerForm');
    form.innerHTML = ''; 

    Object.entries(FIELD_MAPPING).forEach(([header, field]) => {
        if (!field) return; 

        const value = customer[field] || '';
        const options = (field === 'sales') ? salesList : dropdownOptions[field];
        const isSalesUser = currentUser.role === 'sales';
        
        // Admin can edit everything. Sales can only edit fields in SALES_EDITABLE_FIELDS.
        const isAdmin = currentUser.role === 'admin' || currentUser.role === 'administrator';
        const isEditableBySales = isSalesUser && salesEditableFields.includes(field);
        const isEditable = isAdmin || isEditableBySales;

        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        
        let inputHtml = '';
        if (options) {
            const optionsHtml = options.map(opt => `<option value="${escapeHtml(opt)}" ${opt === value ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('');
            inputHtml = `<select name="${field}" ${!isEditable ? 'disabled' : ''}><option value="">-- เลือก --</option>${optionsHtml}</select>`;
        } else {
            const fieldType = (field === 'date' || field === 'appointment_date' || field === 'old_appointment') ? 'date' : 'text';
            inputHtml = `<input type="${fieldType}" name="${field}" value="${escapeHtml(value)}" ${!isEditable ? 'disabled' : ''}>`;
        }
        
        formGroup.innerHTML = `<label for="${field}">${header}</label>${inputHtml}`;
        form.appendChild(formGroup);
    });
    document.getElementById('editModalTitle').textContent = `แก้ไข: ${customer.name || 'ลูกค้าใหม่'}`;
};

ui.populateFilterDropdown = function(elementId, options) {
    const select = document.getElementById(elementId);
    if (!select) return;
    while (select.options.length > 1) {
        select.remove(1);
    }
    (options || []).forEach(option => {
        if (option) {
            const optElement = document.createElement('option');
            optElement.value = option;
            optElement.textContent = option;
            select.appendChild(optElement);
        }
    });
};

// ================================================================================
// HISTORY TIMELINE, CONTEXT MENU, INLINE EDITING, etc.
// ================================================================================

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
                <div class="timeline-footer">
                    โดย: ${escapeHtml(item.users ? item.users.username : 'Unknown')} | 
                    ${new Date(item.created_at).toLocaleString('th-TH')}
                </div>
            </div>
        </div>
    `).join('');
}

ui.showContextMenu = function(event) {
    const menu = document.getElementById('contextMenu');
    if (!menu) return;
    
    menu.style.display = 'block';
    menu.style.left = `${event.pageX}px`;
    menu.style.top = `${event.pageY}px`;
};

ui.hideContextMenu = function() {
    const menu = document.getElementById('contextMenu');
    if (menu) menu.style.display = 'none';
};

ui.createCellEditor = function(cell, value, options) {
    // ฟังก์ชันนี้ไม่ได้ถูกเรียกใช้งานแล้ว แต่เก็บไว้เผื่ออนาคต
    cell.classList.add('editing');
    
    if (options && Array.isArray(options)) {
        const optionsHtml = options.map(opt => 
            `<option value="${escapeHtml(opt)}" ${opt === value ? 'selected' : ''}>${escapeHtml(opt)}</option>`
        ).join('');
        
        cell.innerHTML = `
            <select class="cell-select">
                <option value="">-- เลือก --</option>
                ${optionsHtml}
            </select>
        `;
    } else {
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

window.ui = ui;
