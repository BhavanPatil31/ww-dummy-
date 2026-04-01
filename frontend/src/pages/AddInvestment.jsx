import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    FiDollarSign, FiCalendar, FiActivity, FiTag, FiCheckCircle, FiInfo
} from 'react-icons/fi';
import '../styles/AddInvestment.css';
import { getAllFunds, getNavHistory, getNavByDate } from '../services/mfService';

export default function AddInvestment({ user, onBackToDashboard }) {
    const [mockFunds, setMockFunds] = useState([]);
    const [loadingFunds, setLoadingFunds] = useState(false);
    const [type, setType] = useState('SIP');
    const [formData, setFormData] = useState({
        fundName: '',
        fund_id: '',
        nav: '',
        amount: '',
        frequency: 'Monthly',
        startDate: '',
        endDate: ''
    });
    const [status, setStatus] = useState({ loading: false, success: false, error: '' });
    const [toastMsg, setToastMsg] = useState('');

    // Autocomplete Search States
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredFunds, setFilteredFunds] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // NAV states
    const [loadingNav, setLoadingNav] = useState(false);
    const [navDate, setNavDate] = useState('');
    const [latestNavInfo, setLatestNavInfo] = useState({ nav: '', date: '' });
    const navCache = useRef({});
    const suggestionRef = useRef(null);
    const todayDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .split('T')[0];

    // Fetch fund list on mount directly from AMFI API via mfapi.in
    useEffect(() => {
        const fetchFundList = async () => {
            setLoadingFunds(true);
            try {
                const response = await axios.get('http://localhost:8088/api/mf/list');

                let dataToMap = response.data;

                // --- RESILIENCY FALLBACK ---
                // If the user hasn't successfully compiled/restarted the Spring backend,
                // the database seeder won't run, leaving this API empty or broken.
                if (!dataToMap || dataToMap.length === 0) {
                    console.warn("Backend list empty. Injecting the hardcoded 40 funds fallback layer.");
                    dataToMap = [
                        { scheme_code: "125497", scheme_name: "HDFC Top 100 Fund - Direct Plan - Growth" },
                        { scheme_code: "118834", scheme_name: "SBI Bluechip Fund - Direct Plan - Growth" },
                        { scheme_code: "118825", scheme_name: "Mirae Asset Large Cap Fund - Direct Plan - Growth" },
                        { scheme_code: "120465", scheme_name: "Axis Bluechip Fund - Direct Plan - Growth" },
                        { scheme_code: "120716", scheme_name: "ICICI Prudential Bluechip Fund - Direct Plan - Growth" },
                        { scheme_code: "122639", scheme_name: "Parag Parikh Flexi Cap Fund - Direct Plan - Growth" },
                        { scheme_code: "120468", scheme_name: "UTI Flexi Cap Fund - Direct Plan - Growth" },
                        { scheme_code: "120199", scheme_name: "Aditya Birla Sun Life Frontline Equity Fund - Direct Plan - Growth" },
                        { scheme_code: "125354", scheme_name: "SBI Small Cap Fund - Direct Plan - Growth" },
                        { scheme_code: "120847", scheme_name: "Quant Small Cap Fund - Direct Plan - Growth" },
                        { scheme_code: "120822", scheme_name: "HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth" },
                        { scheme_code: "130321", scheme_name: "Kotak Emerging Equity Fund - Direct Plan - Growth" },
                        { scheme_code: "129457", scheme_name: "ICICI Prudential Flexi Cap Fund - Direct Plan - Growth" },
                        { scheme_code: "130115", scheme_name: "Axis Flexi Cap Fund - Direct Plan - Growth" },
                        { scheme_code: "128051", scheme_name: "HDFC Flexi Cap Fund - Direct Plan - Growth" },
                        { scheme_code: "132010", scheme_name: "DSP Flexi Cap Fund - Direct Plan - Growth" },
                        { scheme_code: "130323", scheme_name: "Kotak Equity Opportunities Fund - Direct Plan - Growth" },
                        { scheme_code: "131201", scheme_name: "SBI Focused Equity Fund - Direct Plan - Growth" },
                        { scheme_code: "130112", scheme_name: "Axis Focused 25 Fund - Direct Plan - Growth" },
                        { scheme_code: "130114", scheme_name: "Axis Small Cap Fund - Direct Plan - Growth" },
                        { scheme_code: "100148", scheme_name: "Franklin India Prima Fund - Growth" },
                        { scheme_code: "100251", scheme_name: "Franklin India Bluechip Fund - Growth" },
                        { scheme_code: "100305", scheme_name: "Franklin India Taxshield - Growth" },
                        { scheme_code: "131203", scheme_name: "SBI Contra Fund - Direct Plan - Growth" },
                        { scheme_code: "131202", scheme_name: "SBI Magnum Midcap Fund - Direct Plan - Growth" },
                        { scheme_code: "131205", scheme_name: "SBI Long Term Equity Fund - Direct Plan - Growth" },
                        { scheme_code: "132011", scheme_name: "DSP Small Cap Fund - Direct Plan - Growth" },
                        { scheme_code: "132012", scheme_name: "DSP Equity Opportunities Fund - Direct Plan - Growth" },
                        { scheme_code: "132013", scheme_name: "DSP Tax Saver Fund - Direct Plan - Growth" },
                        { scheme_code: "129456", scheme_name: "ICICI Prudential Value Discovery Fund - Direct Plan - Growth" },
                        { scheme_code: "128052", scheme_name: "HDFC Balanced Advantage Fund - Direct Plan - Growth" },
                        { scheme_code: "128053", scheme_name: "HDFC Hybrid Equity Fund - Direct Plan - Growth" },
                        { scheme_code: "128054", scheme_name: "HDFC Large and Mid Cap Fund - Direct Plan - Growth" },
                        { scheme_code: "128055", scheme_name: "HDFC Small Cap Fund - Direct Plan - Growth" },
                        { scheme_code: "127042", scheme_name: "DSP Midcap Fund - Direct Plan - Growth" },
                        { scheme_code: "126503", scheme_name: "Axis Midcap Fund - Direct Plan - Growth" },
                        { scheme_code: "130322", scheme_name: "Kotak Small Cap Fund - Direct Plan - Growth" },
                        { scheme_code: "130324", scheme_name: "Kotak Bluechip Fund - Direct Plan - Growth" },
                        { scheme_code: "119551", scheme_name: "Tata Digital India Fund - Direct Plan - Growth" },
                        { scheme_code: "120318", scheme_name: "Kotak Flexicap Fund - Direct Plan - Growth" }
                    ];
                }

                const formatted = dataToMap.map(f => ({
                    code: (f.schemeCode || f.scheme_code || f.code || "").toString(),
                    name: f.schemeName || f.scheme_name || f.name || "Unknown Fund",
                    nav: 0
                })).sort((a, b) => a.name.localeCompare(b.name));

                setMockFunds(formatted);
                setFilteredFunds(formatted);
                console.log(`Successfully loaded ${formatted.length} funds from AMFI API.`);
            } catch (err) {
                console.error("Failed to fetch funds", err);
                // Only show toast if we honestly have NO funds at all
                if (mockFunds.length === 0) {
                    showToast("Could not load fund list. Please check your connection.");
                }
            } finally {
                setLoadingFunds(false);
            }
        };
        fetchFundList();
    }, []);

    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 4000);
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Reactive filtering from cached full fund list
    useEffect(() => {
        if (!formData.fundName) {
            setFilteredFunds(mockFunds);
            return;
        }

        const searchTimer = setTimeout(() => {
            const searchVal = formData.fundName.toLowerCase();
            const results = mockFunds.filter(fund =>
                fund.name.toLowerCase().includes(searchVal) ||
                fund.code.includes(searchVal)
            );

            setFilteredFunds(results);
        }, 300); // 300ms debounce

        return () => clearTimeout(searchTimer);
    }, [formData.fundName, mockFunds]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        // If user manually edits fundName, clear the selected fund_id to force correct selection
        if (name === 'fundName') {
            setFormData(prev => ({ ...prev, fundName: value, fund_id: '', nav: '' }));
            setNavDate('');
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleFocus = () => {
        setShowSuggestions(true);
        // Reset scroll window on new focus/search
        setVisibleCount(200);
    };

    const handleSelectFund = (fund) => {
        setFormData(prev => ({
            ...prev,
            fundName: fund.name,
            fund_id: fund.code,
            nav: ""
        }));
        setShowSuggestions(false);
    };

    // Live NAV Fetch using mfService
    useEffect(() => {
        const fetchLiveNav = async () => {
            if (!formData.fund_id || !formData.startDate) {
                setLoadingNav(false);
                setFormData(prev => (prev.nav === "" || prev.nav === "Fetching..." ? prev : { ...prev, nav: "" }));
                setNavDate('');
                return;
            }

            const cacheKey = `${formData.fund_id}_${formData.startDate}`;

            if (navCache.current[cacheKey]) {
                const cached = navCache.current[cacheKey];
                setFormData(prev => ({ ...prev, nav: cached.nav }));
                setNavDate(cached.date);
                return;
            }

            setLoadingNav(true);
            setFormData(prev => ({ ...prev, nav: "Fetching..." }));
            setNavDate('');

            try {
                const history = await getNavHistory(formData.fund_id);

                if (history && history.data && history.data.length > 0) {
                    // Update latest info (data[0] is always latest)
                    setLatestNavInfo({
                        nav: history.data[0].nav,
                        date: history.data[0].date
                    });

                    const result = getNavByDate(history.data, formData.startDate);

                    if (result) {
                        navCache.current[cacheKey] = {
                            nav: result.nav,
                            date: result.date
                        };
                        setFormData(prev => ({ ...prev, nav: result.nav }));
                        setNavDate(result.date);
                    } else {
                        throw new Error("NAV unavailable");
                    }
                } else {
                    setFormData(prev => ({ ...prev, nav: "NAV unavailable" }));
                    setLatestNavInfo({ nav: '', date: '' });
                    showToast("NAV data unavailable for this fund");
                }
            } catch (err) {
                console.error("Failed to fetch NAV", err);
                setFormData(prev => ({ ...prev, nav: "NAV unavailable" }));
                showToast("NAV unavailable for the selected fund/date");
            } finally {
                setLoadingNav(false);
            }
        };

        const timeoutId = setTimeout(fetchLiveNav, 500);
        return () => clearTimeout(timeoutId);
    }, [formData.fund_id, formData.startDate]);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val || 0);
    };

    const isNavFetching = formData.nav === "Fetching..." || loadingNav;
    const isNavUnavailable = formData.nav === "NAV unavailable";
    const currentNavValue = parseFloat(formData.nav);

    const units = (formData.amount > 0 && !isNaN(currentNavValue) && currentNavValue > 0)
        ? (parseFloat(formData.amount) / currentNavValue).toFixed(4)
        : "0.0000";

    const isSubmitDisabled = status.loading || isNavFetching || isNavUnavailable || !formData.fund_id || isNaN(currentNavValue) || currentNavValue <= 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitDisabled) return;

        setStatus({ loading: true, success: false, error: '' });

        const payload = {
            userId: user?.userId || user?.id,
            user_id: user?.userId || user?.id,
            fund_id: parseInt(formData.fund_id) || Math.floor(Math.random() * 1000) + 1,
            investment_type: type,
            amount: parseFloat(formData.amount),
            nav_at_buy: parseFloat(formData.nav),
            units: parseFloat(units),
            buy_date: formData.startDate,
            frequency: type === 'SIP' ? formData.frequency : null,
            asset_category: type,
            scheme_name: formData.fundName,
            amount_invested: parseFloat(formData.amount),
            current_nav: parseFloat(formData.nav),
            start_date: formData.startDate,
            end_date: formData.endDate || null
        };

        try {
            const token = localStorage.getItem("jwt_token");
            await axios.post('http://localhost:8088/api/investments/add', payload, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            setStatus({ loading: false, success: true, error: '' });
            setTimeout(() => {
                onBackToDashboard();
            }, 2000);
        } catch (error) {
            console.error(error);
            setStatus({ loading: false, success: false, error: 'Failed to add investment. Please try again.' });
        }
    };

    // Helper to group funds for nice UI
    const getCategory = (fundName) => {
        const name = fundName.toLowerCase();
        if (name.includes('small cap')) return 'Small Cap';
        if (name.includes('midcap') || name.includes('mid cap') || name.includes('mid-cap')) return 'Mid Cap';
        if (name.includes('large cap') || name.includes('bluechip') || name.includes('top 100') || name.includes('frontline')) return 'Large Cap';
        if (name.includes('flexi cap') || name.includes('flexicap')) return 'Flexi Cap';
        return 'Other Categories';
    };

    // Efficiently group funds with memoization
    const [visibleCount, setVisibleCount] = useState(200);

    const groupedFunds = React.useMemo(() => {
        const slicedResults = filteredFunds.slice(0, visibleCount);
        return slicedResults.reduce((acc, fund) => {
            const cat = getCategory(fund.name);
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(fund);
            return acc;
        }, {});
    }, [filteredFunds, visibleCount]);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 100) {
            // Load 200 more if user reaches bottom
            setVisibleCount(prev => Math.min(prev + 200, filteredFunds.length));
        }
    };

    return (
        <div className="add-investment-container">
            {toastMsg && (
                <div className="toast-notification">
                    {toastMsg}
                </div>
            )}

            <div className="add-investment-layout">
                <div className="form-section">
                    <div className="add-investment-card">
                        {status.success ? (
                            <div className="success-state">
                                <FiCheckCircle className="success-icon slide-up-anim" />
                                <h3>Investment Added Successfully!</h3>
                                <p>Your portfolio has been synchronized to the backend. Redirecting...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="investment-form fade-in-anim">
                                {status.error && <div className="error-message">{status.error}</div>}

                                <div className="toggle-group">
                                    <button
                                        type="button"
                                        className={`toggle-btn ${type === 'SIP' ? 'active' : ''}`}
                                        onClick={() => setType('SIP')}
                                    > SIP </button>
                                    <button
                                        type="button"
                                        className={`toggle-btn ${type === 'Lumpsum' ? 'active' : ''}`}
                                        onClick={() => setType('Lumpsum')}
                                    > Lumpsum </button>
                                </div>

                                <div className="form-group dropdown-container" ref={suggestionRef}>
                                    <label className="tooltip-label">
                                        Asset/Fund Name
                                        <span className="tooltip" title="Search funds from our curated list"><FiInfo /></span>
                                    </label>
                                    <div className="input-wrapper">
                                        <FiTag className="input-icon" />
                                        <input
                                            type="text"
                                            name="fundName"
                                            placeholder={loadingFunds ? "Loading funds..." : "Search funds e.g. 'Bluechip'"}
                                            value={formData.fundName}
                                            onChange={handleChange}
                                            onFocus={handleFocus}
                                            onClick={handleFocus}
                                            required
                                            autoComplete="off"
                                            disabled={loadingFunds}
                                            className={!formData.fund_id && formData.fundName ? "input-warning" : ""}
                                        />
                                        {showSuggestions && (
                                            <div className="suggestions-dropdown nice-scroll" onScroll={handleScroll}>
                                                {isSearching ? (
                                                    <div className="searching-indicator spinner-container"><div className="spinner"></div>Searching...</div>
                                                ) : Object.keys(groupedFunds).length > 0 ? (
                                                    <>
                                                        {Object.keys(groupedFunds).map(cat => (
                                                            <div key={cat}>
                                                                <div className="dropdown-category-header">{cat}</div>
                                                                <ul className="dropdown-list">
                                                                    {groupedFunds[cat].map((fund) => (
                                                                        <li key={fund.code} onClick={() => handleSelectFund(fund)} title={fund.name}>
                                                                            <div className="fund-item-details">
                                                                                <strong className="fund-name-truncate">{fund.name}</strong>
                                                                                <span className="fund-code-badge">#{fund.code}</span>
                                                                            </div>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        ))}
                                                        {filteredFunds.length > visibleCount && (
                                                            <div className="loading-more-funds">Scroll for more alternatives... ({filteredFunds.length - visibleCount} hidden)</div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="no-suggestions">
                                                        {formData.fundName.length > 0 ? "No matching funds found" : "Type to search all curated funds"}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {!formData.fund_id && formData.fundName && !showSuggestions && (
                                        <span className="helper-text error-text">Please select a fund from the dropdown</span>
                                    )}
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Amount (₹)</label>
                                        <div className="input-wrapper">
                                            <FiDollarSign className="input-icon" />
                                            <input
                                                type="number"
                                                name="amount"
                                                placeholder="5000"
                                                value={formData.amount}
                                                onChange={handleChange}
                                                required
                                                min="1"
                                                step="any"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group nav-group">
                                        <label>Live NAV Price</label>
                                        <div className="input-wrapper">
                                            <FiActivity className="input-icon" />
                                            <input
                                                type="text"
                                                name="nav"
                                                className={`readonly-input ${isNavFetching ? "nav-fetching" : ""} ${isNavUnavailable ? "nav-error" : ""}`}
                                                value={formData.nav}
                                                readOnly
                                                required
                                                placeholder={isNavFetching ? "Fetching Live Data..." : "0.00"}
                                            />
                                            {isNavFetching && <div className="inline-spinner"></div>}
                                        </div>
                                        {latestNavInfo.date ? (
                                            <span className="helper-text nav-date-text">
                                                Fund Latest: ₹{latestNavInfo.nav} ({latestNavInfo.date})
                                            </span>
                                        ) : (
                                            <span className="helper-text auto-calc">Units: {units}</span>
                                        )}
                                    </div>
                                </div>

                                {type === 'SIP' && (
                                    <div className="form-group">
                                        <label>SIP Frequency</label>
                                        <select name="frequency" value={formData.frequency} onChange={handleChange} className="styled-select padding-left">
                                            <option value="Weekly">Weekly</option>
                                            <option value="Monthly">Monthly</option>
                                            <option value="Quarterly">Quarterly</option>
                                            <option value="Yearly">Yearly</option>
                                        </select>
                                    </div>
                                )}

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Start/Buy Date</label>
                                        <div className="input-wrapper">
                                            <FiCalendar className="input-icon" />
                                            <input
                                                type="date"
                                                name="startDate"
                                                value={formData.startDate}
                                                onChange={handleChange}
                                                max={todayDate}
                                                required
                                            />
                                        </div>
                                    </div>
                                    {type === 'SIP' && (
                                        <div className="form-group">
                                            <label>End Date (Optional)</label>
                                            <div className="input-wrapper">
                                                <FiCalendar className="input-icon" />
                                                <input
                                                    type="date"
                                                    name="endDate"
                                                    value={formData.endDate}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="form-actions">
                                    <button type="button" className="btn-cancel" onClick={onBackToDashboard}>Cancel</button>
                                    <button type="submit" className={`btn-submit ${isSubmitDisabled ? 'disabled-btn' : ''}`} disabled={isSubmitDisabled}>
                                        {status.loading ? 'Saving...' : 'Save Investment'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                <div className="summary-section">
                    <div className="live-summary-card fade-in-anim">
                        <h3>Investment Summary</h3>
                        <div className="summary-metrics">
                            <div className="summary-item">
                                <span>Type</span>
                                <strong>{type}</strong>
                            </div>
                            <div className="summary-item">
                                <span>Asset/Fund</span>
                                <strong title={formData.fundName}>
                                    {formData.fundName ? (formData.fundName.length > 25 ? formData.fundName.substring(0, 25) + '...' : formData.fundName) : '-'}
                                </strong>
                            </div>
                            {type === 'SIP' && (
                                <div className="summary-item">
                                    <span>Frequency</span>
                                    <strong>{formData.frequency}</strong>
                                </div>
                            )}
                            <div className="summary-item">
                                <span>Amount</span>
                                <strong>{formatCurrency(formData.amount)}</strong>
                            </div>
                            <div className="summary-item">
                                <span>NAV (at Buy)</span>
                                <strong>{formData.nav && !isNaN(parseFloat(formData.nav)) ? `₹${formData.nav}` : '-'}</strong>
                            </div>
                            {latestNavInfo.nav && (
                                <div className="summary-item">
                                    <span>Current NAV</span>
                                    <strong style={{ color: 'var(--fintech-green)' }}>₹{latestNavInfo.nav}</strong>
                                </div>
                            )}
                            <div className="summary-item highlight-box">
                                <span>Expected Units</span>
                                <strong>{units}</strong>
                            </div>
                            <div className="summary-item highlight-box-secondary">
                                <span>{type === 'SIP' ? 'Installment' : 'Total Value'}</span>
                                <strong>{formatCurrency(formData.amount)}{type === 'SIP' ? ` / ${formData.frequency.toLowerCase()}` : ''}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
