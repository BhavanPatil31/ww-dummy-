import axios from 'axios';

const BASE_URL = 'https://api.mfapi.in/mf';

// ─── Fund list cache (singleton) ────────────────────────────────────────────
let allFundsCache = null;
let allFundsPromise = null;

// ─── NAV history cache keyed by schemeCode ───────────────────────────────────
// Stores either the full API response object or null (empty/invalid fund)
const navHistoryCache = new Map();

/**
 * Parses "DD-MM-YYYY" into a UTC-safe timestamp for comparison.
 */
const parseDDMMYYYY = (str) => {
    if (!str || typeof str !== 'string') return 0;
    const parts = str.split('-').map(Number);
    if (parts.length !== 3) return 0;
    const [d, m, y] = parts;
    return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
};

/**
 * Parses "YYYY-MM-DD" (from <input type="date">) into a UTC-safe timestamp.
 */
const parseYYYYMMDD = (str) => {
    if (!str || typeof str !== 'string') return 0;
    const parts = str.split('-').map(Number);
    if (parts.length !== 3) return 0;
    const [y, m, d] = parts;
    return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
};

// ─── 1. FUND LIST ────────────────────────────────────────────────────────────

/**
 * Fetches all mutual fund schemes from AMFI via mfapi.in.
 * - Singleton promise prevents duplicate in-flight requests.
 * - Cached after first successful load.
 * - Retries up to 2 times on failure.
 */
export const getAllFunds = async () => {
    if (allFundsCache && allFundsCache.length > 1000) return allFundsCache;

    // Fast-path: Check LocalStorage caching safely
    try {
        const localCache = localStorage.getItem('amfi_funds_list');
        if (localCache) {
            const parsedCache = JSON.parse(localCache);
            if (Array.isArray(parsedCache) && parsedCache.length > 1000) {
                allFundsCache = parsedCache;
                console.log(`[mfService] Fund list loaded from localStorage fast-cache: ${allFundsCache.length} schemes`);
                return allFundsCache;
            }
        }
    } catch (e) {
        localStorage.removeItem('amfi_funds_list');
    }

    if (allFundsPromise) return allFundsPromise;

    allFundsPromise = (async () => {
        const fetchWithRetry = async (retries = 3) => {
            try {
                // Requirement 1 & 5: Fetch dynamically from public API ONLY
                const response = await axios.get(BASE_URL);
                if (response.data && Array.isArray(response.data) && response.data.length > 1000) {
                    console.log(`[mfService] Fund list dynamically loaded from AMFI network: ${response.data.length} schemes`);
                    allFundsCache = response.data;
                    
                    // Cache to localStorage for future loads
                    try {
                        localStorage.setItem('amfi_funds_list', JSON.stringify(allFundsCache));
                    } catch (cacheErr) {
                        console.warn(`[mfService] LocalStorage quota exceeded. Using memory cache only.`);
                    }
                    
                    return allFundsCache;
                }
                throw new Error('Invalid AMFI API response format or insufficient data');
            } catch (error) {
                if (retries > 0) {
                    console.warn(`[mfService] API dynamically fetching error. Retrying... (${retries} left)`);
                    await new Promise(r => setTimeout(r, 2000));
                    return fetchWithRetry(retries - 1);
                }
                console.error(`[mfService] API fetch completely failed after retries: ${error.message}`);
                allFundsPromise = null;
                throw error;
            }
        };
        return fetchWithRetry();
    })();

    return allFundsPromise;
};

// ─── 2. NAV HISTORY ──────────────────────────────────────────────────────────

/**
 * Fetches full NAV history for a schemeCode.
 * - Cached per schemeCode to avoid repeated API calls.
 * - Returns null when the fund has no data (data: []) or on error.
 */
export const getNavHistory = async (schemeCode) => {
    if (!schemeCode) return null;

    const key = String(schemeCode);

    // Return cached result (including null for known-empty funds)
    if (navHistoryCache.has(key)) {
        console.log(`[mfService] NAV cache hit for scheme ${key}`);
        return navHistoryCache.get(key);
    }

    try {
        const response = await axios.get(`${BASE_URL}/${key}`, { timeout: 10000 });
        const body = response.data;

        if (!body || body.status !== 'SUCCESS') {
            console.warn(`[mfService] Non-success status for scheme ${key}:`, body?.status);
            navHistoryCache.set(key, null);
            return null;
        }

        if (!body.data || body.data.length === 0) {
            console.warn(`[mfService] Empty NAV data for scheme ${key}`);
            navHistoryCache.set(key, null); // Cache null to prevent re-fetch
            return null;
        }

        console.log(`[mfService] NAV data fetched for scheme ${key}: ${body.data.length} entries`);
        navHistoryCache.set(key, body);
        return body;

    } catch (error) {
        console.error(`[mfService] Error fetching NAV for scheme ${key}:`, error.message);
        return null; // Do NOT cache errors — allow retry
    }
};

// ─── 3. NAV DATE RESOLUTION ──────────────────────────────────────────────────

/**
 * Finds the correct NAV entry for a selected date from full NAV history.
 *
 * Resolution order:
 *   1. selectedDate >= latestAvailableDate  → return latest entry (data[0])
 *   2. Exact match for selectedDate         → return exact entry
 *   3. No exact match                       → return nearest PREVIOUS date entry
 *   4. selectedDate before ALL available    → return null (no data for that period)
 *
 * @param {Array}  navData      - Array of { date: "DD-MM-YYYY", nav: "value" }
 * @param {string} selectedDate - Date string in "YYYY-MM-DD" format
 * @returns {{ date: string, nav: string } | null}
 */
export const getNavByDate = (navData, selectedDate) => {
    if (!navData || navData.length === 0 || !selectedDate) return null;

    // Sort descending so data[0] is always the latest
    const sorted = [...navData].sort(
        (a, b) => parseDDMMYYYY(b.date) - parseDDMMYYYY(a.date)
    );

    const latestEntry  = sorted[0];
    const oldestEntry  = sorted[sorted.length - 1];
    const selectedTime = parseYYYYMMDD(selectedDate);
    const latestTime   = parseDDMMYYYY(latestEntry.date);
    const oldestTime   = parseDDMMYYYY(oldestEntry.date);

    // CASE 1: Selected date is on or after the latest available → use latest
    if (selectedTime >= latestTime) {
        return latestEntry;
    }

    // CASE 2: Selected date is before ALL historical data → no match
    if (selectedTime < oldestTime) {
        return null;
    }

    // CASE 3: Exact match or nearest previous date
    // First entry in sorted (latest-first) where navDate <= selectedDate
    const match = sorted.find(entry => parseDDMMYYYY(entry.date) <= selectedTime);
    return match || null;
};

// ─── 4. UTILITIES ────────────────────────────────────────────────────────────

/**
 * Calculates how many days ago a "DD-MM-YYYY" date string was.
 */
export const daysSince = (ddmmyyyy) => {
    const t = parseDDMMYYYY(ddmmyyyy);
    if (!t) return Infinity;
    return (Date.now() - t) / (1000 * 3600 * 24);
};

/**
 * Standard debounce utility.
 */
export const debounce = (func, delay) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => func(...args), delay);
    };
};
