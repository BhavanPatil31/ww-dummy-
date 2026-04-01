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
 * 3. IF NOT found: Find nearest previous date NAV
 * 4. IF selected date > latest available NAV: Use latest NAV
 * 
 * @param {Array} navData History array [ { date, nav } ]
 * @param {string} selectedDate "YYYY-MM-DD"
 */
export const getNavByDate = (navData, selectedDate) => {
    if (!navData || navData.length === 0) return null;

    // Helper to parse "DD-MM-YYYY" into a generic numeric value for comparison
    const parseDateValue = (str) => {
        const [d, m, y] = str.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        date.setHours(0, 0, 0, 0); // Normalize time
        return date.getTime();
    };

    // Sort descending by date (latest first) to guarantee data order
    const sortedData = [...navData].sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date));

    const [y, m, d] = selectedDate.split('-').map(Number);
    const selectedDateObj = new Date(y, m - 1, d);
    selectedDateObj.setHours(0, 0, 0, 0);
    const selectedTime = selectedDateObj.getTime();

    const latestDateValue = parseDateValue(sortedData[0].date);

    // FIX: If selected date is in the future OR exactly matches/exceeds latest available:
    // ALWAYS treat data[0] as the latest NAV
    if (selectedTime >= latestDateValue) {
        return sortedData[0];
    }

    // Iterate from latest to oldest, pick first NAV where: navDate <= selectedDate
    // find() on a descending array automatically does this.
    const result = sortedData.find(item => parseDateValue(item.date) <= selectedTime);

    // If no match found (selected date is before fund existed), return null to show "NAV unavailable"
    return result || null;
};

/**
 * Standard debounce function to limit API calls during search
 */
export const debounce = (func, delay) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => func(...args), delay);
    };
};
