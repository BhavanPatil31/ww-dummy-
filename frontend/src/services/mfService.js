import axios from 'axios';

const BASE_URL = 'https://api.mfapi.in/mf';

let allFundsCache = null;
let allFundsPromise = null;

/**
 * Fetches all mutual fund schemes from the API with singleton caching.
 */
export const getAllFunds = async () => {
    if (allFundsCache) return allFundsCache;
    if (allFundsPromise) return allFundsPromise;

    allFundsPromise = (async () => {
        const fetchWithRetry = async (retries = 2) => {
            try {
                const response = await axios.get(BASE_URL, { timeout: 15000 });
                if (response.data && Array.isArray(response.data)) {
                    allFundsCache = response.data;
                    return allFundsCache;
                }
                throw new Error("Invalid API response format");
            } catch (error) {
                if (retries > 0) {
                    console.warn(`Retrying all funds fetch... ${retries} left`);
                    await new Promise(r => setTimeout(r, 2000));
                    return fetchWithRetry(retries - 1);
                }
                allFundsPromise = null; // Reset on final failure to allow retry later
                throw error;
            }
        };
        return fetchWithRetry();
    })();

    return allFundsPromise;
};

/**
 * Fetches full NAV history for a specific scheme code.
 * @param {string|number} schemeCode 
 * @returns {Promise<Object>} The API response containing meta and data (NAV history)
 */
export const getNavHistory = async (schemeCode) => {
    try {
        const response = await axios.get(`${BASE_URL}/${schemeCode}`);
        if (response.data && response.data.status === "SUCCESS") {
            // Check if data is empty as some schemes return { meta, data: [], status: "SUCCESS" }
            if (!response.data.data || response.data.data.length === 0) {
                return null;
            }
            return response.data;
        }
        return null; // Invalid or broken data
    } catch (error) {
        console.error(`Error fetching NAV history for ${schemeCode}:`, error);
        return null;
    }
};

/**
 * Finds the correct NAV for a selected date based on specific logic.
 * Logic:
 * 1. Convert selected date -> DD-MM-YYYY
 * 2. Find NAV for selected date -> IF found, use it
 * 3. IF NOT found: Find nearest PREVIOUS available date NAV
 * 4. IF selected date > latest available NAV: Use latest NAV
 */
export const getNavByDate = (navData, selectedDate) => {
    if (!navData || navData.length === 0) return null;

    // Helper to parse "DD-MM-YYYY" into a numeric value for comparison
    const parseDateValue = (str) => {
        const [d, m, y] = str.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
    };

    // 1. Sort descending by date (latest first) to guarantee data order
    // Note: AMFI API usually returns data sorted descending, but we sort again for safety.
    const sortedData = [...navData].sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date));

    // Normalize selected date to midnight
    const [y, m, d] = selectedDate.split('-').map(Number);
    const selectedDateObj = new Date(y, m - 1, d);
    selectedDateObj.setHours(0, 0, 0, 0);
    const selectedTime = selectedDateObj.getTime();

    // Latest available NAV date in dataset
    const latestDateValue = parseDateValue(sortedData[0].date);

    // RULE 4: If selected date is in the future relative to the latest NAV
    // OR matches exactly: Return the latest NAV
    if (selectedTime >= latestDateValue) {
        return {
            ...sortedData[0],
            isLatest: true
        };
    }

    // RULE 2 & 3: Iterate through sorted (latest-to-oldest) data.
    // The first item where item.date <= selectedTime is either the EXACT date
    // or the NEAREST PREVIOUS date.
    const result = sortedData.find(item => parseDateValue(item.date) <= selectedTime);

    // If result exists, we return it. If the find fails (selected date is before the fund existed), return null.
    return result || null;
};
