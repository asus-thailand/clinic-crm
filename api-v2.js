// ================================================================================
// API Layer - V2 ONLY (for report-2.html)
// Handles communication with the Supabase backend for Report V2.
// Version 1.2 - FIX: More robust JSON unwrapping for RPC response
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

    console.log(`[API-V2] Calling RPC: ${RPC_FUNCTION_NAME} for user ${userId}...`);

    try {
        const { data, error, status, statusText } = await window.supabaseClient.rpc(RPC_FUNCTION_NAME, params);

        // Log the raw response for debugging
        console.log("[API-V2] Raw RPC Response:", { data, error, status, statusText });

        if (error) {
            console.error(`[API-V2] RPC Error in '${RPC_FUNCTION_NAME}' (${status} ${statusText}):`, error);
            // Provide a clearer error message incorporating details from Supabase if available
            throw new Error(`Could not fetch sales report data (V2): ${error.message || `Status ${status} ${statusText}`}`);
        }

        // --- [FIX v1.2] More robust JSON unwrapping ---
        let reportJson = null;
        if (data !== null && data !== undefined) {
            // Case 1: Data is an array (sometimes happens), take the first element.
            // Then check if that element is keyed by function name, or use the element directly.
            if (Array.isArray(data) && data.length > 0) {
                 console.log("[API-V2] RPC returned an array, attempting to unwrap first element.");
                 const firstElement = data[0];
                 // Check if the first element itself contains the key matching the function name
                 if (typeof firstElement === 'object' && firstElement !== null && firstElement.hasOwnProperty(RPC_FUNCTION_NAME)) {
                    reportJson = firstElement[RPC_FUNCTION_NAME];
                 } else {
                    // Otherwise, assume the first element IS the data
                    reportJson = firstElement;
                 }
            } 
            // Case 2: Data is an object keyed by the function name (less common now but possible)
            else if (typeof data === 'object' && data !== null && data.hasOwnProperty(RPC_FUNCTION_NAME)) {
                console.log("[API-V2] RPC returned object keyed by function name, unwrapping.");
                reportJson = data[RPC_FUNCTION_NAME];
            } 
            // Case 3: Assume data is the direct JSON object (most common for single JSON returns)
            else if (typeof data === 'object' && data !== null) {
                console.log("[API-V2] RPC returned direct object, using as is.");
                reportJson = data;
            } else {
                 console.warn("[API-V2] RPC returned data but in an unexpected format:", data);
            }
        } else {
             console.warn("[API-V2] RPC call succeeded but returned null or undefined data.");
        }
        // --- End Fix ---

        // Ensure we have a valid object, even if empty, before returning
        if (!reportJson || typeof reportJson !== 'object') {
            console.warn("[API-V2] Unwrapping resulted in null or non-object, returning empty object.", reportJson);
            return {}; // Return an empty object to prevent errors downstream
        }
        
        // Final check if the object is empty
        if (Object.keys(reportJson).length === 0) {
             console.warn("[API-V2] RPC call resulted in an empty JSON object after unwrapping.");
             // Depending on requirements, this might be an error or just an empty report
             // return {}; // Returning empty object might be acceptable
        }
        
        console.log("[API-V2] Successfully unwrapped Report JSON:", reportJson);
        return reportJson; // Return the actual JSON object

    } catch (error) {
        // Catch errors thrown within the try block or from the RPC call itself
        console.error("[API-V2] Unexpected error while fetching sales report:", error);
        // Re-throw the error with a consistent message format
        throw new Error(`Could not fetch sales report data (V2): ${error.message || 'Unknown error during fetch'}`);
    }
};

// Make the 'apiV2' object available globally
window.apiV2 = apiV2;
console.log("api-v2.js loaded and apiV2 object created.");
