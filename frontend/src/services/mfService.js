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
 * @returns {Promise<Object|null>} The API response or null if unavailable
 */
export const getNavHistory = async (schemeCode) => {
    try {
        const response = await axios.get(`${BASE_URL}/${schemeCode}`);
        if (response.data && response.data.status === "SUCCESS") {
            // CRITICAL: Some schemes return { meta, data: [], status: "SUCCESS" }
            if (!response.data.data || response.data.data.length === 0) {
                return null; 
            }
            return response.data;
        }
        return null;
    } catch (error) {
        console.error(`Error fetching NAV history for ${schemeCode}:`, error);
        return null;
    }
};

/**
 * Finds the correct NAV for a selected date.
 * 1. Convert selected date -> DD-MM-YYYY
 * 2. If exact date exists -> use that
 * 3. Else -> find nearest previous available date
 * 4. If selected date > latest available date -> use latest
 * 
 * @param {Array} navData History array [ { date, nav } ]
 * @param {string} selectedDate "YYYY-MM-DD"
 */
export const getNavByDate = (navData, selectedDate) => {
    if (!navData || navData.length === 0) return null;

    const parseDateValue = (str) => {
        const [d, m, y] = str.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
    };

    // Ensure data is sorted by date descending (latest first)
    const sortedData = [...navData].sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date));

    const [y, m, d] = selectedDate.split('-').map(Number);
    const selectedTime = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
    
    const latestTime = parseDateValue(sortedData[0].date);

    // If selected date is exactly latest OR in the future, return latest
    if (selectedTime >= latestTime) {
        return sortedData[0];
    }

    // Find the first entry where the date is less than or equal to the selected date
    // Since sortedData is latest first, the first one we hit is the "nearest previous"
    const match = sortedData.find(item => parseDateValue(item.date) <= selectedTime);

    return match || null;
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
