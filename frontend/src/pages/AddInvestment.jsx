import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    FiCalendar, FiSearch, FiTrendingUp, FiInfo,
    FiCheckCircle, FiAlertTriangle, FiAlertCircle, FiDollarSign
} from 'react-icons/fi';
import { getAllFunds, getNavHistory, getNavByDate, daysSince } from '../services/mfService';

import '../styles/AddInvestment.css';

import { FaRupeeSign, FaEuroSign, FaPoundSign } from "react-icons/fa";

const currencyIcons = {
    INR: FaRupeeSign,
    USD: FiDollarSign,
    EUR: FaEuroSign,
    GBP: FaPoundSign,
};

const currencySymbols = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
};

// ─── Constants ───────────────────────────────────────────────────────────────
const TODAY = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];

const NAV_OUTDATED_DAYS = 10; // warn (not block) if latest NAV older than this

// ─── Fallback Data ───────────────────────────────────────────────────────────
const FALLBACK_FUNDS = [
    { code: "125497", name: "HDFC Top 100 Fund - Direct Plan - Growth" },
    { code: "118834", name: "SBI Bluechip Fund - Direct Plan - Growth" },
    { code: "118825", name: "Mirae Asset Large Cap Fund - Direct Plan - Growth" },
    { code: "120465", name: "Axis Bluechip Fund - Direct Plan - Growth" },
    { code: "120716", name: "ICICI Prudential Bluechip Fund - Direct Plan - Growth" },
    { code: "122639", name: "Parag Parikh Flexi Cap Fund - Direct Plan - Growth" },
    { code: "120468", name: "UTI Flexi Cap Fund - Direct Plan - Growth" },
    { code: "120199", name: "Aditya Birla Sun Life Frontline Equity Fund - Direct Plan - Growth" },
    { code: "125354", name: "SBI Small Cap Fund - Direct Plan - Growth" },
    { code: "120847", name: "Quant Small Cap Fund - Direct Plan - Growth" },
    { code: "120822", name: "HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth" },
    { code: "130321", name: "Kotak Emerging Equity Fund - Direct Plan - Growth" },
    { code: "129457", name: "ICICI Prudential Flexi Cap Fund - Direct Plan - Growth" },
    { code: "130115", name: "Axis Flexi Cap Fund - Direct Plan - Growth" },
    { code: "128051", name: "HDFC Flexi Cap Fund - Direct Plan - Growth" },
    { code: "132010", name: "DSP Flexi Cap Fund - Direct Plan - Growth" },
    { code: "130323", name: "Kotak Equity Opportunities Fund - Direct Plan - Growth" },
    { code: "131201", name: "SBI Focused Equity Fund - Direct Plan - Growth" },
    { code: "130112", name: "Axis Focused 25 Fund - Direct Plan - Growth" },
    { code: "130114", name: "Axis Small Cap Fund - Direct Plan - Growth" },
    { code: "100148", name: "Franklin India Prima Fund - Growth" },
    { code: "100251", name: "Franklin India Bluechip Fund - Growth" },
    { code: "100305", name: "Franklin India Taxshield - Growth" },
    { code: "131203", name: "SBI Contra Fund - Direct Plan - Growth" },
    { code: "131202", name: "SBI Magnum Midcap Fund - Direct Plan - Growth" },
    { code: "131205", name: "SBI Long Term Equity Fund - Direct Plan - Growth" },
    { code: "132011", name: "DSP Small Cap Fund - Direct Plan - Growth" },
    { code: "132012", name: "DSP Equity Opportunities Fund - Direct Plan - Growth" },
    { code: "132013", name: "DSP Tax Saver Fund - Direct Plan - Growth" },
    { code: "129456", name: "ICICI Prudential Value Discovery Fund - Direct Plan - Growth" },
    { code: "128052", name: "HDFC Balanced Advantage Fund - Direct Plan - Growth" },
    { code: "128053", name: "HDFC Hybrid Equity Fund - Direct Plan - Growth" },
    { code: "128054", name: "HDFC Large and Mid Cap Fund - Direct Plan - Growth" },
    { code: "128055", name: "HDFC Small Cap Fund - Direct Plan - Growth" },
    { code: "127042", name: "DSP Midcap Fund - Direct Plan - Growth" },
    { code: "126503", name: "Axis Midcap Fund - Direct Plan - Growth" },
    { code: "130322", name: "Kotak Small Cap Fund - Direct Plan - Growth" },
    { code: "130324", name: "Kotak Bluechip Fund - Direct Plan - Growth" },
    { code: "119551", name: "Tata Digital India Fund - Direct Plan - Growth" },
    { code: "120318", name: "Kotak Flexicap Fund - Direct Plan - Growth" }
];



// ─── Component ────────────────────────────────────────────────────────────────
export default function AddInvestment({ user, onBackToDashboard, currency = 'INR' }) {
    // pick icon dynamically
    const CurrencyIcon = currencyIcons[currency] || FiDollarSign;

    // ── Fund list ──────────────────────────────────────────────────────────
    const [allFunds,     setAllFunds]     = useState([]);
    const [loadingFunds, setLoadingFunds] = useState(false);
    const [fundsError,   setFundsError]   = useState('');

    // ── Investment type ────────────────────────────────────────────────────
    const [type, setType] = useState('SIP');

    // ── Form ───────────────────────────────────────────────────────────────
    const [formData, setFormData] = useState({
        fundName:  '',
        fund_id:   '',
        nav:       '',
        amount:    '',
        frequency: 'Monthly',
        startDate: '',
        endDate:   ''
    });

    // ── Dropdown / search ──────────────────────────────────────────────────
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredFunds,   setFilteredFunds]   = useState([]);
    const [visibleLimit,    setVisibleLimit]    = useState(100);
    const suggestionRef = useRef(null);


    // ── NAV state ──────────────────────────────────────────────────────────
    const [loadingNav,    setLoadingNav]    = useState(false);
    const [navDate,       setNavDate]       = useState('');   // actual date of the NAV shown
    const [latestNavInfo, setLatestNavInfo] = useState({ nav: '', date: '' });
    const [navError,      setNavError]      = useState('');   // '' | 'NO_FUND_DATA' | 'NO_DATE_MATCH' | 'FETCH_ERROR'

    /**
     * Two-level cache:
     *   mfService navHistoryCache  — fund-level  (full API response per schemeCode)
     *   navCache ref               — date-level   (resolved { nav, date } per fund+date)
     */
    const navCache = useRef({});

    // ── Submission ─────────────────────────────────────────────────────────
    const [status,   setStatus]   = useState({ loading: false, success: false, error: '' });

    // ── Derived ────────────────────────────────────────────────────────────
    const navValue      = parseFloat(formData.nav);
    const isNavFetching = loadingNav;
    const isNavValid    = !isNaN(navValue) && navValue > 0;
    const isNavOutdated = isNavValid && latestNavInfo.date
                          && daysSince(latestNavInfo.date) > NAV_OUTDATED_DAYS;
    const isNavUnavail  = navError !== '';

    // Disable submit if: loading / nav fetching / nav invalid or unavailable / no fund selected
    const canSubmit =
        !status.loading &&
        !isNavFetching  &&
        isNavValid      &&
        !isNavUnavail   &&
        !!formData.fund_id &&
        !!formData.amount;

    const units = isNavValid && parseFloat(formData.amount) > 0
        ? (parseFloat(formData.amount) / navValue).toFixed(4)
        : '0.0000';

    // ─────────────────────────────────────────────────────────────────────
    // 1. LOAD ALL FUNDS on mount
    // ─────────────────────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            setLoadingFunds(true);
            setFundsError('');
            try {
                const raw = await getAllFunds();
                let formatted = raw
                    .filter(f => f && (f.schemeCode || f.code))
                    .map(f => ({
                        code: String(f.schemeCode || f.code),
                        name: f.schemeName || f.name || 'Unknown Fund'
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name));

                if (formatted.length === 0) formatted = FALLBACK_FUNDS;
                setAllFunds(formatted);
                console.log(`[AddInvestment] Dropdown ready: ${formatted.length} funds`);
            } catch (err) {
                console.error('[AddInvestment] Fund list fetch failed:', err);
                setFundsError('Could not load fund list. Using fallback data.');
                setAllFunds(FALLBACK_FUNDS);
            } finally {
                setLoadingFunds(false);
            }
        };
        load();
    }, []);

    // ─────────────────────────────────────────────────────────────────────
    // 2. CLOSE DROPDOWN on outside click
    // ─────────────────────────────────────────────────────────────────────
    useEffect(() => {
        const handleOutside = (e) => {
            if (suggestionRef.current && !suggestionRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    // ─────────────────────────────────────────────────────────────────────
    // 3. FILTER FUNDS as user types (debounced 150 ms)
    // ─────────────────────────────────────────────────────────────────────
    useEffect(() => {
        const q = formData.fundName.trim().toLowerCase();

        const t = setTimeout(() => {
            let results;
            if (q.length === 0) {
                // Initial load: show top 50 fallback or allFunds
                results = allFunds.length > 0 ? allFunds.slice(0, 50) : FALLBACK_FUNDS;
            } else {
                // Filter across all loaded funds
                results = allFunds.filter(f =>
                    f.name.toLowerCase().includes(q) || f.code.includes(q)
                ).slice(0, 50); // limit payload
            }
            setFilteredFunds(results);
            setVisibleLimit(100); // Reset visible count on new search
        }, 200);
        return () => clearTimeout(t);
    }, [formData.fundName, allFunds]);

    // ─────────────────────────────────────────────────────────────────────
    // 4. FETCH NAV whenever fund_id or startDate changes
    // ─────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!formData.fund_id || !formData.startDate) {
            setFormData(p => ({ ...p, nav: '' }));
            setNavDate('');
            setLatestNavInfo({ nav: '', date: '' });
            setNavError('');
            setLoadingNav(false);
            return;
        }

        const cacheKey = `${formData.fund_id}__${formData.startDate}`;

        // ── Check date-level cache first ──────────────────────────────────
        if (navCache.current[cacheKey]) {
            const c = navCache.current[cacheKey];
            setFormData(p => ({ ...p, nav: c.nav }));
            setNavDate(c.navDate);
            setLatestNavInfo(c.latestNavInfo);
            setNavError(c.navError);
            setLoadingNav(false);
            return;
        }

        let cancelled = false;

        const fetchNav = async () => {
            setLoadingNav(true);
            setFormData(p => ({ ...p, nav: '' }));
            setNavDate('');
            setLatestNavInfo({ nav: '', date: '' });
            setNavError('');

            try {
                // getNavHistory uses its own fund-level cache in mfService.js
                const history = await getNavHistory(formData.fund_id);
                if (cancelled) return;

                // ── CASE A: Fund has no NAV data whatsoever ───────────────
                if (!history || !history.data || history.data.length === 0) {
                    const result = {
                        nav: '',
                        navDate: '',
                        latestNavInfo: { nav: '', date: '' },
                        navError: 'NO_FUND_DATA'
                    };
                    navCache.current[cacheKey] = result;
                    setNavError(result.navError);
                    setLoadingNav(false);
                    return;
                }

                // Latest entry is data[0] after sorting inside getNavByDate
                // But we also need it here — sort manually once
                const sorted = [...history.data].sort((a, b) => {
                    const parse = (s) => {
                        const [d, m, y] = s.split('-').map(Number);
                        return new Date(y, m - 1, d).getTime();
                    };
                    return parse(b.date) - parse(a.date);
                });
                const latest = sorted[0];
                const latestInfo = { nav: latest.nav, date: latest.date };
                setLatestNavInfo(latestInfo);

                // ── Resolve NAV for selected date ─────────────────────────
                const entry = getNavByDate(history.data, formData.startDate);

                if (!entry) {
                    // ── CASE B: No NAV on or before selected date ─────────
                    const result = {
                        nav: '',
                        navDate: '',
                        latestNavInfo: latestInfo,
                        navError: 'NO_DATE_MATCH'
                    };
                    navCache.current[cacheKey] = result;
                    setNavError(result.navError);
                    setLoadingNav(false);
                    return;
                }

                // ── CASE C: NAV resolved successfully ─────────────────────
                const result = {
                    nav: entry.nav,
                    navDate: entry.date,
                    latestNavInfo: latestInfo,
                    navError: ''
                };
                navCache.current[cacheKey] = result;
                setFormData(p => ({ ...p, nav: entry.nav }));
                setNavDate(entry.date);
                setNavError('');

            } catch (err) {
                if (cancelled) return;
                console.error('[AddInvestment] NAV fetch error:', err);
                setNavError('FETCH_ERROR');
            } finally {
                if (!cancelled) setLoadingNav(false);
            }
        };

        const timer = setTimeout(fetchNav, 350); // small debounce for date picker
        return () => { cancelled = true; clearTimeout(timer); };

    }, [formData.fund_id, formData.startDate]);



    const formatCurrency = (val) => {
        return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(val || 0);
    };
    // ─────────────────────────────────────────────────────────────────────
    // 5. HANDLERS
    // ─────────────────────────────────────────────────────────────────────

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'fundName') {
            // Typing in the search box — clear fund selection
            setFormData(p => ({ ...p, fundName: value, fund_id: '', nav: '' }));
            setNavDate('');
            setNavError('');
            setLatestNavInfo({ nav: '', date: '' });
            setShowSuggestions(true);
        } else {
            setFormData(p => ({ ...p, [name]: value }));
        }
    };

    const handleSelectFund = (fund) => {
        setFormData(p => ({ ...p, fundName: fund.name, fund_id: fund.code, nav: '' }));
        setShowSuggestions(false);
        setNavDate('');
        setNavError('');
        setLatestNavInfo({ nav: '', date: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit) return;

        setStatus({ loading: true, success: false, error: '' });

        const payload = {
            user_id:         user?.userId || user?.id,
            fund_id:         parseInt(formData.fund_id),
            investment_type: type === 'Lumpsum' ? 'BUY' : type,
            amount:          parseFloat(formData.amount),
            amount_invested: parseFloat(formData.amount),
            nav_at_buy:      parseFloat(formData.nav),
            units:           parseFloat(units),
            buy_date:        formData.startDate,
            start_date:      formData.startDate,
            end_date:        formData.endDate || null,
            frequency:       type === 'SIP' ? formData.frequency : null,
            scheme_name:     formData.fundName,
            current_nav:     parseFloat(latestNavInfo.nav) || parseFloat(formData.nav)
        };

        try {
            const token = localStorage.getItem('jwt_token');
            await axios.post('http://localhost:8088/api/investments/add', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStatus({ loading: false, success: true, error: '' });
            setTimeout(() => onBackToDashboard(), 2000);
        } catch (err) {
            console.error('[AddInvestment] Submit error:', err);
            setStatus({
                loading: false,
                success: false,
                error: err.response?.data?.message || 'Failed to save investment. Please try again.'
            });
        }
    };

    // ─────────────────────────────────────────────────────────────────────
    // 6. GROUPED DROPDOWN
    // ─────────────────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────
    // 6. GROUPED DROPDOWN (removed for react-window virtualized flat list)
    // ─────────────────────────────────────────────────────────────────────

    // ─────────────────────────────────────────────────────────────────────
    // 7. NAV STATUS MESSAGES
    // ─────────────────────────────────────────────────────────────────────
    const NavStatusMessage = () => {
        if (isNavFetching) return null;

        if (navError === 'NO_FUND_DATA') return (
            <span className="nav-error-msg">
                <FiAlertCircle className="msg-icon" />
                NAV not available for this fund. Please select a different fund.
            </span>
        );

        if (navError === 'NO_DATE_MATCH') return (
            <span className="nav-error-msg">
                <FiAlertCircle className="msg-icon" />
                No NAV data found on or before this date. Try an earlier start date.
            </span>
        );

        if (navError === 'FETCH_ERROR') return (
            <span className="nav-error-msg">
                <FiAlertCircle className="msg-icon" />
                Failed to fetch NAV. Check your connection and try again.
            </span>
        );

        if (isNavOutdated) return (
            <span className="nav-warning-msg">
                <FiAlertTriangle className="msg-icon" />
                Fund may be inactive — latest NAV is from {latestNavInfo.date}.
            </span>
        );

        if (isNavValid && latestNavInfo.date) return (
            <span className="nav-metadata">
                NAV on {navDate || formData.startDate}: ₹{formData.nav}
                &nbsp;·&nbsp;Last updated: {latestNavInfo.date}
            </span>
        );

        return null;
    };

    // ─────────────────────────────────────────────────────────────────────
    // 8. RENDER
    // ─────────────────────────────────────────────────────────────────────
    return (
        <div className="add-investment-container">

            {/* Toast */}

            <header className="page-header">
                <h1>Add Investment</h1>
                <p>Track a new mutual fund SIP or lump-sum investment</p>
            </header>

            <div className="add-investment-layout">

                {/* ── FORM ────────────────────────────────────────────── */}
                <div className="form-section">
                    <div className="premium-card">

                        {status.success ? (
                            <div className="success-state">
                                <FiCheckCircle className="success-icon slide-up-anim" />
                                <h3>Investment Added Successfully!</h3>
                                <p>Your portfolio has been updated. Redirecting…</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="investment-form fade-in-anim">

                                {status.error && (
                                    <div className="error-message">{status.error}</div>
                                )}

                                {fundsError && (
                                    <div className="error-message">{fundsError}</div>
                                )}

                                {/* ── Type Tabs ── */}
                                <div className="tab-group">
                                    {['SIP', 'Lumpsum'].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            className={`tab-btn ${type === t ? 'active' : ''}`}
                                            onClick={() => setType(t)}
                                        >{t}</button>
                                    ))}
                                </div>

                                {/* ── Fund Search ── */}
                                <div className="form-group dropdown-container" ref={suggestionRef}>
                                    <label>
                                        Fund Name
                                        <FiInfo className="info-icon" title="Search from full AMFI fund list" />
                                    </label>
                                    <div className="input-wrapper">
                                        <FiSearch className="input-icon" />
                                        <input
                                            id="fundName"
                                            type="text"
                                            name="fundName"
                                            placeholder={
                                                loadingFunds
                                                    ? 'Loading fund list…'
                                                    : fundsError
                                                        ? 'Fund list unavailable'
                                                        : `Search from ${allFunds.length.toLocaleString()} funds…`
                                            }
                                            value={formData.fundName}
                                            onChange={handleChange}
                                            onFocus={() => setShowSuggestions(true)}
                                            autoComplete="off"
                                            required
                                            disabled={loadingFunds || !!fundsError}
                                        />
                                        {loadingFunds && <div className="inline-spinner" />}

                                        {/* Dropdown */}
                                        {showSuggestions && !loadingFunds && (
                                            <div 
                                                className="suggestions-dropdown nice-scroll"
                                                onScroll={(e) => {
                                                    const { scrollTop, scrollHeight, clientHeight } = e.target;
                                                    if (scrollHeight - scrollTop <= clientHeight + 100) {
                                                        // Load 100 more automatically when reaching bottom
                                                        setVisibleLimit(prev => Math.min(prev + 100, filteredFunds.length));
                                                    }
                                                }}
                                            >
                                                {filteredFunds.length > 0 ? (
                                                    <ul className="dropdown-list">
                                                        {filteredFunds.slice(0, visibleLimit).map(fund => (
                                                            <li
                                                                key={fund.code}
                                                                onMouseDown={() => handleSelectFund(fund)}
                                                            >
                                                                <div className="fund-item-details">
                                                                    <strong className="fund-name-text">
                                                                        {fund.name}
                                                                    </strong>
                                                                    <span className="fund-code-badge">
                                                                        #{fund.code}
                                                                    </span>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <div className="no-suggestions">
                                                        No funds matched "{formData.fundName}"
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ── Amount + NAV Row ── */}
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>
                                            Amount ({currencySymbols[currency] || "$"})
                                        </label>

                                        <div className="input-wrapper">
                                            <CurrencyIcon className="input-icon" />

                                            <span className="currency-prefix">{currencySymbols[currency] || '₹'}</span>
                                            <input
                                                id="amount"
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

                                    <div className="form-group">
                                        <label>NAV at Purchase Date</label>
                                        <div className="input-wrapper">
                                            <FiTrendingUp className="input-icon" />
                                            <input
                                                id="nav"
                                                type="text"
                                                name="nav"
                                                className={[
                                                    'readonly-input',
                                                    isNavFetching      ? 'nav-fetching' : '',
                                                    isNavUnavail       ? 'nav-error'    : '',
                                                    isNavOutdated && !isNavUnavail ? 'nav-outdated' : ''
                                                ].join(' ')}
                                                value={
                                                    isNavFetching ? 'Fetching…'
                                                    : isNavUnavail ? ''
                                                    : formData.nav
                                                }
                                                readOnly
                                                required
                                                placeholder={isNavFetching ? 'Fetching…' : '—'}
                                            />
                                            {isNavFetching && <div className="inline-spinner" />}
                                        </div>
                                        <NavStatusMessage />
                                    </div>
                                </div>

                                {/* ── SIP Frequency ── */}
                                {type === 'SIP' && (
                                    <div className="form-group">
                                        <label>SIP Frequency</label>
                                        <div className="input-wrapper">
                                            <select
                                                id="frequency"
                                                name="frequency"
                                                value={formData.frequency}
                                                onChange={handleChange}
                                                className="styled-select"
                                            >
                                                {['Weekly', 'Monthly', 'Quarterly', 'Yearly'].map(f => (
                                                    <option key={f} value={f}>{f}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* ── Start + End Date Row ── */}
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>
                                            {type === 'SIP' ? 'SIP Start Date' : 'Purchase Date'}
                                        </label>
                                        <div className="input-wrapper">
                                            <FiCalendar className="input-icon" />
                                            <input
                                                id="startDate"
                                                type="date"
                                                name="startDate"
                                                value={formData.startDate}
                                                onChange={handleChange}
                                                max={TODAY}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>
                                            {type === 'SIP' ? 'SIP End Date' : 'Sale/End Date'} 
                                            <span className="optional-tag">(optional)</span>
                                        </label>
                                        <div className="input-wrapper">
                                            <FiCalendar className="input-icon" />
                                            <input
                                                id="endDate"
                                                type="date"
                                                name="endDate"
                                                value={formData.endDate}
                                                onChange={handleChange}
                                                min={formData.startDate}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* ── Actions ── */}
                                <div className="form-actions">
                                    <button
                                        type="button"
                                        className="btn-cancel"
                                        onClick={onBackToDashboard}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        id="submit-investment"
                                        type="submit"
                                        className={`btn-submit ${!canSubmit ? 'disabled' : ''}`}
                                        disabled={!canSubmit}
                                        title={!canSubmit && isNavUnavail ? 'NAV unavailable — cannot save' : ''}
                                    >
                                        {status.loading ? 'Saving…' : 'Save Investment'}
                                    </button>
                                </div>

                            </form>
                        )}
                    </div>
                </div>

                {/* ── SUMMARY PANEL ────────────────────────────────────── */}
                <div className="summary-section">
                    <div className="summary-card">
                        <h3>Investment Summary</h3>
                        <div className="summary-list">

                            <div className="summary-row">
                                <span>Type</span>
                                <strong>{type}</strong>
                            </div>

                            <div className="summary-row">
                                <span>Fund</span>
                                <strong className="fund-name-clamp" title={formData.fundName}>
                                    {formData.fundName || '—'}
                                </strong>
                            </div>

                            {formData.fund_id && (
                                <div className="summary-row">
                                    <span>Scheme Code</span>
                                    <strong className="code-mono">#{formData.fund_id}</strong>
                                </div>
                            )}

                            {type === 'SIP' && (
                                <div className="summary-row">
                                    <span>Frequency</span>
                                    <strong>{formData.frequency}</strong>
                                </div>
                            )}

                            <div className="summary-row">
                                <span>Amount</span>
                                <strong>{formData.amount ? formatCurrency(formData.amount) : '—'}</strong>
                            </div>

                            <div className="summary-row">
                                <span>NAV (at Purchase)</span>
                                <strong>
                                    {isNavFetching ? (
                                        <span className="fetching-text">Fetching…</span>
                                    ) : isNavValid ? (
                                        `${currencySymbols[currency] || '₹'}${parseFloat(formData.nav).toFixed(4)}`
                                    ) : '—'}
                                </strong>
                            </div>

                            {latestNavInfo.nav && !isNavUnavail && (
                                <div className="summary-row">
                                    <span>Latest Market NAV</span>
                                    <strong className="green">
                                        {currencySymbols[currency] || '₹'}{parseFloat(latestNavInfo.nav).toFixed(4)}
                                        <span className="nav-date-sub"> ({latestNavInfo.date})</span>
                                    </strong>
                                </div>
                            )}

                            {/* Highlight Panels */}
                            <div className="highlight-panel units">
                                <span className="label">Expected Units</span>
                                <span className="value">{units}</span>
                            </div>

                            <div className="highlight-panel value">
                                <span className="label">
                                    {type === 'SIP' ? 'Per Instalment' : 'Total Value'}
                                </span>
                                <span className="value">
                                    {formData.amount ? formatCurrency(formData.amount) : '—'}
                                    {type === 'SIP' ? ` / ${formData.frequency.toLowerCase()}` : ''}
                                </span>
                            </div>

                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
