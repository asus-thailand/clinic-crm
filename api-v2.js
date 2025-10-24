// ================================================================================
// API Layer - V2 ONLY (for report-2.html)
// Handles communication with the Supabase backend for Report V2.
// Version 1.1 - FIX: Correctly unwrap JSON response from RPC
// ================================================================================

const apiV2 = {}; // Create a new object to avoid conflicts

/**
 * [NEW - V2 REPORT] Fetches the sales report data for the new report (report-2.html).
 * Calls the new 'get_sales_report_v2' RPC function.
 * @param {string} userId The ID of the user requesting the report.
 * @param {string|null} startDate The start date for the filter (YYYY-MM-DD).
 * @param {string|null} endDate The end date for the filter (YYYY-MM-DD).
 * @returns {Promise<object>} The unwrapped report data object for V2.
 */
apiV2.getSalesReportV2 = async function(userId, startDate = null, endDate = null) {
    // Ensure supabaseClient is available
    if (!window.supabaseClient) {
        console.error("Supabase client is not initialized in api-v2.js");
        throw new Error('Supabase client is not initialized.');
    }
    
    if (!userId) {
        console.error("User ID is missing in getSalesReportV2 call");
        throw new Error('User ID is required to get the V2 sales report.');
    }

    const RPC_FUNCTION_NAME = 'get_sales_report_v2'; 
    const params = { requesting_user_id: userId };
    
    if (startDate && typeof startDate === 'string' && startDate.trim() !== '') params.start_date = startDate;
    if (endDate && typeof endDate === 'string' && endDate.trim() !== '') params.end_date = endDate;

    console.log(`Calling RPC: ${RPC_FUNCTION_NAME} with params:`, params);

    try {
        // Use { count: 'exact' } potentially if needed, but usually not for single JSON return
        const { data, error, status, statusText } = await window.supabaseClient.rpc(RPC_FUNCTION_NAME, params);

        // Log the raw response for debugging
        console.log("Raw RPC Response:", { data, error, status, statusText });

        if (error) {
            // Throw the specific error from Supabase
            console.error(`RPC Error (${status} ${statusText}):`, error);
            throw new Error(`Could not fetch sales report data (V2): ${error.message || 'Unknown RPC error'}`);
        }

        // --- [FIX] Unwrap the JSON data correctly ---
        let reportJson = null;
        if (data) {
             // Supabase often returns the JSON directly if it's the only return value
             reportJson = data; 
        }
        
        // Handle cases where data might be unexpectedly null or empty
        if (!reportJson) {
            console.warn("RPC call succeeded but returned no data or null.");
            return {}; // Return an empty object instead of null/undefined
        }
        
        console.log("Unwrapped Report JSON:", reportJson);
        return reportJson; // Return the actual JSON object

    } catch (error) {
        // Catch errors thrown above or during the RPC call itself
        console.error("API ERROR in getSalesReportV2 (catch block):", error);
        // Re-throw the error to be caught by the calling function (fetchAndRenderReport)
        // Ensure the error message is useful
        throw new Error(`Could not fetch sales report data (V2): ${error.message || 'Network or processing error'}`);
    }
};

// Make the 'apiV2' object available globally
window.apiV2 = apiV2;
console.log("api-v2.js loaded and apiV2 object created."); // Add log to confirm loading
