// ================================================================================
// BEAUTY CLINIC CRM - MAIN ORCHESTRATOR (PRODUCTION READY + DEBUG MODE)
// ================================================================================

// ไม่ใช้ import แล้ว เพราะเราโหลด script แบบปกติ
// ตัวแปร supabaseClient, api, และ ui จะมาจาก global scope

const state = {
    currentUser: null,
    customers: [],
    salesList: [],
    activeFilters: { search: '', status: '', sales: '' }
};

async function initializeApp() {
    console.log('Starting app initialization...');
    
    if (!window.supabaseClient) {
        console.error('Supabase client not initialized!');
        alert('ระบบยังไม่พร้อม กรุณารีเฟรชหน้าใหม่');
        return;
    }
    
    if (!window.api || !window.ui) {
        console.error('API or UI modules not loaded!');
        alert('ระบบยังไม่พร้อม กรุณารีเฟรชหน้าใหม่');
        return;
    }
    
    ui.showLoading(true);
    
    try {
        console.log('Checking session...');
        const session = await api.getSession();
        
        if (!session) {
            console.log('No session found, redirecting to login...');
            window.location.replace('login.html');
            return;
        }

        console.log('Session found, getting user profile...');
        const userProfile = await api.getUserProfile(session.user.id);
        
        if (userProfile) {
            state.currentUser = { id: session.user.id, ...userProfile };
        } else {
            console.log('Creating default profile...');
            const newProfile = await api.createDefaultUserProfile(session.user);
            state.currentUser = { id: session.user.id, ...newProfile };
        }
        
        // 🐞 DEBUG: แสดงข้อมูล user ปัจจุบัน
        console.log('🐞 Current User:', state.currentUser);
        ui.updateUIAfterLogin(state.currentUser);

        console.log('Fetching customers and sales list...');
        const [customers, salesList] = await Promise.all([
            api.fetchAllCustomers(),
            api.fetchSalesList()
        ]);
        
        state.customers = customers || [];
        state.salesList = salesList || [];

        // 🐞 DEBUG: แสดงจำนวนข้อมูลที่ดึงมาได้
        console.log(`🐞 Loaded ${state.customers.length} customers from API.`);
        
        applyFiltersAndRender();
        
        ui.showStatus('โหลดข้อมูลสำเร็จ', false);

    } catch (error) {
        // 🐞 DEBUG: แสดง Error ที่เกิดขึ้นระหว่าง init
        console.error('🐞 ERROR during initialization:', error);
        ui.showStatus('เกิดข้อผิดพลาด: ' + error.message, true);
        
    } finally {
        ui.showLoading(false);
        console.log('Initialization complete');
    }
}

function applyFiltersAndRender() {
    // 🐞 DEBUG: แสดง state ของ customers ก่อนการกรอง
    console.log('🐞 Running applyFiltersAndRender. Total customers in state:', state.customers.length);
    try {
        const { search, status, sales } = state.activeFilters;
        const lowerCaseSearch = search.toLowerCase();

        const filteredCustomers = state.customers.filter(customer => {
            const matchesSearch = !search || Object.values(customer).some(val => 
                String(val).toLowerCase().includes(lowerCaseSearch)
            );
            const matchesStatus = !status || customer.status_1 === status;
            const matchesSales = !sales || customer.sales === sales;
            
            return matchesSearch && matchesStatus && matchesSales;
        });
        
        // 🐞 DEBUG: แสดงจำนวนลูกค้าหลังจากการกรอง
        console.log(`🐞 Filtering complete. Customers to render: ${filteredCustomers.length}`);
        
        ui.renderTable(filteredCustomers);
    } catch (error) {
        console.error('🐞 Error applying filters:', error);
    }
}

async function handleLogout() {
    if (!confirm('ต้องการออกจากระบบหรือไม่?')) return;
    try {
        await api.signOut();
        window.location.replace('login.html');
    } catch (error) {
        ui.showStatus(error.message, true);
    }
}

async function handleAddCustomer() {
    console.log("🐞 Add customer button clicked.");
    ui.showLoading(true);
    try {
        const salesName = state.currentUser?.username || 'N/A';
        console.log(`🐞 Attempting to add customer with sales name: ${salesName}`);
        
        const newCustomer = await api.addCustomer(salesName);
        
        console.log('🐞 Successfully added customer to database:', newCustomer);
        
        state.customers.unshift(newCustomer);
        console.log(`🐞 Customer added to local state. Total customers now: ${state.customers.length}`);
        
        applyFiltersAndRender();
        
        ui.showStatus('เพิ่มลูกค้าใหม่สำเร็จ', false);
    } catch (error) {
        console.error('🐞 FAILED to add customer:', error);
        ui.showStatus('ผิดพลาด: ไม่สามารถเพิ่มลูกค้าได้ - ' + error.message, true);
    } finally {
        ui.showLoading(false);
    }
}


function handleTableClick(event) {
    const action = event.target.dataset.action;
    const id = event.target.dataset.id;
    const name = event.target.dataset.name;

    if (action === 'update-status') {
        ui.showModal('statusUpdateModal', { customerId: id, customerName: name });
    } else if (action === 'view-history') {
        handleViewHistory(id, name);
    }
}

async function handleViewHistory(customerId, customerName) {
    ui.showModal('historyModal', { customerName });
    ui.showLoading(true);
    try {
        const historyData = await api.fetchStatusHistory(customerId);
        ui.renderHistoryTimeline(historyData);
    } catch (error) {
        ui.showStatus(error.message, true);
        ui.hideModal('historyModal');
    } finally {
        ui.showLoading(false);
    }
}

async function handleSubmitStatusUpdate() {
    const modal = document.getElementById('statusUpdateModal');
    const customerId = modal.querySelector('#modalCustomerId').value;
    const newStatus = modal.querySelector('#modalStatusSelect').value;
    const notes = modal.querySelector('#modalNotesText').value.trim();

    if (!newStatus) {
        ui.showStatus('กรุณาเลือกสถานะ', true);
        return;
    }
    
    ui.showLoading(true);
    try {
        await api.addStatusUpdate(customerId, newStatus, notes, state.currentUser.id);
        const updatedCustomer = await api.updateCustomerCell(customerId, 'last_status', newStatus);

        const index = state.customers.findIndex(c => c.id == updatedCustomer.id);
        if (index !== -1) {
            state.customers[index] = Object.assign(state.customers[index], updatedCustomer);
        }

        applyFiltersAndRender();
        ui.hideModal('statusUpdateModal');
        ui.showStatus('อัปเดตสถานะสำเร็จ', false);
    } catch (error) {
        ui.showStatus(error.message, true);
    } finally {
        ui.showLoading(false);
    }
}

function setupEventListeners() {
    document.getElementById('logoutButton')?.addEventListener('click', handleLogout);
    document.getElementById('tableBody')?.addEventListener('click', handleTableClick);
    document.getElementById('submitStatusUpdateBtn')?.addEventListener('click', handleSubmitStatusUpdate);
    document.getElementById('addUserButton')?.addEventListener('click', handleAddCustomer);

    document.querySelectorAll('[data-modal-close]').forEach(button => {
        button.addEventListener('click', () => ui.hideModal(button.getAttribute('data-modal-close')));
    });

    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        state.activeFilters.search = e.target.value;
        applyFiltersAndRender();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, waiting for dependencies...');
    setTimeout(() => {
        initializeApp();
        setupEventListeners();
    }, 100);
});
