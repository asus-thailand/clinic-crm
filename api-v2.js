// ================================================================================
// API Layer - V2 ONLY (for report-2.html)
// Handles communication with the Supabase backend for Report V2.
// ================================================================================

const apiV2 = {}; // Create a new object to avoid conflicts

/**
 * [NEW - V2 REPORT] Fetches the sales report data for the new report (report-2.html).
 * Calls the new 'get_sales_report_v2' RPC function.
 * @param {string} userId The ID of the user requesting the report.
 * @param {string|null} startDate The start date for the filter (YYYY-MM-DD).
 * @param {string|null} endDate The end date for the filter (YYYY-MM-DD).
 * @returns {Promise<object>} The report data object for V2.
 */
apiV2.getSalesReportV2 = async function(userId, startDate = null, endDate = null) {
    // Ensure supabaseClient is available
    if (!window.supabaseClient) {
        throw new Error('Supabase client is not initialized.');
    }
    
    if (!userId) {
        throw new Error('User ID is required to get the V2 sales report.');
    }

    const RPC_FUNCTION_NAME = 'get_sales_report_v2'; // New function name
    const params = { requesting_user_id: userId };
    // Only add date parameters if they are non-empty strings
    if (startDate && typeof startDate === 'string' && startDate.trim() !== '') params.start_date = startDate;
    if (endDate && typeof endDate === 'string' && endDate.trim() !== '') params.end_date = endDate;

    try {
        const { data, error } = await window.supabaseClient.rpc(RPC_FUNCTION_NAME, params);
        if (error) throw error;
        // Ensure data is returned, even if empty, to prevent downstream errors
        return data || {}; 
    } catch (error) {
        console.error("API ERROR in getSalesReportV2:", error);
        throw new Error('Could not fetch sales report data (V2): ' + error.message);
    }
};

// Make the 'apiV2' object available globally (or you can import/export if using modules)
window.apiV2 = apiV2;