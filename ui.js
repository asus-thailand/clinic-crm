// ================================================================================
// UI Layer - Handles all DOM manipulation and rendering.
// (FINAL & COMPLETE VERSION)
// ================================================================================

const ui = {};

ui.FIELD_MAPPING = {
    '#': { field: null, type: 'number' },
    'Lead Code': { field: 'lead_code', type: 'text' },
    'วันที่': { field: 'date', type: 'date' },
    'ชื่อลูกค้า': { field: 'name', type: 'text' },
    'เบอร์โทร': { field: 'phone', type: 'text' },
    'ช่องทาง': { field: 'channel', type: 'select' },
    'หัตถการ': { field: 'procedure', type: 'select' },
    'เวลา': { field: 'call_time', type: 'text' },
    'Sales': { field: 'sales', type: 'select_sales' },
    'Deposit': { field: 'deposit', type: 'text' },
    'Confirm Y': { field: 'confirm_y', type: 'select' },
    'CS Confirm': { field: 'cs_confirm', type: 'select' },
    'Update Access': { field: 'update_access', type: 'text' },
    'Last Status': { field: 'last_status', type: 'select' },
    'Status Sale': { field: 'status_1', type: 'select' },
    'เหตุผล': { field: 'reason', type: 'textarea' },
    'ETC': { field: 'etc', type: 'textarea' },
    'HN Customer': { field: 'hn_customer', type: 'text' },
    'นัดหมายเดิม': { field: 'old_appointment', type: 'date' },
    'DR': { field: 'dr', type: 'text' },
    'ยอดปิด': { field: 'closed_amount', type: 'text' },
    'วันนัดหมาย': { field: 'appointment_date', type: 'date' },
    'จัดการ': { field: null, type: 'actions' }
};

ui.showLoading = function(isLoading) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = isLoading ? 'flex' : 'none';
};

ui.showStatus = function(message, isError = false) {
    const toast = document.getElementById('statusToast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'status-toast';
    toast.classList.add(isError ? 'error' : 'success', 'show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
};

ui.renderTableHeaders = function() {
    const thead = document.querySelector('#excelTable thead');
    if (!thead) return;
    const tr = document.createElement('tr');
    for (const header in ui.FIELD_MAPPING) {
        const th = document.createElement('th');
        th.textContent = header;
        const field = ui.FIELD_MAPPING[header].field;
        if (field) {
            th.dataset.sortable = field;
        }
        tr.appendChild(th);
    }
    thead.innerHTML = '';
    thead.appendChild(tr);
};

ui.renderTable = function(data, currentPage, pageSize) {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    if (!data || data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="${Object.keys(ui.FIELD_MAPPING).length}">ไม่พบข้อมูล</td></tr>`;
        return;
    }

    const startIndex = (currentPage - 1) * pageSize;
    data.forEach((customer, index) => {
        const tr = document.createElement('tr');
        tr.dataset.id = customer.id;
        
        for (const header in ui.FIELD_MAPPING) {
            const td = document.createElement('td');
            const config = ui.FIELD_MAPPING[header];
            
            switch(config.type) {
                case 'number':
                    td.textContent = startIndex + index + 1;
                    break;
                case 'actions':
                    td.innerHTML = `
                        <button class="btn btn-primary btn-sm" data-action="edit-customer" data-id="${customer.id}">แก้ไข</button>
                        <button class="btn btn-secondary btn-sm" data-action="update-status" data-id="${customer.id}">สถานะ</button>
                        <button class="btn btn-secondary btn-sm" data-action="view-history" data-id="${customer.id}" data-name="${customer.name || customer.lead_code}">ประวัติ</button>
                    `;
                    break;
                default:
                    td.textContent = customer[config.field] || '';
                    break;
            }
            tr.appendChild(td);
        }
        tableBody.appendChild(tr);
    });
};

ui.renderPaginationControls = function(totalPages, currentPage, totalRecords, pageSize) {
    const container = document.getElementById('paginationContainer');
    if (!container) return;

    const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endRecord = Math.min(currentPage * pageSize, totalRecords);

    let buttonsHtml = '';
    const MAX_VISIBLE_PAGES = 5;
    
    if (totalPages > 1) {
        buttonsHtml += `<button class="btn" data-page="prev" ${currentPage === 1 ? 'disabled' : ''}>&laquo;</button>`;
        
        let startPage = Math.max(1, currentPage - Math.floor(MAX_VISIBLE_PAGES / 2));
        let endPage = Math.min(totalPages, startPage + MAX_VISIBLE_PAGES - 1);
        if(endPage - startPage + 1 < MAX_VISIBLE_PAGES) {
            startPage = Math.max(1, endPage - MAX_VISIBLE_PAGES + 1);
        }

        if (startPage > 1) {
            buttonsHtml += `<button class="btn" data-page="1">1</button>`;
            if (startPage > 2) buttonsHtml += `<span>...</span>`;
        }
        
        for (let i = startPage; i <= endPage; i++) {
            buttonsHtml += `<button class="btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) buttonsHtml += `<span>...</span>`;
            buttonsHtml += `<button class="btn" data-page="${totalPages}">${totalPages}</button>`;
        }
        
        buttonsHtml += `<button class="btn" data-page="next" ${currentPage === totalPages ? 'disabled' : ''}>&raquo;</button>`;
    }
    
    container.innerHTML = `
        <div class="pagination-info">
            แสดง ${startRecord} - ${endRecord} จากทั้งหมด ${totalRecords} รายการ
        </div>
        <div class="pagination-buttons">
            ${buttonsHtml}
        </div>
        <div class="pagination-size">
            <select id="pageSize">
                <option value="50" ${pageSize === 50 ? 'selected' : ''}>50</option>
                <option value="100" ${pageSize === 100 ? 'selected' : ''}>100</option>
                <option value="200" ${pageSize === 200 ? 'selected' : ''}>200</option>
            </select>
             ต่อหน้า
        </div>
    `;
};

ui.updateSortIndicator = function(column, direction) {
    document.querySelectorAll('#excelTable thead th').forEach(th => {
        const existingIndicator = th.querySelector('.sort-indicator');
        if (existingIndicator) existingIndicator.remove();
        if (th.dataset.sortable === column) {
            const indicator = document.createElement('span');
            indicator.className = 'sort-indicator';
            indicator.textContent = direction === 'asc' ? '▲' : '▼';
            th.appendChild(indicator);
        }
    });
};

ui.populateFilterDropdown = function(elementId, options) {
    const select = document.getElementById(elementId);
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = `<option value="">${elementId === 'salesFilter' ? 'เซลล์ทั้งหมด' : 'สถานะทั้งหมด'}</option>`;
    options.forEach(option => {
        const optionEl = document.createElement('option');
        optionEl.value = option;
        optionEl.textContent = option;
        select.appendChild(optionEl);
    });
    select.value = currentValue;
};

ui.updateUIAfterLogin = function(user) {
    if (!user) return;
    
    const userDisplayElement = document.getElementById('userDisplay');
    if (userDisplayElement) {
        userDisplayElement.textContent = `สวัสดี, ${user.username || user.full_name}`;
    }

    const isAdmin = user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'administrator';
    document.getElementById('importButton').style.display = isAdmin ? 'inline-block' : 'none';
};

// ... Rest of the UI functions (modals, forms, etc.)
ui.showModal = function(modalId, data = {}) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    if (modalId === 'statusUpdateModal') {
        document.getElementById('modalCustomerName').textContent = data.customerName || 'N/A';
        document.getElementById('modalCustomerId').value = data.customerId;
    }
    if (modalId === 'historyModal') {
        document.getElementById('historyCustomerName').textContent = data.customerName || 'N/A';
        document.getElementById('historyTimeline').innerHTML = ''; // Clear previous history
    }
    
    modal.style.display = 'flex';
};

ui.hideModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
};

ui.buildEditForm = function(customer, currentUser, salesEditableFields, salesList, dropdownOptions) {
    const form = document.getElementById('editCustomerForm');
    form.innerHTML = '';
    const userRole = (currentUser.role || 'sales').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'administrator';

    for (const header in ui.FIELD_MAPPING) {
        const config = ui.FIELD_MAPPING[header];
        if (!config.field) continue;
        
        const isEditable = isAdmin || salesEditableFields.includes(config.field);
        
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        
        const label = document.createElement('label');
        label.setAttribute('for', `edit-${config.field}`);
        label.textContent = header;
        formGroup.appendChild(label);
        
        let input;
        const value = customer[config.field] || '';

        switch(config.type) {
            case 'select':
            case 'select_sales':
                input = document.createElement('select');
                const options = (config.type === 'select_sales') ? salesList : dropdownOptions[config.field];
                input.innerHTML = `<option value="">-- เลือก --</option>`;
                options.forEach(opt => {
                    const optionEl = document.createElement('option');
                    optionEl.value = opt;
                    optionEl.textContent = opt;
                    if (value === opt) optionEl.selected = true;
                    input.appendChild(optionEl);
                });
                break;
            case 'textarea':
                input = document.createElement('textarea');
                input.rows = 3;
                input.value = value;
                break;
            default: // text, date, etc.
                input = document.createElement('input');
                input.type = config.type;
                input.value = value;
                break;
        }

        input.id = `edit-${config.field}`;
        input.name = config.field;
        input.className = 'form-control';
        if (!isEditable) input.disabled = true;

        formGroup.appendChild(input);
        form.appendChild(formGroup);
    }
    
    const formActions = document.createElement('div');
    formActions.className = 'form-actions';
    formActions.innerHTML = `
        <button type="button" id="cancelEditBtn" class="btn btn-secondary">ยกเลิก</button>
        <button type="submit" class="btn btn-primary">บันทึก</button>
    `;
    form.appendChild(formActions);
};

ui.renderHistoryTimeline = function(historyData) {
    const timeline = document.getElementById('historyTimeline');
    timeline.innerHTML = '';
    if (!historyData || historyData.length === 0) {
        timeline.innerHTML = '<p>ไม่มีประวัติการติดต่อ</p>';
        return;
    }

    historyData.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'timeline-item';
        
        const date = new Date(item.created_at).toLocaleString('th-TH');
        const user = item.users ? item.users.username : 'N/A';
        
        itemDiv.innerHTML = `
            <div class="timeline-header">${item.status}</div>
            <div class="timeline-meta">โดย: ${user} - เมื่อ: ${date}</div>
            <div class="timeline-body">${item.notes || 'ไม่มีหมายเหตุ'}</div>
        `;
        timeline.appendChild(itemDiv);
    });
};

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
