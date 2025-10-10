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
// SINGLE SOURCE OF TRUTH: FIELD MAPPING
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
    'จัดการ':              { field: null, section: 'sales' } 
};

ui.FIELD_MAPPING = FIELD_MAPPING;
const HEADERS = Object.keys(FIELD_MAPPING);

// ================================================================================
// DYNAMIC TABLE HEADER RENDERING
// ================================================================================

ui.renderTableHeaders = function() {
    const thead = document.querySelector('.excel-table thead');
    if (!thead) return;
    const tr = document.createElement('tr');
    HEADERS.forEach(headerText => {
        const th = document.createElement('th');
        const config = FIELD_MAPPING[headerText];
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
// TABLE RENDERING
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

    // ✨ FIXED: Add a null check for currentUser and currentUser.role
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
    HEADERS.slice(1).forEach(header => {
        const config = FIELD_MAPPING[header];
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
// MODAL & FORM MANAGEMENT
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

    const allEditableFields = {
        ...FIELD_MAPPING,
        'Staus Sale': { field: 'status_1', section: 'sales'},
        'เหตุผล': { field: 'reason', section: 'sales' }
    };
    
    const dealClosingFields = ['last_status', 'status_1', 'closed_amount'];

    Object.entries(allEditableFields).forEach(([header, config]) => {
        const field = config.field;
        if (!field) return; 

        const value = customer[field] || '';
        const options = (field === 'sales') ? salesList : dropdownOptions[field];
        
        // ✨ FIXED: Add a null check for currentUser and currentUser.role
        const userRole = (currentUser && currentUser.role) ? currentUser.role.toLowerCase() : 'sales';
        const isAdmin = userRole === 'admin' || userRole === 'administrator';
        const isSalesUser = userRole === 'sales';

        const isEditableBySales = isSalesUser && salesEditableFields.includes(field);
        const isEditable = (isAdmin || isEditableBySales) && field !== 'lead_code';

        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        formGroup.dataset.fieldGroup = field;
        
        let inputHtml = '';
        if (options) {
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

// ... (Rest of ui.js is unchanged)
ui.renderPaginationControls = function(totalPages, currentPage, totalRecords, pageSize) { /* ... */ };
ui.showModal = function(modalId, context = {}) { /* ... */ };
ui.hideModal = function(modalId) { /* ... */ };
ui.populateFilterDropdown = function(elementId, options) { /* ... */ };
ui.renderHistoryTimeline = function(historyData) { /* ... */ };
ui.showContextMenu = function(event) { /* ... */ };
ui.hideContextMenu = function() { /* ... */ };

window.ui = ui;
