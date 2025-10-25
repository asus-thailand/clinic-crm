// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (Simplified - Funnel Only)
// Version: Funnel Step 1.5 (Rigorous Init Check)
// - Added strict checks for window.myReportData and essential elements on init.
// ================================================================================

console.log("[Script Load] report-2.js (Funnel Only v1.5 CHECK) executing...");

// -- GLOBAL STATE --
window.reportState = window.reportState || {
    coreData: null
};
const state = window.reportState;

const KPI_INBOX_TO_LEAD_TARGET_PERCENT = 30;

// -- HELPER FUNCTIONS --
function formatCurrency(n, showSign = false, decimals = 0) { /* ... */ }
function formatNumber(n) { /* ... */ }
function displayError(error) {
    // Make error more visible
    const container = document.querySelector('.container') || document.body;
    const errorBox = document.createElement('div');
    errorBox.style.cssText = `
        padding: 20px; background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;
        border-radius: 10px; margin: 20px; font-weight: bold; font-size: 1.1em;
    `;
    errorBox.innerHTML = `เกิดข้อผิดพลาด: ${error.message}<br><small>(ดู Console สำหรับรายละเอียด)</small>`;
    // Prepend error to make it visible even if rest of UI fails
    if (container.firstChild) {
        container.insertBefore(errorBox, container.firstChild);
    } else {
        container.appendChild(errorBox);
    }
    console.error("[DisplayError]", error);
}


// ================================================================================
// CORE FUNNEL LOGIC (Checks moved to init/recalc)
// ================================================================================
function getFunnelInputs() {
    // Lookup elements inside
    const budgetInput = document.getElementById('funnel-budget-input');
    const inboxesInput = document.getElementById('funnel-inboxes-input');
    const budget = parseFloat(budgetInput?.value) || 0;
    const inboxes = parseInt(inboxesInput?.value, 10) || 0;
    // console.log("[getFunnelInputs] Budget:", budget, "Inboxes:", inboxes);
    return { overallBudget: Math.max(0, budget), totalInboxes: Math.max(0, inboxes) };
}

function calculateAndUpdateFunnel() {
    console.log("[CalculateFunnel v1.5] Updating...");

    // --- Strict Check: Ensure coreData is available ---
    if (!state.coreData || typeof state.coreData !== 'object') {
        console.error("[CalculateFunnel v1.5] CRITICAL: state.coreData is missing or invalid!", state.coreData);
        displayError(new Error("ข้อมูล Core Metrics ไม่พร้อมใช้งานสำหรับการคำนวณ"));
        return; // Stop calculation
    }

    // --- Lookup elements needed for update ---
    const leadsActualEl = document.getElementById('funnel-leads-actual');
    const leadsTargetEl = document.getElementById('funnel-leads-target');
    const salesActualEl = document.getElementById('funnel-sales-actual');
    const overallCplEl = document.getElementById('funnel-overall-cpl');

    // --- Check if ALL essential display elements exist ---
    if (!leadsActualEl || !leadsTargetEl || !salesActualEl || !overallCplEl) {
         console.error("[CalculateFunnel v1.5] CRITICAL: One or more display elements not found!");
         displayError(new Error("องค์ประกอบหน้าเว็บบางส่วนหายไป (Funnel Display)"));
         // Log which ones are missing
         if (!leadsActualEl) console.error("Missing: funnel-leads-actual");
         if (!leadsTargetEl) console.error("Missing: funnel-leads-target");
         if (!salesActualEl) console.error("Missing: funnel-sales-actual");
         if (!overallCplEl) console.error("Missing: funnel-overall-cpl");
         return; // Stop update if elements are missing
    }

    // 1. Read Inputs
    const inputs = getFunnelInputs();
    const overallBudget = inputs.overallBudget;
    const totalInboxes = inputs.totalInboxes;

    // 2. Get Actual Data from state
    const actualLeads = state.coreData.qualified_leads || 0;
    const actualSales = state.coreData.closed_sales || 0;

    // 3. Perform Calculations
    const targetLeads = Math.round(totalInboxes * (KPI_INBOX_TO_LEAD_TARGET_PERCENT / 100));
    const overallCPL = (actualLeads > 0 && overallBudget > 0) ? (overallBudget / actualLeads) : 0;

    // 4. Update Display Elements (Now we know they exist)
    leadsActualEl.textContent = formatNumber(actualLeads);
    leadsTargetEl.textContent = formatNumber(targetLeads);
    salesActualEl.textContent = formatNumber(actualSales);
    overallCplEl.textContent = formatCurrency(overallCPL, false, 2);

    console.log("[CalculateFunnel v1.5] Update complete.");
}

/** Event handler for Budget / Inbox inputs */
function handleFunnelInputChange(event) {
     if (event.target && event.target.tagName === 'INPUT') {
          if (parseFloat(event.target.value) < 0) event.target.value = 0;
          if (event.target.validity.valid || event.target.value === '') {
               // console.log("Funnel input changed, recalculating...");
               event.target.style.outline = '';
               calculateAndUpdateFunnel(); // Trigger recalculation
          } else {
               // console.warn("Invalid number input in Funnel.");
               event.target.style.outline = '2px solid red';
          }
     }
}

/** Adds event listeners to Budget and Inbox inputs */
function addFunnelInputListeners() {
     const budgetInput = document.getElementById('funnel-budget-input');
     const inboxesInput = document.getElementById('funnel-inboxes-input');
     const inputsToListen = [ budgetInput, inboxesInput ];
     let listenersAdded = 0;
     inputsToListen.forEach(input => {
         if (input) {
             input.removeEventListener('input', handleFunnelInputChange);
             input.addEventListener('input', handleFunnelInputChange);
             console.log("[AddListeners] Added listener to:", input.id);
             listenersAdded++;
         } else {
             console.warn("[AddListeners] Could not find Funnel input element.");
         }
     });
     if (listenersAdded === 0) {
        console.error("[AddListeners] Failed to add listeners to ANY input elements!");
        // Display error because inputs are crucial
        displayError(new Error("ไม่สามารถเชื่อมต่อช่อง Input หลักได้"));
     }
 }

// ================================================================================
// INTERNAL INITIALIZATION FUNCTION (NO LONGER EXPOSED)
// ================================================================================

/**
 * Internal function to initialize the Funnel report section using data stored in state.
 */
function initializeReportInternally() {
    console.log("[InitReport Internally v1.5] Initializing with state.coreData:", state.coreData);

    // Basic data validation
    if (!state.coreData) {
        console.error("[InitReport Internally] CRITICAL: coreData is missing in state.");
        displayError(new Error("ข้อมูล Core Metrics ไม่พร้อมใช้งาน"));
        return;
    }

    try {
        // 1. Add Event Listeners to inputs
        addFunnelInputListeners();

        // 2. Trigger the first calculation and display update
        console.log("[InitReport Internally] Triggering initial calculation...");
        calculateAndUpdateFunnel();

        console.log("[InitReport Internally] Report initialized successfully.");

    } catch (error) {
        console.error("[InitReport Internally] Error during initialization:", error);
        displayError(error);
    }
};

// ================================================================================
// AUTO-INITIALIZE ON DOM CONTENT LOADED (WITH RIGOROUS CHECKS)
// ================================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("[DOM Ready v1.5] Attempting initialization...");

    // --- Strict Check 1: Verify essential HTML structure exists ---
    const funnelSection = document.querySelector('.funnel-section');
    const budgetInput = document.getElementById('funnel-budget-input');
    const inboxInput = document.getElementById('funnel-inboxes-input');
    const leadsActualDisp = document.getElementById('funnel-leads-actual');
    // Add checks for other essential elements if needed

    if (!funnelSection || !budgetInput || !inboxInput || !leadsActualDisp ) {
         console.error("[DOM Ready v1.5] CRITICAL: Essential HTML elements for Funnel section are missing!");
         displayError(new Error("โครงสร้างหน้าเว็บสำหรับ Funnel ไม่สมบูรณ์"));
         // Log exactly which elements are missing
         if (!funnelSection) console.error("Missing container: .funnel-section");
         if (!budgetInput) console.error("Missing input: #funnel-budget-input");
         if (!inboxInput) console.error("Missing input: #funnel-inboxes-input");
         if (!leadsActualDisp) console.error("Missing display: #funnel-leads-actual");
         return; // Stop initialization
    }
     console.log("[DOM Ready v1.5] Essential HTML elements found.");

    // --- Strict Check 2: Verify window.myReportData exists and has core_metrics ---
    if (typeof window.myReportData === 'object' && window.myReportData !== null && typeof window.myReportData.core_metrics === 'object' && window.myReportData.core_metrics !== null) {
        console.log("[DOM Ready v1.5] Found valid window.myReportData:", window.myReportData);

        // Store the necessary data in the global state
        state.coreData = window.myReportData.core_metrics;
        console.log("[DOM Ready v1.5] Stored core data in state:", state.coreData);

        // Call the internal initialization function
        initializeReportInternally();

    } else {
        console.error("[DOM Ready v1.5] CRITICAL: window.myReportData not found or invalid!", window.myReportData);
        displayError(new Error("ไม่พบข้อมูลรายงานเริ่มต้น (window.myReportData) หรือข้อมูล core_metrics หายไป"));
    }
});

console.log("[Script Ready] report-2.js (Funnel Only v1.5 CHECK) loaded. Will initialize on DOM ready.");

// --- Removed window.initializeFunnelReport and fallback ---
