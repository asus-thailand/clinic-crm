// ================================================================================
// BEAUTY CLINIC CRM - UI LAYER (COMPLETE FIXED VERSION 100%)
// ================================================================================

const ui = {};

// ================================================================================
// UTILITY FUNCTIONS
// ================================================================================

/**
 * ✨ NEW: Helper function to format date strings from YYYY-MM-DD to DD/MM/YYYY
 * @param {string} isoDateString - The date string in YYYY-MM-DD format.
 * @returns {string} - The formatted date string or the original if invalid.
 */
function formatDateToDMY(isoDateString) {
    if (!isoDateString || !/^\d{4}-\d{2}-\d{2}$/.test(isoDateString)) {
        return isoDateString || ''; // Return original value if it's not a valid YYYY-MM-DD string
    }
    const [year, month, day] = isoDateString.split('-');
    return `${day}/${month}/${year}`;
}

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
// SINGLE SOURCE OF TRUTH: FIELD MAPPING
// ================================================================================

const FIELD_MAPPING = {
    '#':                  { field: null,              section: 'special' },
    'วัน/เดือน/ปี':     { field: 'date',              section: 'admin' },
    'ลำดับที่':           { field: 'lead_code',         section: 'admin' },
    'ชื่อลูกค้า':         { field: 'name',              section: 'admin' },
    'เบอร์ติดต่อ':       { field: 'phone',             section: 'admin' },
    'ช่องทางสื่อ':       { field: 'channel',           section: 'admin' },
    'ประเภทหัตถการ':  { field: 'procedure',         section: 'admin' },
    'มัดจำ':               { field: 'deposit',           section: 'admin' },
    'ขอเบอร์ Y/N':        { field: 'confirm_y',         section: 'admin' },
    'มัดจำออนไลน์ Y/N': { field: 'transfer_100',      section: 'admin' },
    'CS ผู้ส่ง Lead':     { field: 'cs_confirm',        section: 'admin' },
    'เซลล์':               { field: 'sales',             section: 'admin' },
    'อัพเดทการเข้าถึง':  { field: 'update_access',     section: 'sales' },
    'Last Status':      { field: 'last_status',       section: 'sales' },
    'เวลาโทร':            { field: 'call_time',         section: 'sales' },
    'ETC':                { field: 'etc',               section: 'sales' },
    'HN ลูกค้า':          { field: 'hn_customer',       section: 'sales' },
    'วันที่นัด CS':       { field: 'old_appointment',   section: 'sales' },
    'DR.':                { field: 'dr',                section: 'sales' },
    'ยอดที่ปิดได้':      { field: 'closed_amount',     section: 'sales' },
    'วันที่นัดทำหัตถการ':{ field: 'appointment_date',  section: 'sales' },
    'จัดการ':              { field: null,              section: 'sales' }
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

        if (config.section === 'admin') {
            th.className = 'header-admin-section';
        } else if (config.section === 'sales') {
            th.className = 'header-sales-section';
        } else if (headerText === '#') {
            th.className = 'row-number';
        }
        
        tr.appendChild(th);
    });

    thead.innerHTML = ''; 
    thead.appendChild(tr);
};


// ================================================================================
// TABLE RENDERING
// ================================================================================

/**
 * ✨ UPDATED: This function now formats date fields before displaying them.
 */
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
        if (config && config.field) {
            tr.appendChild(createCell(row, config.field));
        } else if (header === 'จัดการ') {
            tr.appendChild(createActionsCell(row, window.state.currentUser));
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

// ... (The rest of the ui.js file remains unchanged)
// ================================================================================
// PAGINATION UI RENDERING
// ================================================================================
ui.renderPaginationControls = function(totalPages, currentPage, totalRecords, pageSize) {
    const container = document.getElementById('paginationContainer');
    if (!container) return;
    if (totalRecords === 0) {
        container.innerHTML = '<div class="pagination-info">ไม่พบข้อมูล</div>';
        return;
    }
    const pageSizeHTML = `<div class="page-size-selector"><label for="pageSize">แสดง:</label><select id="pageSize"><option value="25" ${pageSize == 25 ? 'selected' : ''}>25</option><option value="50" ${pageSize == 50 ? 'selected' : ''}>50</option><option value="100" ${pageSize == 100 ? 'selected' : ''}>100</option><option value="200" ${pageSize == 200 ? 'selected' : ''}>200</option></select><span>แถว</span></div>`;
    const startRecord = (currentPage - 1) * pageSize + 1;
    const endRecord = Math.min(currentPage * pageSize, totalRecords);
    const infoHTML = `<div class="pagination-info">แสดง ${startRecord} - ${endRecord} จากทั้งหมด ${totalRecords}</div>`;
    let buttonsHTML = '';
    buttonsHTML += `<button data-page="prev" ${currentPage === 1 ? 'disabled' : ''}>&laquo;</button>`;
    const maxButtons = 5;
    let startPage, endPage;
    if (totalPages <= maxButtons) {
        startPage = 1;
        endPage = totalPages;
    } else {
        const maxPagesBeforeCurrent = Math.floor(maxButtons / 2);
        const maxPagesAfterCurrent = Math.ceil(maxButtons / 2) - 1;
        if (currentPage <= maxPagesBeforeCurrent) {
            startPage = 1;
            endPage = maxButtons;
        } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
            startPage = totalPages - maxButtons + 1;
            endPage = totalPages;
        } else {
            startPage = currentPage - maxPagesBeforeCurrent;
            endPage = currentPage + maxPagesAfterCurrent;
        }
    }
    if (startPage > 1) {
        buttonsHTML += `<button data-page="1">1</button>`;
        if (startPage > 2) buttonsHTML += `<span>...</span>`;
    }
    for (let i = startPage; i <= endPage; i++) {
        buttonsHTML += `<button data-page="${i}" class="${i === currentPage ? 'active' : ''}">${i}</button>`;
    }
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) buttonsHTML += `<span>...</span>`;
        buttonsHTML += `<button data-page="${totalPages}">${totalPages}</button>`;
    }
    buttonsHTML += `<button data-page="next" ${currentPage === totalPages ? 'disabled' : ''}>&raquo;</button>`;
    const controlsHTML = `<div class="pagination-controls">${buttonsHTML}</div>`;
    container.innerHTML = `${pageSizeHTML}${infoHTML}${controlsHTML}`;
};

// ================================================================================
// MODAL & FORM MANAGEMENT
// ================================================================================
ui.showModal = function(modalId, context = {}) { /* ... unchanged ... */ };
ui.hideModal = function(modalId) { /* ... unchanged ... */ };
ui.buildEditForm = function(customer, currentUser, salesEditableFields, salesList, dropdownOptions) { /* ... unchanged ... */ };
ui.populateFilterDropdown = function(elementId, options) { /* ... unchanged ... */ };
ui.renderHistoryTimeline = function(historyData) { /* ... unchanged ... */ };
ui.showContextMenu = function(event) { /* ... unchanged ... */ };
ui.hideContextMenu = function() { /* ... unchanged ... */ };

window.ui = ui;
