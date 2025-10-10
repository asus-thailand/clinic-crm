// ================================================================================
// BEAUTY CLINIC CRM - MAIN ORCHESTRATOR (PERFORMANCE ENHANCED & BUG FIXED)
// ================================================================================

// *** จุดที่แก้ไข: ลบฟังก์ชัน parseDateString ที่ซ้ำซ้อนออก ***
// ฟังก์ชัน parseDateString ถูกย้ายไปรวมไว้ใน ui.js แล้ว เพื่อป้องกัน Code Duplication

const state = {
    currentUser: null,
    customers: [],        
    filteredCustomers: [], 
    salesList: [],
    activeFilters: { search: '', status: '', sales: '' },
    dateFilter: { startDate: null, endDate: null, preset: 'all' },
    pagination: { currentPage: 1, pageSize: 50 },
    editingCustomerId: null
};

// ... โค้ดส่วนที่เหลือของ main.js (ไม่ได้มีการเปลี่ยนแปลง) ...

// ================================================================================
// EXCEL UTILITIES
// ================================================================================

function prepareDataForExport(customers) {
    // ... (โค้ดส่วนนี้ยังคงเดิม)
}

// ================================================================================
// DATA MANIPULATION & FILTERING
// ================================================================================

function calculateAge(dob) {
    // ... (โค้ดส่วนนี้ยังคงเดิม)
}

function normalizeDate(dateStr) {
    // ... (โค้ดส่วนนี้ยังคงเดิม)
}

function filterData() {
    // ... (โค้ดส่วนนี้ยังคงเดิม)
}

function updateVisibleData() {
    // ... (โค้ดส่วนนี้ยังคงเดิม)
}

// ================================================================================
// INITIALIZATION & EVENT HANDLERS
// ================================================================================

async function fetchInitialData() {
    // ... (โค้ดส่วนนี้ยังคงเดิม)
}

function registerEventListeners() {
    // ... (โค้ดส่วนนี้ยังคงเดิม)
}

async function initializeApp() {
    // ... (โค้ดส่วนนี้ยังคงเดิม)
}

// ... (โค้ดส่วนจัดการ Context Menu ยังคงเดิม) ...

// ================================================================================
// APPLICATION START
// ================================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});
