// ================================================================================
// BEAUTY CLINIC CRM - MAIN ORCHESTRATOR (PRODUCTION READY)
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
    ui.showLoading(true);
    try {
        const session = await api.getSession();
        if (!session) {
            window.location.replace('login.html');
            return;
        }

        const userProfile = await api.getUserProfile(session.user.id);
        if (userProfile) {
            state.currentUser = { id: session.user.id, ...userProfile };
        } else {
            const newProfile = await api.createDefaultUserProfile(session.user);
            state.currentUser = { id: session.user.id, ...newProfile };
        }
        
        ui.updateUIAfterLogin(state.currentUser);

        const [customers, salesList] = await Promise.all([
            api.fetchAllCustomers(),
            api.fetchSalesList()
        ]);
        
        state.customers = customers;
        state.salesList = salesList;

        applyFiltersAndRender();
        
        ui.showStatus('โหลดข้อมูลสำเร็จ', false);

    } catch (error) {
        console.error('Initialization failed:', error);
        ui.showStatus(error.message, true);
    } finally {
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
    try {
        const historyData = await api.fetchStatusHistory(customerId);
        ui.renderHistoryTimeline(historyData);
    } catch (error) {
        ui.showStatus(error.message, true);
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

        const index = state.customers.findIndex(c => c.id === customerId);
        if (index !== -1) {
            state.customers[index] = updatedCustomer;
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
    
    document.querySelectorAll('[data-modal-close]').forEach(button => {
        button.addEventListener('click', () => ui.hideModal(button.dataset.modalClose));
    });

    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        state.activeFilters.search = e.target.value;
        applyFiltersAndRender();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});
