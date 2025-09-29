// ================================================================================
// BEAUTY CLINIC CRM - MAIN ORCHESTRATOR (NEW)
// ไฟล์นี้ทำหน้าที่เป็นตัวควบคุมหลัก (Controller) ของแอปพลิเคชัน
// ทำหน้าที่เชื่อมต่อระหว่าง API, UI, และ State
// ================================================================================

import { supabase } from './config.js';
import * as api from './api.js';
import * as ui from './ui.js';

// ---- Application State ----
const state = {
    currentUser: null,
    customers: [],
    salesList: [],
    activeFilters: {
        search: '',
        status: '',
        sales: ''
    }
};

// ---- Core Functions ----
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
            // สร้าง Profile ใหม่ถ้ายังไม่มี
            const newProfile = await api.createDefaultUserProfile(session.user);
            state.currentUser = { id: session.user.id, ...newProfile };
        }
        
        ui.updateUIAfterLogin(state.currentUser);

        // Fetch initial data in parallel
        const [customers, salesList] = await Promise.all([
            api.fetchAllCustomers(),
            api.fetchSalesList()
        ]);
        state.customers = customers;
        state.salesList = salesList;

        // Render initial UI
        applyFiltersAndRender();
        // populateFilterDropdowns(); // ควรสร้างฟังก์ชันนี้ใน ui.js
        
        ui.showStatus('โหลดข้อมูลสำเร็จ', false);

    } catch (error) {
        console.error('Initialization failed:', error);
        ui.showStatus(error.message, true);
        // อาจจะ redirect ไปหน้า error หรือ logout
    } finally {
        ui.showLoading(false);
    }
}

// ---- Data & Rendering Logic ----
function applyFiltersAndRender() {
    const { search, status, sales } = state.activeFilters;
    const lowerCaseSearch = search.toLowerCase();

    const filteredCustomers = state.customers.filter(customer => {
        const matchesSearch = !search || 
            Object.values(customer).some(val => 
                String(val).toLowerCase().includes(lowerCaseSearch)
            );
        const matchesStatus = !status || customer.status_1 === status;
        const matchesSales = !sales || customer.sales === sales;

        return matchesSearch && matchesStatus && matchesSales;
    });
    
    ui.renderTable(filteredCustomers);
    // updateStats(); // ควรสร้างฟังก์ชันนี้
}

// ---- Event Handlers ----
async function handleLogout() {
    if (!confirm('ต้องการออกจากระบบหรือไม่?')) return;
    try {
        await api.signOut();
        window.location.replace('login.html');
    } catch (error) {
        ui.showStatus(error.message, true);
    }
}

async function handleAddNewRow() {
    ui.showLoading(true);
    try {
        const latestCode = await api.getLatestLeadCode();
        const newRowData = {
            lead_code: String(latestCode + 1),
            sales: state.currentUser.username,
            date: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD format
            created_by: state.currentUser.id
        };
        
        const newCustomer = await api.addNewCustomer(newRowData);
        state.customers.unshift(newCustomer); // เพิ่มข้อมูลใหม่เข้าไปใน state
        applyFiltersAndRender(); // re-render ตาราง
        ui.showStatus('เพิ่มลูกค้าใหม่สำเร็จ', false);

    } catch(error) {
        ui.showStatus(error.message, true);
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
    // แสดง loading spinner ใน modal
    try {
        const historyData = await api.fetchStatusHistory(customerId);
        ui.renderHistoryTimeline(historyData);
    } catch (error) {
        ui.showStatus(error.message, true);
        // แสดง error ใน modal
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
        // 1. Add history record
        await api.addStatusUpdate(customerId, newStatus, notes, state.currentUser.id);
        
        // 2. Update the customer's last_status
        const updatedCustomer = await api.updateCustomerCell(customerId, 'last_status', newStatus);

        // 3. Update local state
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

// ---- Event Listeners Setup ----
function setupEventListeners() {
    document.getElementById('logoutButton')?.addEventListener('click', handleLogout);
    document.getElementById('addUserButton')?.addEventListener('click', handleAddNewRow);
    document.getElementById('tableBody')?.addEventListener('click', handleTableClick);
    document.getElementById('submitStatusUpdateBtn')?.addEventListener('click', handleSubmitStatusUpdate);
    
    // Modal close buttons
    document.querySelectorAll('[data-modal-close]').forEach(button => {
        button.addEventListener('click', () => ui.hideModal(button.dataset.modalClose));
    });

    // Filters
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        state.activeFilters.search = e.target.value;
        applyFiltersAndRender();
    });
    // เพิ่ม listener สำหรับ statusFilter และ salesFilter ที่นี่
}

// ---- App Entry Point ----
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});