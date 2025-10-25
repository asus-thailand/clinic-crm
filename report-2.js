// ================================================================================
// Sales Performance Dashboard - V2 SCRIPT (Simplified - Funnel Only)
// Version: Funnel Step 1.4 (Auto Init from window.myReportData)
// - Reads data from window.myReportData on DOMContentLoaded.
// - No external initialization function needed.
// ================================================================================

console.log("[Script Load] report-2.js (Funnel Only v1.4 AUTO INIT) executing...");

// -- GLOBAL STATE --
window.reportState = window.reportState || {
    coreData: null
};
const state = window.reportState;

const KPI_INBOX_TO_LEAD_TARGET_PERCENT = 30;

// -- ELEMENT REFERENCES -- (Lookup inside functions recommended)

// -- HELPER FUNCTIONS --
function formatCurrency(n, showSign = false, decimals = 0) { /* ... เหมือนเดิม ... */ }
function formatNumber(n) { /* ... เหมือนเดิม ... */ }
function displayError(error) { /* ... เหมือนเดิม ... */ }

// ================================================================================
// CORE FUNNEL LOGIC
// ================================================================================
function getFunnelInputs() { /* ... เหมือนเดิม v1.2 DEBUG ... */ }
function calculateAndUpdateFunnel() { /* ... เหมือนเดิม v1.2 DEBUG ... */ }
function handleFunnelInputChange(event) { /* ... เหมือนเดิม v1.2 DEBUG ... */ }
function addFunnelInputListeners() { /* ... เหมือนเดิม v1.2 DEBUG ... */ }

// ================================================================================
// INTERNAL INITIALIZATION FUNCTION
// ================================================================================

/**
 * Internal function to initialize the Funnel report section using data stored in state.
 */
function initializeReportWithData() {
    console.log("[InitReport Internally] Initializing with state.coreData:", state.coreData);

    // Basic data validation
    if (!state.coreData) { // Check state.coreData directly now
        console.error("[InitReport Internally] Invalid or missing core data in state.");
        displayError(new Error("ข้อมูลที่ส่งมาสำหรับรายงานไม่สมบูรณ์ (ต้องการ core_metrics)"));
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
// AUTO-INITIALIZE ON DOM CONTENT LOADED
// ================================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("[DOM Ready in JS] Attempting auto-initialization...");

    // Check if data was defined in HTML
    if (typeof window.myReportData === 'object' && window.myReportData !== null && window.myReportData.core_metrics) {
        console.log("[Auto-Init] Found window.myReportData:", window.myReportData);

        // Store the necessary data in the global state
        state.coreData = window.myReportData.core_metrics; // Store only core_metrics for now
        console.log("[Auto-Init] Stored core data in state:", state.coreData);

        // Call the internal initialization function
        initializeReportWithData();

    } else {
        console.error("[Auto-Init] window.myReportData not found or invalid!");
        displayError(new Error("ไม่พบข้อมูลรายงานเริ่มต้น (window.myReportData)"));
    }
});

console.log("[Script Ready] report-2.js (Funnel Only v1.4 AUTO INIT) loaded. Will initialize on DOM ready.");

// --- Removed window.initializeFunnelReport and fallback ---
