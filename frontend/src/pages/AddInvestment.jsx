import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    FiDollarSign, FiCalendar, FiActivity, FiTag, FiCheckCircle,
    FiLayers, FiSmartphone, FiShield, FiTarget, FiPercent, FiClock, FiFileText, FiInfo
} from 'react-icons/fi';
import '../styles/AddInvestment.css';

const PRIORITY_FUNDS = [
    { code: "125497", name: "HDFC Top 100 Fund - Direct Plan - Growth", nav: 0 },
    { code: "118834", name: "SBI Bluechip Fund - Direct Plan - Growth", nav: 0 },
    { code: "118825", name: "Mirae Asset Large Cap Fund - Direct Plan - Growth", nav: 0 },
    { code: "120465", name: "Axis Bluechip Fund - Direct Plan - Growth", nav: 0 },
    { code: "120716", name: "ICICI Prudential Bluechip Fund - Direct Plan - Growth", nav: 0 },
    { code: "122639", name: "Parag Parikh Flexi Cap Fund - Direct Plan - Growth", nav: 0 },
    { code: "120468", name: "UTI Flexi Cap Fund - Direct Plan - Growth", nav: 0 },
    { code: "120199", name: "Aditya Birla Sun Life Frontline Equity Fund - Direct Plan - Growth", nav: 0 },
    { code: "125354", name: "SBI Small Cap Fund - Direct Plan - Growth", nav: 0 },
    { code: "120847", name: "Quant Small Cap Fund - Direct Plan - Growth", nav: 0 },
    { code: "120822", name: "HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth", nav: 0 },
    { code: "130321", name: "Kotak Emerging Equity Fund - Direct Plan - Growth", nav: 0 },
    { code: "129457", name: "ICICI Prudential Flexi Cap Fund - Direct Plan - Growth", nav: 0 },
    { code: "130115", name: "Axis Flexi Cap Fund - Direct Plan - Growth", nav: 0 },
    { code: "128051", name: "HDFC Flexi Cap Fund - Direct Plan - Growth", nav: 0 },
    { code: "132010", name: "DSP Flexi Cap Fund - Direct Plan - Growth", nav: 0 },
    { code: "130323", name: "Kotak Equity Opportunities Fund - Direct Plan - Growth", nav: 0 },
    { code: "131201", name: "SBI Focused Equity Fund - Direct Plan - Growth", nav: 0 },
    { code: "130112", name: "Axis Focused 25 Fund - Direct Plan - Growth", nav: 0 },
    { code: "130114", name: "Axis Small Cap Fund - Direct Plan - Growth", nav: 0 },
    { code: "100148", name: "Franklin India Prima Fund - Growth", nav: 0 },
    { code: "100251", name: "Franklin India Bluechip Fund - Growth", nav: 0 },
    { code: "100305", name: "Franklin India Taxshield - Growth", nav: 0 },
    { code: "131203", name: "SBI Contra Fund - Direct Plan - Growth", nav: 0 },
    { code: "131202", name: "SBI Magnum Midcap Fund - Direct Plan - Growth", nav: 0 },
    { code: "131205", name: "SBI Long Term Equity Fund - Direct Plan - Growth", nav: 0 },
    { code: "132011", name: "DSP Small Cap Fund - Direct Plan - Growth", nav: 0 },
    { code: "132012", name: "DSP Equity Opportunities Fund - Direct Plan - Growth", nav: 0 },
    { code: "132013", name: "DSP Tax Saver Fund - Direct Plan - Growth", nav: 0 },
    { code: "129456", name: "ICICI Prudential Value Discovery Fund - Direct Plan - Growth", nav: 0 },
    { code: "128052", name: "HDFC Balanced Advantage Fund - Direct Plan - Growth", nav: 0 },
    { code: "128053", name: "HDFC Hybrid Equity Fund - Direct Plan - Growth", nav: 0 },
    { code: "128054", name: "HDFC Large and Mid Cap Fund - Direct Plan - Growth", nav: 0 },
    { code: "128055", name: "HDFC Small Cap Fund - Direct Plan - Growth", nav: 0 },
    { code: "127042", name: "DSP Midcap Fund - Direct Plan - Growth", nav: 0 },
    { code: "126503", name: "Axis Midcap Fund - Direct Plan - Growth", nav: 0 },
    { code: "130322", name: "Kotak Small Cap Fund - Direct Plan - Growth", nav: 0 },
    { code: "130324", name: "Kotak Bluechip Fund - Direct Plan - Growth", nav: 0 },
    { code: "119551", name: "Tata Digital India Fund - Direct Plan - Growth", nav: 0 },
    { code: "120318", name: "Kotak Flexicap Fund - Direct Plan - Growth", nav: 0 }
];

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

    // Autocomplete Search States
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredFunds, setFilteredFunds] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [loadingNav, setLoadingNav] = useState(false);
    const suggestionRef = useRef(null);
    const todayDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .split('T')[0];

    // Fetch fund list on mount
    useEffect(() => {
        const fetchFundList = async () => {
            setLoadingFunds(true);
            try {
                const response = await axios.get('http://localhost:8088/api/mf/list');
                const formatted = response.data.map(f => ({
                    code: (f.schemeCode || f.scheme_code || f.code || "").toString(),
                    name: f.schemeName || f.scheme_name || f.name || "Unknown Fund",
                    nav: 0
                }));

                // Keep your provided funds visible in the default top list,
                // while preserving existing API funds and structure.
                const mergedMap = new Map();
                PRIORITY_FUNDS.forEach(fund => mergedMap.set(fund.code, fund));
                formatted.forEach(fund => {
                    if (!mergedMap.has(fund.code)) {
                        mergedMap.set(fund.code, fund);
                    }
                });

                const mergedFunds = Array.from(mergedMap.values());
                setMockFunds(mergedFunds);
                setFilteredFunds(mergedFunds.slice(0, 50));
            } catch (err) {
                console.error("Failed to fetch funds", err);
            } finally {
                setLoadingFunds(false);
            }
        };
        fetchFundList();
    }, []);

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

    // Reactive filtering for the fund list
    useEffect(() => {
        if (!formData.fundName) {
            setFilteredFunds(mockFunds.slice(0, 50));
            return;
        }

        const searchTimer = setTimeout(async () => {
            const searchVal = formData.fundName.toLowerCase();
            const results = mockFunds.filter(fund =>
                fund.name.toLowerCase().includes(searchVal) ||
                fund.code.includes(searchVal)
            ).slice(0, 100);

            setFilteredFunds(results);
        }, 300);

        return () => clearTimeout(searchTimer);
    }, [formData.fundName, mockFunds]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleFocus = () => {
        setShowSuggestions(true);
    };

    const handleSelectFund = (fund) => {
        setFormData(prev => ({
            ...prev,
            fundName: fund.name,
            fund_id: fund.code,
            nav: prev.startDate ? "Fetching..." : ""
        }));
        setShowSuggestions(false);
    };

    useEffect(() => {
        const fetchNavBySelectedDate = async () => {
            if (!formData.fund_id || !formData.startDate) {
                setLoadingNav(false);
                setFormData(prev => (prev.nav === "" ? prev : { ...prev, nav: "" }));
                return;
            }

            setLoadingNav(true);
            setFormData(prev => ({ ...prev, nav: "Fetching..." }));

            try {
                const token = localStorage.getItem("jwt_token");
                const response = await axios.get(`http://localhost:8088/api/nav/${formData.fund_id}`, {
                    params: { date: formData.startDate },
                    headers: { "Authorization": `Bearer ${token}` }
                });

                if (response.data && !isNaN(response.data)) {
                    setFormData(prev => ({ ...prev, nav: response.data.toString() }));
                } else {
                    setFormData(prev => ({ ...prev, nav: "0.00" }));
                }
            } catch (err) {
                console.error("Failed to fetch date-based NAV", err);
                setFormData(prev => ({ ...prev, nav: "0.00" }));
            } finally {
                setLoadingNav(false);
            }
        };

        fetchNavBySelectedDate();
    }, [formData.fund_id, formData.startDate]);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val || 0);
    };

    const isNavFetching = formData.nav === "Fetching..." || loadingNav;
    const currentNavValue = parseFloat(formData.nav);

    const units = (formData.amount > 0 && !isNaN(currentNavValue) && currentNavValue > 0)
        ? (parseFloat(formData.amount) / currentNavValue).toFixed(4)
        : "0.0000";

    const handleSubmit = async (e) => {
        e.preventDefault();
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

    return (
        <div className="add-investment-container">
            <div className="add-investment-layout">
                <div className="form-section">
                    <div className="add-investment-card">
                        {status.success ? (
                            <div className="success-state">
                                <FiCheckCircle className="success-icon" />
                                <h3>Investment Added Successfully!</h3>
                                <p>Your portfolio has been synchronized to the backend. Redirecting...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="investment-form">
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

                                <div className="form-group" ref={suggestionRef}>
                                    <label className="tooltip-label">
                                        Asset/Fund Name
                                        <span className="tooltip" title="Search funds to auto-populate NAV"><FiInfo /></span>
                                    </label>
                                    <div className="input-wrapper">
                                        <FiTag className="input-icon" />
                                        <input
                                            type="text"
                                            name="fundName"
                                            placeholder={loadingFunds ? "Loading funds..." : "Search funds e.g. 'Birla'"}
                                            value={formData.fundName}
                                            onChange={handleChange}
                                            onFocus={handleFocus}
                                            onClick={handleFocus}
                                            required
                                            autoComplete="off"
                                            disabled={loadingFunds}
                                        />
                                        {showSuggestions && (
                                            <ul className="suggestions-dropdown">
                                                {isSearching ? (
                                                    <li className="searching-indicator">Searching...</li>
                                                ) : filteredFunds.length > 0 ? (
                                                    filteredFunds.map((fund) => (
                                                        <li key={fund.code} onClick={() => handleSelectFund(fund)}>
                                                            <strong>{fund.code}</strong> - {fund.name}
                                                        </li>
                                                    ))
                                                ) : (
                                                    <li className="no-suggestions">
                                                        {formData.fundName.length > 0 ? "No matching funds found" : "Type to search all funds"}
                                                    </li>
                                                )}
                                            </ul>
                                        )}
                                    </div>
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
                                    <div className="form-group">
                                        <label>NAV / Price at Buy</label>
                                        <div className="input-wrapper">
                                            <FiActivity className="input-icon" />
                                            <input
                                                type="text"
                                                name="nav"
                                                className={isNavFetching ? "nav-fetching" : ""}
                                                value={formData.nav}
                                                onChange={handleChange}
                                                required
                                                placeholder={isNavFetching ? "Fetching..." : "52.4"}
                                                disabled={isNavFetching}
                                            />
                                        </div>
                                        <span className="helper-text auto-calc">Units: {units}</span>
                                    </div>
                                </div>

                                {type === 'SIP' && (
                                    <div className="form-group">
                                        <label>SIP Frequency</label>
                                        <select name="frequency" value={formData.frequency} onChange={handleChange} className="styled-select">
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
                                    <button type="submit" className="btn-submit" disabled={status.loading || isNavFetching}>
                                        {status.loading ? 'Saving...' : 'Save Investment'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                <div className="summary-section">
                    <div className="live-summary-card">
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
                                <span>NAV (Est.)</span>
                                <strong>{formData.nav ? `₹${formData.nav}` : '-'}</strong>
                            </div>
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
