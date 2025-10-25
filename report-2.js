// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (Simplified - Funnel Only)
// Version: Funnel Step 1.6 (FINAL FIX for Element IDs)
// - Corrected element ID lookup in DOMContentLoaded check and functions.
// ================================================================================

console.log("[Script Load] report-2.js (Funnel Only v1.6 FINAL) executing...");

// -- GLOBAL STATE --
window.reportState = window.reportState || { coreData: null };
const state = window.reportState;
const KPI_INBOX_TO_LEAD_TARGET_PERCENT = 30;

// -- HELPER FUNCTIONS --
function formatCurrency(n, showSign = false, decimals = 0) { /* ... */ }
function formatNumber(n) { /* ... */ }
function displayError(error) { /* ... */ }

// ================================================================================
// CORE FUNNEL LOGIC
// ================================================================================
function getFunnelInputs() {
    const budgetInput = document.getElementById('funnel-budget-input');
    // Removed inboxInput lookup here as it's display only now
    const budget = parseFloat(budgetInput?.value) || 0;
    // console.log("[getFunnelInputs] Budget:", budget);
    return { overallBudget: Math.max(0, budget) }; // Only returns budget
}

function calculateAndUpdateFunnel() {
    console.log("[CalculateFunnel v1.6] Updating...");

    if (!state.coreData) { /* ... check coreData ... */ return; }

    // Lookup elements needed
    const budgetInput = document.getElementById('funnel-budget-input'); // Still need budget input ref
    const inboxesDisplay = document.getElementById('funnel-inboxes');   // Correct ID for display
    const leadsActualEl = document.getElementById('funnel-leads-actual');
    const leadsTargetEl = document.getElementById('funnel-leads-target');
    const salesActualEl = document.getElementById('funnel-sales-actual');
    const overallCplEl = document.getElementById('funnel-overall-cpl');

    // Check if ALL essential elements exist
    if (!budgetInput || !inboxesDisplay || !leadsActualEl || !leadsTargetEl || !salesActualEl || !overallCplEl) {
         console.error("[CalculateFunnel v1.6] CRITICAL: One or more elements not found!");
         displayError(new Error("องค์ประกอบหน้าเว็บบางส่วนหายไป (Funnel)"));
         // Log missing ones
         if (!budgetInput) console.error("Missing: #funnel-budget-input");
         if (!inboxesDisplay) console.error("Missing: #funnel-inboxes"); // Check correct ID
         if (!leadsActualEl) console.error("Missing: #funnel-leads-actual");
         // ... etc ...
         return;
    }

    // 1. Read Budget Input
    const overallBudget = parseFloat(budgetInput.value) || 0; // Read current budget value

    // 2. Get Actual Data from state (including total_customers as inboxes)
    const totalInboxes = state.coreData.total_customers || 0;
    const actualLeads = state.coreData.qualified_leads || 0;
    const actualSales = state.coreData.closed_sales || 0;

    // 3. Perform Calculations
    const targetLeads = Math.round(totalInboxes * (KPI_INBOX_TO_LEAD_TARGET_PERCENT / 100));
    const overallCPL = (actualLeads > 0 && overallBudget > 0) ? (overallBudget / actualLeads) : 0;

    // 4. Update Display Elements
    inboxesDisplay.textContent = formatNumber(totalInboxes); // Update Inbox display
    leadsActualEl.textContent = formatNumber(actualLeads);
    leadsTargetEl.textContent = formatNumber(targetLeads);
    salesActualEl.textContent = formatNumber(actualSales);
    overallCplEl.textContent = formatCurrency(overallCPL, false, 2);

    console.log("[CalculateFunnel v1.6] Update complete.");
}

/** Event handler for Budget input */
function handleFunnelInputChange(event) {
     if (event.target && event.target.id === 'funnel-budget-input') {
          if (parseFloat(event.target.value) < 0) event.target.value = 0;
          if (event.target.validity.valid || event.target.value === '') {
               event.target.style.outline = '';
               calculateAndUpdateFunnel(); // Trigger recalculation
          } else {
               event.target.style.outline = '2px solid red';
          }
     }
}

/** Adds event listener ONLY to Budget input */
function addFunnelInputListeners() {
     const budgetInput = document.getElementById('funnel-budget-input');
     if (budgetInput) {
         budgetInput.removeEventListener('input', handleFunnelInputChange);
         budgetInput.addEventListener('input', handleFunnelInputChange);
         console.log("[AddListeners] Added listener to: funnel-budget-input");
     } else {
         console.error("[AddListeners] CRITICAL: Could not find Budget input element!");
         displayError(new Error("ไม่สามารถเชื่อมต่อช่อง Input งบประมาณได้"));
     }
 }

// ================================================================================
// INTERNAL INITIALIZATION FUNCTION
// ================================================================================
function initializeReportInternally() { /* ... เหมือนเดิม v1.5 ... */ }

// ================================================================================
// AUTO-INITIALIZE ON DOM CONTENT LOADED (WITH CORRECTED CHECKS)
// ================================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("[DOM Ready v1.6] Attempting initialization...");

    // --- Strict Check 1: Verify essential HTML elements exist ---
    const funnelSection = document.querySelector('.funnel-section');
    const budgetInput = document.getElementById('funnel-budget-input');
    const inboxDisplay = document.getElementById('funnel-inboxes');   // CORRECT ID
    const leadsActualDisp = document.getElementById('funnel-leads-actual');

    // Updated Check using CORRECT IDs
    if (!funnelSection || !budgetInput || !inboxDisplay || !leadsActualDisp ) {
         console.error("[DOM Ready v1.6] CRITICAL: Essential HTML elements for Funnel section are missing!");
         displayError(new Error("โครงสร้างหน้าเว็บสำหรับ Funnel ไม่สมบูรณ์"));
         // Log missing ones with correct IDs
         if (!funnelSection) console.error("Missing container: .funnel-section");
         if (!budgetInput) console.error("Missing input: #funnel-budget-input");
         if (!inboxDisplay) console.error("Missing display: #funnel-inboxes"); // CHECK THIS ID in HTML
         if (!leadsActualDisp) console.error("Missing display: #funnel-leads-actual");
         return; // Stop initialization
    }
     console.log("[DOM Ready v1.6] Essential HTML elements found.");

    // --- Strict Check 2: Verify window.myReportData ---
    if (typeof window.myReportData === 'object' && window.myReportData !== null && typeof window.myReportData.core_metrics === 'object' && window.myReportData.core_metrics !== null) {
        console.log("[DOM Ready v1.6] Found valid window.myReportData");
        state.coreData = window.myReportData.core_metrics;
        console.log("[DOM Ready v1.6] Stored core data in state:", state.coreData);
        initializeReportInternally(); // Initialize
    } else {
        console.error("[DOM Ready v1.6] CRITICAL: window.myReportData not found or invalid!", window.myReportData);
        displayError(new Error("ไม่พบข้อมูลรายงานเริ่มต้น (window.myReportData) หรือข้อมูล core_metrics หายไป"));
    }
});

console.log("[Script Ready] report-2.js (Funnel Only v1.6 FINAL) loaded.");
