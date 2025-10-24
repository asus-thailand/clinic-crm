// ================================================================================
// API Layer - V2 ONLY (for report-2.html)
// Handles communication with the Supabase backend for Report V2.
// ================================================================================

const apiV2 = {}; // Isolated namespace

/**
 * Fetches the sales report data for report-2.html
 * Calls the new Supabase RPC: 'get_sales_report_v2'
 * @param {string} userId - The ID of the user requesting the report.
 * @param {string|null} startDate - Filter start date (YYYY-MM-DD).
 * @param {string|null} endDate - Filter end date (YYYY-MM-DD).
 * @returns {Promise<object>} - Report data object (or empty {} if none).
 */
apiV2.getSalesReportV2 = async function (userId, startDate = null, endDate = null) {
    // 1️⃣ Check supabase client
    if (!window.supabaseClient) {
        console.error('[API-V2] Supabase client missing. Did you initialize it before calling apiV2?');
        throw new Error('Supabase client is not initialized.');
    }

    // 2️⃣ Validate user ID
    if (!userId || typeof userId !== 'string') {
        throw new Error('User ID is required and must be a string.');
    }

    const RPC_FUNCTION_NAME = 'get_sales_report_v2';
    const params = { requesting_user_id: userId };

    // 3️⃣ Add filters only when valid
    if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) params.start_date = startDate;
    if (endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) params.end_date = endDate;

    try {
        console.groupCollapsed(`[API-V2] Fetching sales report for ${userId}`);
        console.log('Params:', params);
        console.groupEnd();

        const { data, error } = await window.supabaseClient.rpc(RPC_FUNCTION_NAME, params);

        if (error) {
            console.error(`[API-V2] RPC Error in '${RPC_FUNCTION_NAME}':`, error);
            throw error;
        }

        // Return array or object safely
        if (!data) {
            console.warn('[API-V2] No data returned from RPC:', RPC_FUNCTION_NAME);
            return {};
        }

        console.info(`[API-V2] Report fetched successfully (${Array.isArray(data) ? data.length : 'object'})`);
        return data;
    } catch (error) {
        console.error('[API-V2] Unexpected error while fetching sales report:', error);
        throw new Error('Could not fetch sales report data (V2): ' + (error.message || 'Unknown error'));
    }
};

// Make globally available for legacy script usage
window.apiV2 = apiV2;
