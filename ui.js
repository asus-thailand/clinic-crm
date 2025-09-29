// ================================================================================
// BEAUTY CLINIC CRM - UI LAYER (FINAL VERSION)
// ================================================================================

export function showLoading(isLoading) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.toggle('show', isLoading);
}

let statusTimeoutId = null;
export function showStatus(message, isError = false) {
    const indicator = document.getElementById('statusIndicator');
    if (!indicator) return;

    clearTimeout(statusTimeoutId);

    indicator.textContent = message;
    indicator.className = 'status-indicator show';
    indicator.classList.add(isError ? 'error' : 'success');

    statusTimeoutId = setTimeout(() => {
        indicator.classList.remove('show');
    }, 3000);
}

export function updateUserBadge(user) {
    const userBadge = document.querySelector('.user-badge');
    if (userBadge) {
        const roleText = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        userBadge.textContent = `${roleText} - ${user.username}`;
    }
}

export function updateStats(customers) {
    document.getElementById('totalCustomers').textContent = customers.length;
    
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    const todayCustomers = customers.filter(c => c.date && c.date.startsWith(today)).length;
    document.getElementById('todayCustomers').textContent = todayCustomers;
    
    const pendingCustomers = customers.filter(c => c.status_1 !== 'ปิดการขาย').length;
    document.getElementById('pendingCustomers').textContent = pendingCustomers;

    const closedDeals = customers.filter(c => c.status_1 === 'ปิดการขาย').length;
    document.getElementById('closedDeals').textContent = closedDeals;
}

export function renderTable(customers) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="24" style="text-align:center; padding: 20px;">ไม่พบข้อมูลลูกค้า</td></tr>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    customers.forEach((row, index) => {
        const tr = document.createElement('tr');
        // This is a simplified render, you can expand it with all the fields
        tr.innerHTML = `
            <td class="row-number">${index + 1}</td>
            <td>${row.date || ''}</td>
            <td>${row.lead_code || ''}</td>
            <td>${row.name || ''}</td>
            <td>${row.phone || ''}</td>
            <td>${row.channel || ''}</td>
            <td>${row.procedure || ''}</td>
            <td>${row.deposit || ''}</td>
            <td>${row.confirm_y || ''}</td>
            <td>${row.transfer_100 || ''}</td>
            <td>${row.cs_confirm || ''}</td>
            <td>${row.sales || ''}</td>
            <td>${row.last_status || ''}</td>
            <td>${row.update_access || ''}</td>
            <td>${row.call_time || ''}</td>
            <td>${row.status_1 || ''}</td>
            <td>${row.reason || ''}</td>
            <td>${row.etc || ''}</td>
            <td>${row.hn_customer || ''}</td>
            <td>${row.old_appointment || ''}</td>
            <td>${row.dr || ''}</td>
            <td>${row.closed_amount || ''}</td>
            <td>${row.appointment_date || ''}</td>
            <td class="actions-cell">
                <button class="btn-update">อัปเดต</button>
                <button class="btn-history">ประวัติ</button>
            </td>
        `;
        fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
}
