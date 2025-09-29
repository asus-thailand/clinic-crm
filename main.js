// ================================================================================
// BEAUTY CLINIC CRM - MAIN ORCHESTRATOR (DEBUG VERSION)
// ================================================================================

import { supabase } from './config.js';
import * as api from './api.js';
import * as ui from './ui.js';

const state = {
    currentUser: null,
    customers: [],
    salesList: [],
    activeFilters: { search: '', status: '', sales: '' }
};

async function initializeApp() {
    console.log("1. Starting initialization..."); // LOG 1
    ui.showLoading(true);
    try {
        console.log("2. Checking session..."); // LOG 2
        const session = await api.getSession();
        if (!session) {
            window.location.replace('login.html');
            return;
        }

        console.log("3. Fetching user profile..."); // LOG 3
        const userProfile = await api.getUserProfile(session.user.id);
        if (userProfile) {
            state.currentUser = { id: session.user.id, ...userProfile };
        } else {
            const newProfile = await api.createDefaultUserProfile(session.user);
            state.currentUser = { id: session.user.id, ...newProfile };
        }
        
        ui.updateUIAfterLogin(state.currentUser);

        console.log("4. Fetching initial data (customers and sales)..."); // LOG 4
        const [customers, salesList] = await Promise.all([
            api.fetchAllCustomers(),
            api.fetchSalesList()
        ]);
        console.log("5. Data fetched successfully!"); // LOG 5
        state.customers = customers;
        state.salesList = salesList;

        applyFiltersAndRender();
        
        ui.showStatus('โหลดข้อมูลสำเร็จ', false);

    } catch (error) {
        console.error('Initialization failed:', error); // LOG ERROR
        ui.showStatus(error.message, true);
    } finally {
        console.log("6. Hiding loading overlay."); // LOG 6
        ui.showLoading(false);
    }
}

function applyFiltersAndRender() {
    const { search, status, sales } = state.activeFilters;
    const lowerCaseSearch = search.toLowerCase();

    const filteredCustomers = state.customers.filter(customer => {
        const matchesSearch = !search || Object.values(customer).some(val => String(val).toLowerCase().includes(lowerCaseSearch));
        const matchesStatus = !status || customer.status_1 === status;
        const matchesSales = !sales || customer.sales === sales;
        return matchesSearch && matchesStatus && matchesSales;
    });
    
    ui.renderTable(filteredCustomers);
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

// ... (โค้ดส่วนอื่น ๆ เหมือนเดิม) ...

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    // setupEventListeners(); // เราจะปิดส่วนนี้ไปก่อนเพื่อลดความซับซ้อน
    document.getElementById('logoutButton')?.addEventListener('click', handleLogout);
});
