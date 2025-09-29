// ================================================================================
// BEAUTY CLINIC CRM - MAIN ORCHESTRATOR (FINAL VERSION)
// ================================================================================

import { supabase } from './config.js';
import * as api from './api.js';
import * as ui from './ui.js';

const state = {
    currentUser: null,
    customers: [],
    salesList: [],
};

async function initializeApp() {
    ui.showLoading(true);
    try {
        const session = await api.getSession();
        if (!session) {
            window.location.replace('login.html');
            return;
        }

        let userProfile = await api.getUserProfile(session.user.id);
        if (!userProfile) {
            userProfile = await api.createDefaultUserProfile(session.user);
        }
        
        state.currentUser = { id: session.user.id, ...userProfile };
        ui.updateUserBadge(state.currentUser);

        const customers = await api.fetchAllCustomers();
        state.customers = customers;
        
        ui.renderTable(state.customers);
        ui.updateStats(state.customers);
        
        ui.showStatus('โหลดข้อมูลสำเร็จ', false);

    } catch (error) {
        console.error('Initialization failed:', error);
        ui.showStatus(error.message, true);
        ui.updateUserBadge({ role: 'Error', username: 'Failed to load' });
    } finally {
        ui.showLoading(false);
    }
}

function setupEventListeners() {
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            if (confirm('ต้องการออกจากระบบหรือไม่?')) {
                ui.showLoading(true);
                try {
                    await api.signOut();
                    window.location.replace('login.html');
                } catch (error) {
                    ui.showStatus(error.message, true);
                    ui.showLoading(false);
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});
