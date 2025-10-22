// ================================================================================
// BEAUTY CLINIC CRM - UI LAYER (COMPLETE FIXED VERSION 100%)
// ================================================================================

const ui = {};

// ค่าคงที่สำหรับการไฮไลท์แถว (Constants)
const STALE_CASE_WARNING_DAYS = 15;
const STALE_CASE_CRITICAL_DAYS = 21;

// ================================================================================
// UTILITY FUNCTIONS
// ================================================================================

/**
 * Parses a date string (YYYY-MM-DD) into a UTC Date object.
 * Returns null if the string is invalid.
 */
function parseDateString(dateStr) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    const date = new Date(dateStr + 'T00:00:00Z'); // Create as UTC
    return isNaN(date.getTime()) ? null : date;
}

/**
 * Formats a date string (YYYY-MM-DD) or a Date object into DD/MM/YYYY format.
 * Assumes the input date string or Date object represents a UTC date.
 */
function formatDateToDMY(dateInput) {
    let dateObj;
    if (typeof dateInput === 'string') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return dateInput || ''; // Return original if not YYYY-MM-DD
        dateObj = parseDateString(dateInput);
    } else if (dateInput instanceof Date) {
        dateObj = dateInput;
    } else {
        return dateInput || ''; // Return original if not string or Date
    }

    if (!dateObj || isNaN(dateObj.getTime())) return dateInput || ''; // Return original if invalid date

    // Use UTC methods as the date is UTC
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = dateObj.getUTCFullYear();
    return `${day}/${month}/${year}`;
}


function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
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
        const userRole = (user.role || 'sales').toLowerCase();
        const role = userRole.charAt(0).toUpperCase() + userRole.slice(1);
        userBadge.textContent = `${role} - ${user.username}`;
        const roleColors = { 'administrator': '#dc3545', 'admin': '#007bff', 'sales': '#28a745' };
        userBadge.style.backgroundColor = roleColors[userRole] || '#6c757d';
    }
}

ui.updateSortIndicator = function(column, direction) {
    document.querySelectorAll('th[data-sortable]').forEach(th => {
        const indicator = th.querySelector('.sort-indicator');
        if (indicator) {
            if (th.dataset.sortable === column) {
                indicator.textContent = direction === 'asc' ? ' ▲' : ' ▼';
            } else {
                indicator.textContent = '';
            }
        }
    });
};


// ================================================================================
// SINGLE SOURCE OF TRUTH: FIELD MAPPING (REFACTORED)
// ================================================================================

const FIELD_MAPPING = {
    '#':                  { field: null, section: 'special' },
    'วัน/เดือน/ปี':     { field: 'date', section: 'admin', sortable: true },
    'ลำดับที่':           { field: 'lead_code', section: 'admin', sortable: true }, // Added sortable
    'ชื่อลูกค้า':         { field: 'name', section: 'admin' },
    'เบอร์ติดต่อ':       { field: 'phone', section: 'admin' },
    'ช่องทางสื่อ':       { field: 'channel', section: 'admin' },
    'ประเภทหัตถการ':  { field: 'procedure', section: 'admin' },
    'มัดจำ':               { field: 'deposit', section: 'admin' },
    'ขอเบอร์ Y/N':        { field: 'confirm_y', section: 'admin' },
    'CS ผู้ส่ง Lead':     { field: 'cs_confirm', section: 'admin' },
    'เซลล์':               { field: 'sales', section: 'admin' },
    'เวลาลงข้อมูล':       { field: 'call_time', section: 'admin' },
    'อัพเดทการเข้าถึง':  { field: 'update_access', section: 'sales' },
    'Status Sale':      { field: 'status_1', section: 'sales' },
    'Last Status':      { field: 'last_status', section: 'sales' },
    'เหตุผล':              { field: 'reason', section: 'sales', isHeader: false },
    'ETC':                { field: 'etc', section: 'sales' },
    'HN ลูกค้า':          { field: 'hn_customer', section: 'sales' },
    'วันที่นัด CS':       { field: 'old_appointment', section: 'sales' },
    'DR.':                { field: 'dr', section: 'sales' },
    'ยอดที่ปิดได้':      { field: 'closed_amount', section: 'sales' },
    'วันที่ปิดการขาย':   { field: 'closed_date', section: 'sales', sortable: true },
    'วันที่นัดทำหัตถการ':{ field: 'appointment_date', section: 'sales' },
    'จัดการ':              { field: null, section: 'sales' }
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
        if (config.sortable) {
            th.dataset.sortable = config.field;
            th.classList.add('sortable-header');
            th.innerHTML = `${escapeHtml(headerText)}<span class="sort-indicator"></span>`;
        } else {
            th.textContent = headerText;
        }

        if (config.section === 'admin') { th.classList.add('header-admin-section'); }
        else if (config.section === 'sales') { th.classList.add('header-sales-section'); }
        else if (headerText === '#') { th.classList.add('row-number'); }

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
    const dateFields = ['date', 'old_appointment', 'appointment_date', 'closed_date'];
    if (dateFields.includes(fieldName)) {
        td.textContent = formatDateToDMY(row[fieldName]);
    } else {
        td.textContent = row[fieldName] ?? '';
    }
    return td;
}

function createActionsCell(row, currentUser) {
    const td = document.createElement('td');
    td.className = 'actions-cell';
    const displayName = row.name || row.lead_code || row.phone || 'N/A';
    const userRole = (currentUser?.role || 'sales').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'administrator';
    const isOwner = currentUser && row.sales === currentUser.username;
    const canEdit = isAdmin || isOwner;
    const disabledAttribute = !canEdit ? 'disabled' : '';

    const editButton = document.createElement('button');
    editButton.className = 'btn-edit';
    editButton.dataset.action = 'edit-customer';
    editButton.dataset.id = row.id;
    editButton.textContent = 'แก้ไข';
    if (!canEdit) editButton.disabled = true;

    const updateButton = document.createElement('button');
    updateButton.className = 'btn-update';
    updateButton.dataset.action = 'update-status';
    updateButton.dataset.id = row.id;
    updateButton.setAttribute('data-name', displayName);
    updateButton.textContent = 'อัปเดต';
    if (!canEdit) updateButton.disabled = true;

    const historyButton = document.createElement('button');
    historyButton.className = 'btn-history';
    historyButton.dataset.action = 'view-history';
    historyButton.dataset.id = row.id;
    historyButton.setAttribute('data-name', displayName);
    historyButton.textContent = 'ประวัติ';

    td.appendChild(editButton);
    td.appendChild(updateButton);
    td.appendChild(historyButton);
    return td;
}


function createRowElement(row, index, page, pageSize) {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;

    if (row.status_1 === 'ปิดการขาย' && row.last_status === '100%' && row.closed_amount) {
        tr.classList.add('row-deal-closed');
    }

    // --- Timezone bug fix for stale case highlighting ---
    if (row.date && !tr.classList.contains('row-deal-closed')) {
        const todayUTC = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
        const caseDateUTC = parseDateString(row.date);

        if (caseDateUTC) {
            const timeDiff = todayUTC.getTime() - caseDateUTC.getTime();
            const daysOld = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

            if (daysOld >= STALE_CASE_CRITICAL_DAYS) {
                tr.classList.add('row-stale-case-21');
            } else if (daysOld >= STALE_CASE_WARNING_DAYS) {
                tr.classList.add('row-stale-case-15');
            }
        }
    }
    // --- End Stale Case Highlighting Fix ---

    const rowNumberCell = document.createElement('td');
    rowNumberCell.className = 'row-number';
    rowNumberCell.textContent = (page - 1) * pageSize + index + 1;
    tr.appendChild(rowNumberCell);

    Object.entries(FIELD_MAPPING).forEach(([header, config]) => {
        if (!config.field && header !== 'จัดการ') return;
        if (config.isHeader === false) return;

        if (header === 'จัดการ') {
            tr.appendChild(createActionsCell(row, window.state?.currentUser));
        } else if (config.field) {
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
    if (!form) return;
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

    const dealClosingFields = ['last_status', 'status_1', 'closed_amount', 'closed_date'];

    Object.entries(FIELD_MAPPING).forEach(([header, config]) => {
        const field = config.field;
        if (!field) return;

        const value = customer[field] ?? '';
        const options = (field === 'sales') ? salesList : dropdownOptions[field];
        const userRole = (currentUser?.role || 'sales').toLowerCase();
        const isAdmin = userRole === 'admin' || userRole === 'administrator';
        const isSalesUser = userRole === 'sales';
        const allSalesEditableFields = [...salesEditableFields, 'status_1', 'reason', 'closed_date'];
        const isEditableBySales = isSalesUser && allSalesEditableFields.includes(field);
        const isEditable = (isAdmin || isEditableBySales);

        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        formGroup.dataset.fieldGroup = field;

        const label = document.createElement('label');
        label.htmlFor = field;
        label.textContent = header;
        formGroup.appendChild(label);

        let inputElement;
        if (field === 'reason') {
            inputElement = document.createElement('textarea');
            inputElement.name = field;
            inputElement.value = value;
            if (!isEditable) inputElement.disabled = true;
        } else if (options) {
            inputElement = document.createElement('select');
            inputElement.name = field;
            if (!isEditable) inputElement.disabled = true;
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '-- เลือก --';
            inputElement.appendChild(defaultOption);
            options.forEach(opt => {
                const optionEl = document.createElement('option');
                optionEl.value = opt;
                optionEl.textContent = opt;
                if (opt === value) optionEl.selected = true;
                inputElement.appendChild(optionEl);
            });
        } else {
            inputElement = document.createElement('input');
            const fieldType = (['date', 'appointment_date', 'old_appointment', 'closed_date'].includes(field)) ? 'date' : 'text';
            inputElement.type = fieldType;
            inputElement.name = field;
            inputElement.value = value;
            if (!isEditable) inputElement.disabled = true;

            // [NEW] Add 'required' attribute specifically to the 'date' field input
            if (field === 'date') {
                inputElement.required = true;
            }
        }
        inputElement.id = field;
        formGroup.appendChild(inputElement);

        if (config.section === 'admin') {
            adminContent.appendChild(formGroup);
        } else if (config.section === 'sales') {
            salesContent.appendChild(formGroup);
        }
    });

    form.appendChild(adminSection);
    form.appendChild(salesSection);

    // --- Add highlighting logic ---
    const lastStatusInput = form.querySelector('[name="last_status"]');
    const status1Input = form.querySelector('[name="status_1"]');
    const closedAmountInput = form.querySelector('[name="closed_amount"]');
    const closedDateInput = form.querySelector('[name="closed_date"]');

    const highlightFields = () => {
        const isClosingAttempt = (lastStatusInput?.value === '100%') || (status1Input?.value === 'ปิดการขาย') || (closedAmountInput?.value && closedAmountInput.value.trim() !== '');
        dealClosingFields.forEach(fieldName => {
            const group = form.querySelector(`[data-field-group="${fieldName}"]`);
            if (group) { group.classList.toggle('highlight-deal-closing', isClosingAttempt); }
        });
    };
    [lastStatusInput, status1Input, closedAmountInput, closedDateInput].forEach(input => {
        if (input) {
            input.addEventListener('change', highlightFields);
            input.addEventListener('input', highlightFields);
        }
    });
    highlightFields();

    const modalTitle = document.getElementById('editModalTitle');
    if (modalTitle) modalTitle.textContent = `แก้ไข: ${customer.name || customer.lead_code || 'ลูกค้าใหม่'}`;
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
    if (startPage > 1) { buttonsHTML += `<button data-page="1">1</button>`; if (startPage > 2) buttonsHTML += `<span class="pagination-ellipsis">...</span>`; }
    for (let i = startPage; i <= endPage; i++) { buttonsHTML += `<button data-page="${i}" class="${i === currentPage ? 'active' : ''}">${i}</button>`; }
    if (endPage < totalPages) { if (endPage < totalPages - 1) buttonsHTML += `<span class="pagination-ellipsis">...</span>`; buttonsHTML += `<button data-page="${totalPages}">${totalPages}</button>`; }
    buttonsHTML += `<button data-page="next" ${currentPage === totalPages ? 'disabled' : ''}>&raquo;</button>`;
    const controlsHTML = `<div class="pagination-controls">${buttonsHTML}</div>`;
    container.innerHTML = `${pageSizeHTML}${infoHTML}${controlsHTML}`;
};

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
};

ui.hideModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = 'none';
    if (modalId === 'statusUpdateModal') {
        const select = modal.querySelector('#modalStatusSelect'); if(select) select.value = '';
        const notes = modal.querySelector('#modalNotesText'); if(notes) notes.value = '';
        const idInput = modal.querySelector('#modalCustomerId'); if(idInput) idInput.value = '';
    }
    if (modalId === 'historyModal') {
        const timeline = document.getElementById('historyTimelineContainer'); if(timeline) timeline.innerHTML = '';
    }
};

ui.populateFilterDropdown = function(elementId, options) {
    const select = document.getElementById(elementId);
    if (!select) return;
    while (select.options.length > 1) {
        select.remove(1);
    }
    [...new Set(options || [])].filter(Boolean).forEach(option => {
        const optElement = document.createElement('option');
        optElement.value = option;
        optElement.textContent = option;
        select.appendChild(optElement);
    });
};


ui.renderHistoryTimeline = function(historyData) {
    const container = document.getElementById('historyTimelineContainer');
    if (!container) return;
    if (!historyData || historyData.length === 0) {
        container.innerHTML = '<p>ยังไม่มีประวัติการติดตาม</p>';
        return;
    }

    container.innerHTML = historyData.map(item => {
        let roleClass = 'history-default';
        let userDisplay = 'Unknown';

        if (item.users) {
            const role = (item.users.role || 'User').charAt(0).toUpperCase() + (item.users.role || 'User').slice(1);
            const username = item.users.username || 'N/A';
            userDisplay = `${role} - ${username}`;
            const roleLower = (item.users.role || '').toLowerCase();
            if (roleLower === 'admin' || roleLower === 'administrator') {
                roleClass = 'history-admin';
            } else if (roleLower === 'sales') {
                roleClass = 'history-sales';
            }
        } else if (item.created_by) {
            userDisplay = `User ID: ${item.created_by.substring(0, 8)}...`;
        }

        const timestamp = item.created_at ? new Date(item.created_at).toLocaleString('th-TH') : 'Invalid Date';

        return `
            <div class="timeline-item ${roleClass}">
                <div class="timeline-icon">✓</div>
                <div class="timeline-content">
                    <div class="timeline-status">${escapeHtml(item.status)}</div>
                    <div class="timeline-notes">${escapeHtml(item.notes || 'ไม่มีบันทึกเพิ่มเติม')}</div>
                    <div class="timeline-footer">
                        โดย: ${escapeHtml(userDisplay)} | ${timestamp}
                    </div>
                </div>
            </div>`;
    }).join('');
};


ui.showContextMenu = function(event) {
    const menu = document.getElementById('contextMenu');
    if (!menu) return;
    menu.style.display = 'block';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
};

ui.hideContextMenu = function() {
    const menu = document.getElementById('contextMenu');
    if (menu) menu.style.display = 'none';
};

window.ui = ui;
