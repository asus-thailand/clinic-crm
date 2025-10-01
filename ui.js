// ================================================================================
// BEAUTY CLINIC CRM - UI LAYER (FINAL FIX)
// ================================================================================

// สร้าง object สำหรับเก็บฟังก์ชัน UI ทั้งหมด
const ui = {};

// ---- Helper Functions ----
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
}

// ---- Main UI Functions ----
ui.showLoading = function(isLoading) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.toggle('show', isLoading);
}

let statusTimeoutId = null;
ui.showStatus = function(message, isError = false) {
    const indicator = document.getElementById('statusIndicator');
    if (!indicator) return;

    clearTimeout(statusTimeoutId);

    indicator.textContent = message;
    indicator.className = 'status-indicator show'; // Reset classes
    indicator.classList.add(isError ? 'error' : 'success');

    statusTimeoutId = setTimeout(() => {
        indicator.classList.remove('show');
    }, 3000);
}

// ฟังก์ชันอัพเดท UI หลัง login
ui.updateUIAfterLogin = function(user) {
    const userBadge = document.querySelector('.user-badge');
    if (userBadge && user) {
        // แปลง role ให้สวยงาม (ตัวพิมพ์ใหญ่ตัวแรก)
        const role = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        userBadge.textContent = `${role} - ${user.username}`;
        
        // ตัวอย่างการเปลี่ยนสีตาม Role
        const roleColors = {
            'administrator': '#dc3545',
            'admin': '#007bff',
            'sales': '#28a745'
        };
        userBadge.style.backgroundColor = roleColors[user.role] || '#6c757d';
    }
}

// ---- Table Rendering Functions ----
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
    const value = row[fieldName] || '';
    td.dataset.field = fieldName;
    td.textContent = value;
    return td;
}

function createActionsCell(row) {
    const td = document.createElement('td');
    td.className = 'actions-cell';
    
    const updateButton = document.createElement('button');
    updateButton.className = 'btn-update';
    updateButton.textContent = 'อัปเดต';
    updateButton.dataset.action = 'update-status';
    updateButton.dataset.id = row.id;
    updateButton.dataset.name = row.name || 'N/A';
    
    const historyButton = document.createElement('button');
    historyButton.className = 'btn-history';
    historyButton.textContent = 'ประวัติ';
    historyButton.dataset.action = 'view-history';
    historyButton.dataset.id = row.id;
    historyButton.dataset.name = row.name || 'N/A';

    td.appendChild(updateButton);
    td.appendChild(historyButton);
    return td;
}

function createRowElement(row, index) {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;

    const th = document.createElement('td');
    th.className = 'row-number';
    th.textContent = index + 1;
    tr.appendChild(th);

    HEADERS.slice(1).forEach(header => {
        const fieldName = FIELD_MAPPING[header];
        if (fieldName) {
            tr.appendChild(createCell(row, fieldName));
        }
    });

    tr.appendChild(createActionsCell(row));
    return tr;
}

ui.renderTable = function(customers) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const fragment = document.createDocumentFragment();
    customers.forEach((row, index) => {
        fragment.appendChild(createRowElement(row, index));
    });
    tbody.appendChild(fragment);
}

// Modal Functions
ui.showModal = function(modalId, context = {}) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    if (modalId === 'statusUpdateModal' || modalId === 'historyModal') {
        const nameElement = modal.querySelector(`#${modalId.replace('Modal','')}CustomerName`);
        if (nameElement) {
            nameElement.textContent = context.customerName || 'N/A';
        }
        if(modalId === 'statusUpdateModal') {
            const customerIdElement = modal.querySelector('#modalCustomerId');
            if (customerIdElement) {
                customerIdElement.value = context.customerId || '';
            }
        }
    }
    
    modal.style.display = 'flex';
}

ui.hideModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        const form = modal.querySelector('form');
        if (form) form.reset();
        if (modalId === 'historyModal') {
            const container = document.getElementById('historyTimelineContainer');
            if (container) container.innerHTML = '';
        }
    }
}

ui.renderHistoryTimeline = function(historyData) {
    const container = document.getElementById('historyTimelineContainer');
    if (!container) return;
    
    container.innerHTML = '';
    if (!historyData || historyData.length === 0) {
        container.innerHTML = '<p>ยังไม่มีประวัติการติดตาม</p>';
        return;
    }

    historyData.forEach(item => {
        const userName = item.users ? item.users.username : 'N/A';
        const eventDate = new Date(item.created_at).toLocaleString('th-TH');
        
        const itemHtml = `
            <div class="timeline-item">
                <div class="timeline-icon">✓</div>
                <div class="timeline-content">
                    <div class="timeline-status">${escapeHtml(item.status)}</div>
                    <div class="timeline-notes">${escapeHtml(item.notes || '')}</div>
                    <div class="timeline-footer">โดย: ${escapeHtml(userName)} | ${eventDate}</div>
                </div>
            </div>
        `;
        container.innerHTML += itemHtml;
    });
}

// ทำให้ UI พร้อมใช้งานแบบ global
window.ui = ui;
