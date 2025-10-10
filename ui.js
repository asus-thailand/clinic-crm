// ================================================================================
// BEAUTY CLINIC CRM - UI LAYER (COMPLETE FIXED VERSION 100%)
// ================================================================================

const ui = {};

// ================================================================================
// UTILITY FUNCTIONS
// ================================================================================

function parseDateString(dateStr) {
    if (!dateStr) return null;
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            let year = parseInt(parts[2], 10);
            if (year > 2500) { year -= 543; }
            return new Date(year, month, day);
        }
    }
    const date = new Date(dateStr + 'T00:00:00');
    return isNaN(date.getTime()) ? null : date;
}

function formatDateToDMY(dateStr) {
    const dateObj = parseDateString(dateStr);
    if (!dateObj) return dateStr || '';
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
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
        const userRole = user.role || 'sales'; 
        const role = userRole.charAt(0).toUpperCase() + userRole.slice(1);
        userBadge.textContent = `${role} - ${user.username}`;
        const roleColors = { 'administrator': '#dc3545', 'admin': '#007bff', 'sales': '#28a745' };
        userBadge.style.backgroundColor = roleColors[userRole.toLowerCase()] || '#6c757d';
    }
}

// ================================================================================
// SINGLE SOURCE OF TRUTH: FIELD MAPPING (REFACTORED)
// ================================================================================

const FIELD_MAPPING = {
    '#':                  { field: null, section: 'special' },
    'วัน/เดือน/ปี':     { field: 'date', section: 'admin' },
    'ลำดับที่':           { field: 'lead_code', section: 'admin' },
    'ชื่อลูกค้า':         { field: 'name', section: 'admin' },
    'เบอร์ติดต่อ':       { field: 'phone', section: 'admin' },
    'ช่องทางสื่อ':       { field: 'channel', section: 'admin' },
    'ประเภทหัตถการ':  { field: 'procedure', section: 'admin' },
    'มัดจำ':               { field: 'deposit', section: 'admin' },
    'ขอเบอร์ Y/N':        { field: 'confirm_y', section: 'admin' },
    'มัดจำออนไลน์ Y/N': { field: 'transfer_100', section: 'admin' },
    'CS ผู้ส่ง Lead':     { field: 'cs_confirm', section: 'admin' },
    'เซลล์':               { field: 'sales', section: 'admin' },
    'อัพเดทการเข้าถึง':  { field: 'update_access', section: 'sales' },
    'Last Status':      { field: 'last_status', section: 'sales' },
    'เวลาโทร':            { field: 'call_time', section: 'sales' },
    'ETC':                { field: 'etc', section: 'sales' },
    'HN ลูกค้า':          { field: 'hn_customer', section: 'sales' },
    'วันที่นัด CS':       { field: 'old_appointment', section: 'sales' },
    'DR.':                { field: 'dr', section: 'sales' },
    'ยอดที่ปิดได้':      { field: 'closed_amount', section: 'sales' },
    'วันที่นัดทำหัตถการ':{ field: 'appointment_date', section: 'sales' },
    'จัดการ':              { field: null, section: 'sales' },
    'Status Sale':      { field: 'status_1', section: 'sales', isHeader: false },
    'เหตุผล':              { field: 'reason', section: 'sales', isHeader: false }
};

ui.FIELD_MAPPING = FIELD_MAPPING;

// ================================================================================
// DYNAMIC TABLE HEADER RENDERING (REFACTORED)
// ================================================================================

ui.renderTableHeaders = function() {
    const thead = document.querySelector('.excel-table thead');
    if (!thead) return;
    const tr = document.createElement('tr');
    Object.entries(FIELD_MAPPING).forEach(([headerText, config]) => {
        if (config.isHeader === false) return;

        const th = document.createElement('th');
        th.textContent = headerText;
        if (config.section === 'admin') { th.className = 'header-admin-section'; }
        else if (config.section === 'sales') { th.className = 'header-sales-section'; }
        else if (headerText === '#') { th.className = 'row-number'; }
        tr.appendChild(th);
    });
    thead.innerHTML = ''; 
    thead.appendChild(tr);
};

// ================================================================================
// TABLE RENDERING (REFACTORED)
// ================================================================================

function createCell(row, fieldName) {
    const td = document.createElement('td');
    td.dataset.field = fieldName;
    const dateFields = ['date', 'old_appointment', 'appointment_date'];
    if (dateFields.includes(fieldName)) {
        td.textContent = formatDateToDMY(row[fieldName]);
    } else {
        td.textContent = row[fieldName] || '';
    }
    return td;
}

function createActionsCell(row, currentUser) {
    const td = document.createElement('td');
    td.className = 'actions-cell';
    const displayName = row.name || row.lead_code || row.phone || 'N/A';
    const userRole = (currentUser && currentUser.role) ? currentUser.role.toLowerCase() : 'sales';
    const isAdmin = userRole === 'admin' || userRole === 'administrator';
    const isOwner = currentUser && row.sales === currentUser.username;
    const canEdit = isAdmin || isOwner;
    const disabledAttribute = !canEdit ? 'disabled' : '';
    td.innerHTML = `
        <button class="btn-edit" data-action="edit-customer" data-id="${row.id}" ${disabledAttribute}>แก้ไข</button>
        <button class="btn-update" data-action="update-status" data-id="${row.id}" data-name="${escapeHtml(displayName)}" ${disabledAttribute}>อัปเดต</button>
        <button class="btn-history" data-action="view-history" data-id="${row.id}" data-name="${escapeHtml(displayName)}">ประวัติ</button>
    `;
    return td;
}

function createRowElement(row, index, page, pageSize) {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;
    if (row.status_1 === 'ปิดการขาย' && row.last_status === '100%' && row.closed_amount) {
        tr.classList.add('row-deal-closed');
    }
    const rowNumberCell = document.createElement('td');
    rowNumberCell.className = 'row-number';
    rowNumberCell.textContent = (page - 1) * pageSize + index + 1;
    tr.appendChild(rowNumberCell);
    Object.entries(FIELD_MAPPING).slice(1).forEach(([header, config]) => {
        if (config.isHeader === false) return;

        if (header === 'จัดการ') {
            tr.appendChild(createActionsCell(row, window.state.currentUser));
        } else if (config && config.field) {
            tr.appendChild(createCell(row, config.field));
        }
    });
    return tr;
}

ui.renderTable = function(paginatedCustomers, page, pageSize) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    const fragment = document.createDocumentFragment();
    paginatedCustomers.forEach((row, index) => {
        fragment.appendChild(createRowElement(row, index, page, pageSize));
    });
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
}

// ================================================================================
// MODAL & FORM MANAGEMENT (REFACTORED)
// ================================================================================

ui.buildEditForm = function(customer, currentUser, salesEditableFields, salesList, dropdownOptions) {
    const form = document.getElementById('editCustomerForm');
    form.innerHTML = ''; 

    const adminSection = document.createElement('div');
    adminSection.className = 'modal-section admin-section';
    adminSection.innerHTML = '<h3 class="modal-section-title">ส่วนของแอดมิน (Admin Section)</h3>';
    const adminContent = document.createElement('div');
    adminContent.className = 'modal-section-content';
    adminSection.appendChild(adminContent);

    const salesSection = document.createElement('div');
    salesSection.className = 'modal-section sales-section';
    salesSection.innerHTML = '<h3 class="modal-section-title">ส่วนของเซลล์ (Sales Section)</h3>';
    const salesContent = document.createElement('div');
    salesContent.className = 'modal-section-content';
    salesSection.appendChild(salesContent);
    
    const dealClosingFields = ['last_status', 'status_1', 'closed_amount'];

    Object.entries(FIELD_MAPPING).forEach(([header, config]) => {
        const field = config.field;
        if (!field) return; 

        const value = customer[field] || '';
        const options = (field === 'sales') ? salesList : dropdownOptions[field];
        const userRole = (currentUser && currentUser.role) ? currentUser.role.toLowerCase() : 'sales';
        const isAdmin = userRole === 'admin' || userRole === 'administrator';
        const isSalesUser = userRole === 'sales';
        const allSalesEditableFields = [...salesEditableFields, 'status_1', 'reason'];
        const isEditableBySales = isSalesUser && allSalesEditableFields.includes(field);
        const isEditable = (isAdmin || isEditableBySales) && field !== 'lead_code';

        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        formGroup.dataset.fieldGroup = field;
        
        let inputHtml = '';
        if (field === 'reason') {
            inputHtml = `<textarea name="${field}" ${!isEditable ? 'disabled' : ''}>${escapeHtml(value)}</textarea>`;
        } else if (options) {
            const optionsHtml = options.map(opt => `<option value="${escapeHtml(opt)}" ${opt === value ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('');
            inputHtml = `<select name="${field}" ${!isEditable ? 'disabled' : ''}><option value="">-- เลือก --</option>${optionsHtml}</select>`;
        } else {
            const fieldType = (field === 'date' || field === 'appointment_date' || field === 'old_appointment') ? 'date' : 'text';
            inputHtml = `<input type="${fieldType}" name="${field}" value="${escapeHtml(value)}" ${!isEditable ? 'disabled' : ''}>`;
        }
        
        formGroup.innerHTML = `<label for="${field}">${header}</label>${inputHtml}`;
        
        if (config.section === 'admin') {
            adminContent.appendChild(formGroup);
        } else if (config.section === 'sales') {
            salesContent.appendChild(formGroup);
        }
    });

    form.appendChild(adminSection);
    form.appendChild(salesSection);

    const lastStatusInput = form.querySelector('[name="last_status"]');
    const status1Input = form.querySelector('[name="status_1"]');
    const closedAmountInput = form.querySelector('[name="closed_amount"]');
    const highlightFields = () => {
        const isClosingAttempt = (lastStatusInput.value === '100%') || (status1Input.value === 'ปิดการขาย') || (closedAmountInput.value && closedAmountInput.value.trim() !== '');
        dealClosingFields.forEach(fieldName => {
            const group = form.querySelector(`[data-field-group="${fieldName}"]`);
            if (group) { group.classList.toggle('highlight-deal-closing', isClosingAttempt); }
        });
    };
    [lastStatusInput, status1Input, closedAmountInput].forEach(input => {
        if (input) {
            input.addEventListener('change', highlightFields);
            input.addEventListener('input', highlightFields);
        }
    });
    highlightFields();
    document.getElementById('editModalTitle').textContent = `แก้ไข: ${customer.name || 'ลูกค้าใหม่'}`;
};
ui.renderPaginationControls = function(totalPages, currentPage, totalRecords, pageSize) {
    const container = document.getElementById('paginationContainer');
    if (!container) return;
    if (totalRecords === 0) { container.innerHTML = '<div class="pagination-info">ไม่พบข้อมูล</div>'; return; }
    const pageSizeHTML = `<div class="page-size-selector"><label for="pageSize">แสดง:</label><select id="pageSize"><option value="25" ${pageSize == 25 ? 'selected' : ''}>25</option><option value="50" ${pageSize == 50 ? 'selected' : ''}>50</option><option value="100" ${pageSize == 100 ? 'selected' : ''}>100</option><option value="200" ${pageSize == 200 ? 'selected' : ''}>200</option></select><span>แถว</span></div>`;
    const startRecord = (currentPage - 1) * pageSize + 1;
    const endRecord = Math.min(currentPage * pageSize, totalRecords);
    const infoHTML = `<div class="pagination-info">แสดง ${startRecord} - ${endRecord} จากทั้งหมด ${totalRecords}</div>`;
    let buttonsHTML = `<button data-page="prev" ${currentPage === 1 ? 'disabled' : ''}>&laquo;</button>`;
    const maxButtons = 5; let startPage, endPage;
    if (totalPages <= maxButtons) { startPage = 1; endPage = totalPages; } else { const maxPagesBeforeCurrent = Math.floor(maxButtons / 2); const maxPagesAfterCurrent = Math.ceil(maxButtons / 2) - 1; if (currentPage <= maxPagesBeforeCurrent) { startPage = 1; endPage = maxButtons; } else if (currentPage + maxPagesAfterCurrent >= totalPages) { startPage = totalPages - maxButtons + 1; endPage = totalPages; } else { startPage = currentPage - maxPagesBeforeCurrent; endPage = currentPage + maxPagesAfterCurrent; } }
    if (startPage > 1) { buttonsHTML += `<button data-page="1">1</button>`; if (startPage > 2) buttonsHTML += `<span>...</span>`; }
    for (let i = startPage; i <= endPage; i++) { buttonsHTML += `<button data-page="${i}" class="${i === currentPage ? 'active' : ''}">${i}</button>`; }
    if (endPage < totalPages) { if (endPage < totalPages - 1) buttonsHTML += `<span>...</span>`; buttonsHTML += `<button data-page="${totalPages}">${totalPages}</button>`; }
    buttonsHTML += `<button data-page="next" ${currentPage === totalPages ? 'disabled' : ''}>&raquo;</button>`;
    const controlsHTML = `<div class="pagination-controls">${buttonsHTML}</div>`;
    container.innerHTML = `${pageSizeHTML}${infoHTML}${controlsHTML}`;
};
ui.showModal = function(modalId, context = {}) { const modal = document.getElementById(modalId); if (!modal) return; if (modalId === 'statusUpdateModal' || modalId === 'historyModal') { const nameElement = modal.querySelector(`#${modalId.replace('Modal', '')}CustomerName`); if (nameElement) nameElement.textContent = context.customerName || 'N/A'; if (modalId === 'statusUpdateModal') { const customerIdElement = modal.querySelector('#modalCustomerId'); if (customerIdElement) customerIdElement.value = context.customerId || ''; } } modal.style.display = 'flex'; };
ui.hideModal = function(modalId) { const modal = document.getElementById(modalId); if (!modal) return; modal.style.display = 'none'; if (modalId === 'statusUpdateModal') { modal.querySelector('#modalStatusSelect').value = ''; modal.querySelector('#modalNotesText').value = ''; modal.querySelector('#modalCustomerId').value = ''; } if (modalId === 'historyModal') { document.getElementById('historyTimelineContainer').innerHTML = ''; } };
ui.populateFilterDropdown = function(elementId, options) { const select = document.getElementById(elementId); if (!select) return; while (select.options.length > 1) { select.remove(1); } (options || []).forEach(option => { if (option) { const optElement = document.createElement('option'); optElement.value = option; optElement.textContent = option; select.appendChild(optElement); } }); };
ui.renderHistoryTimeline = function(historyData) {
    const container = document.getElementById('historyTimelineContainer');
    if (!container) return;
    if (!historyData || historyData.length === 0) {
        container.innerHTML = '<p>ยังไม่มีประวัติการติดตาม</p>';
        return;
    }
    // *** จุดที่แก้ไข: เพิ่ม Logic การกำหนด class ตาม role ของผู้ใช้ ***
    container.innerHTML = historyData.map(item => {
        let roleClass = 'history-default'; // คลาสเริ่มต้น
        if (item.users && item.users.role) {
            const role = item.users.role.toLowerCase();
            if (role === 'admin' || role === 'administrator') {
                roleClass = 'history-admin';
            } else if (role === 'sales') {
                roleClass = 'history-sales';
            }
        }
        return `
            <div class="timeline-item ${roleClass}">
                <div class="timeline-icon">✓</div>
                <div class="timeline-content">
                    <div class="timeline-status">${escapeHtml(item.status)}</div>
                    <div class="timeline-notes">${escapeHtml(item.notes || 'ไม่มีบันทึกเพิ่มเติม')}</div>
                    <div class="timeline-footer">
                        โดย: ${escapeHtml(item.users ? item.users.username : 'Unknown')} | ${new Date(item.created_at).toLocaleString('th-TH')}
                    </div>
                </div>
            </div>`;
    }).join('');
};
ui.showContextMenu = function(event) { const menu = document.getElementById('contextMenu'); if (!menu) return; menu.style.display = 'block'; menu.style.left = `${event.pageX}px`; menu.style.top = `${event.pageY}px`; };
ui.hideContextMenu = function() { const menu = document.getElementById('contextMenu'); if (menu) menu.style.display = 'none'; };

window.ui = ui;
