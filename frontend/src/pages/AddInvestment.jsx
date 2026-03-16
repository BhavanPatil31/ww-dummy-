import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    FiDollarSign, FiCalendar, FiActivity, FiTag, FiCheckCircle, 
    FiLayers, FiSmartphone, FiShield, FiTarget, FiPercent, FiClock, FiFileText, FiInfo
} from 'react-icons/fi';
import '../styles/AddInvestment.css';

// Mock Dataset based on the user's provided fund list
const MOCK_FUNDS = [
    { code: "100027", name: "Grindlays Super Saver Income Fund-GSSIF-Half Yearly Dividend", nav: 24.50 },
    { code: "100028", name: "Grindlays Super Saver Income Fund-GSSIF-Quaterly Dividend", nav: 22.10 },
    { code: "100029", name: "Grindlays Super Saver Income Fund-GSSIF-Growth", nav: 42.10 },
    { code: "100033", name: "Aditya Birla Sun Life Large & Mid Cap Fund - Regular Growth", nav: 868.79 },
    { code: "100034", name: "Aditya Birla Sun Life Large & Mid Cap Fund - Regular - IDCW", nav: 45.60 },
    { code: "100035", name: "Birla Sun Life Freedom Fund-Plan A (Dividend)", nav: 18.90 },
    { code: "100036", name: "Birla Sun Life Freedom Fund-Plan B (Growth)", nav: 98.70 },
    { code: "100038", name: "Aditya Birla Sun Life Income Fund - Growth - Regular Plan", nav: 105.20 },
    { code: "100042", name: "Aditya Birla Sun Life Liquid Fund-Retail (Growth)", nav: 341.80 },
    { code: "100043", name: "Aditya Birla Sun Life Liquid Fund-Institutional (Growth)", nav: 341.60 },
    { code: "100047", name: "Aditya Birla Sun Life Liquid Fund - Growth", nav: 343.10 },
    { code: "100055", name: "Aditya Birla Sun Life Gilt Plus - Liquid Plan - Growth", nav: 15.20 },
    { code: "100058", name: "Aditya Birla Sun Life Government Securities Fund - Growth - Regular Plan", nav: 112.50 },
    { code: "100061", name: "Aditya Birla Sun Life Constant Maturity 10 Year Gilt Fund - Growth", nav: 140.20 },
    { code: "100064", name: "Aditya Birla Sun Life MNC Fund - Growth - Regular Plan", nav: 850.50 },
    { code: "100066", name: "Aditya Birla Sun Life India Opportunities Fund - Growth", nav: 150.70 },
    { code: "100069", name: "BARODA PIONEER DIVERSIFIED FUND", nav: 56.40 },
    { code: "100078", name: "DSP Bond Fund - Growth", nav: 78.90 },
    { code: "100081", name: "DSP Aggressive Hybrid Fund - Regular Plan - Growth", nav: 165.20 },
    { code: "100084", name: "DSP Gilt Fund - Regular Plan - Growth", nav: 45.10 },
    { code: "100087", name: "DSP Savings Fund - Regular Plan - Growth", nav: 89.90 },
    // A couple extra general ones for testing
    { code: "500001", name: "HDFC Index Fund - Sensex Plan", nav: 564.30 },
    { code: "500002", name: "SBI Small Cap Fund - Regular Growth", nav: 142.10 }
];

export default function AddInvestment({ user, onBackToDashboard }) {
    const [type, setType] = useState('SIP');
    const [formData, setFormData] = useState({
        fundName: '',
        fund_id: '',
        nav: '',
        amount: '',
        frequency: 'Monthly',
        startDate: ''
    });
    const [status, setStatus] = useState({ loading: false, success: false, error: '' });
    
    // Autocomplete Search States
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredFunds, setFilteredFunds] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const suggestionRef = useRef(null);

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

    // Debounced fund search
    useEffect(() => {
        const searchTimer = setTimeout(async () => {
            if (formData.fundName.length >= 3) {
                setIsSearching(true);
                try {
                    const token = localStorage.getItem("jwt_token");
                    const res = await axios.get(`http://localhost:8088/api/nav/search?q=${formData.fundName}`, {
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    // mfapi returns list of objects with schemeCode and schemeName
                    const suggestions = (res.data || []).map(item => ({
                        code: item.schemeCode.toString(),
                        name: item.schemeName,
                        nav: 0 // Will fetch actual NAV on selection
                    }));
                    setFilteredFunds(suggestions);
                    setShowSuggestions(suggestions.length > 0);
                } catch (err) {
                    console.error("Search failed", err);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setFilteredFunds([]);
                setShowSuggestions(false);
            }
        }, 500);

        return () => clearTimeout(searchTimer);
    }, [formData.fundName]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // Handle Fund Search Logic
        if (name === "fundName") {
            if (value.length > 0) {
                const results = MOCK_FUNDS.filter(fund => 
                    fund.name.toLowerCase().includes(value.toLowerCase()) || 
                    fund.code.includes(value)
                );
                setFilteredFunds(results);
            } else {
                // When field is cleared, show all funds
                setFilteredFunds(MOCK_FUNDS);
            }
            setShowSuggestions(true);
        }
    };

    const handleFundFocus = () => {
        // Show all funds immediately on click/focus
        const currentValue = formData.fundName;
        if (currentValue.length > 0) {
            const results = MOCK_FUNDS.filter(fund =>
                fund.name.toLowerCase().includes(currentValue.toLowerCase()) ||
                fund.code.includes(currentValue)
            );
            setFilteredFunds(results);
        } else {
            setFilteredFunds(MOCK_FUNDS);
        }
        setShowSuggestions(true);
    };

    const handleSelectFund = async (fund) => {
        // Clear previous NAV and show loading feedback
        setFormData(prev => ({
            ...prev,
            fundName: fund.name,
            fund_id: fund.code,
            nav: "Fetching..." // Visual indicator that live data is being retrieved
        }));
        setShowSuggestions(false);

        // Fetch live NAV from backend
        try {
            const token = localStorage.getItem("jwt_token");
            console.log(`Fetching live NAV for fund code: ${fund.code}`);
            const response = await axios.get(`http://localhost:8088/api/nav/${fund.code}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            
            if (response.data && !isNaN(response.data)) {
                console.log(`Successfully fetched NAV: ${response.data}`);
                setFormData(prev => ({
                    ...prev,
                    nav: response.data.toString()
                }));
            } else {
                console.warn("Got unexpected NAV response, falling back to mock value");
                setFormData(prev => ({
                    ...prev,
                    nav: fund.nav.toString()
                }));
            }
        } catch (error) {
            console.error("Failed to fetch live NAV from backend:", error);
            // Revert to mock value on failure
            setFormData(prev => ({
                ...prev,
                nav: fund.nav.toString()
            }));
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val || 0);
    };

    const isNavFetching = formData.nav === "Fetching...";
    const currentNavValue = parseFloat(formData.nav);
    
    const units = (formData.amount > 0 && !isNaN(currentNavValue) && currentNavValue > 0) 
        ? (parseFloat(formData.amount) / currentNavValue).toFixed(4) 
        : "0.0000";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ loading: true, success: false, error: '' });

        const payload = {
            userId: user?.id,
            user_id: user?.id, // Added to ensure Spring Boot Jackson DB binding
            fund_id: parseInt(formData.fund_id) || Math.floor(Math.random() * 1000) + 1,
            investment_type: type,
            amount: parseFloat(formData.amount),
            nav_at_buy: parseFloat(formData.nav),
            units: parseFloat(units),
            buy_date: formData.startDate,
            frequency: type === 'SIP' ? formData.frequency : null,
            asset_category: type, // Provide basic fallback
            // Bridge map fields for DB compatibility
            scheme_name: formData.fundName,
            amount_invested: parseFloat(formData.amount),
            current_nav: parseFloat(formData.nav),
            start_date: formData.startDate
        };

        try {
            const token = localStorage.getItem("jwt_token");
            await axios.post('http://localhost:8088/api/investments/add', payload, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
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
                        <h2>Add New Investment</h2>
                        <p className="subtitle">Search & log your mutual fund or stock investment</p>

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
                                >
                                    SIP
                                </button>
                                <button
                                    type="button"
                                    className={`toggle-btn ${type === 'Lumpsum' ? 'active' : ''}`}
                                    onClick={() => setType('Lumpsum')}
                                >
                                    Lumpsum
                                </button>
                            </div>

                            {/* Autocomplete Search Field */}
                            <div className="form-group" ref={suggestionRef}>
                                <label className="tooltip-label">
                                    Asset/Fund Name
                                    <span className="tooltip" title="Search over standard fund codes to auto-populate NAV"><FiInfo /></span>
                                </label>
                                <div className="input-wrapper">
                                    <FiTag className="input-icon" />
                                    <input
                                        type="text"
                                        name="fundName"
                                        placeholder="Click to browse or type to search funds"
                                        value={formData.fundName}
                                        onChange={handleChange}
                                        onFocus={handleFundFocus}
                                        required
                                        autoComplete="off"
                                    />
                                    {showSuggestions && (
                                        <ul className="suggestions-dropdown">
                                            {isSearching ? (
                                                <li className="searching-indicator">Searching funds...</li>
                                            ) : (
                                                filteredFunds.map((fund) => (
                                                    <li key={fund.code} onClick={() => handleSelectFund(fund)}>
                                                        <strong>{fund.code}</strong> - {fund.name}
                                                    </li>
                                                ))
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
                                            placeholder="52.4"
                                            className={isNavFetching ? "nav-fetching" : ""}
                                            value={formData.nav}
                                            onChange={handleChange}
                                            required
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
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn-cancel" onClick={onBackToDashboard}>Cancel</button>
                                <button type="submit" className="btn-submit" disabled={status.loading}>
                                    {status.loading ? 'Saving...' : 'Save Investment'}
                                </button>
                            </div>
                        </form>
                    )}
                    </div>
                </div>

                {/* Investment Summary Section */}
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
                                <strong>{formData.fundName ? (formData.fundName.length > 25 ? formData.fundName.substring(0, 25) + '...' : formData.fundName) : '-'}</strong>
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
                            
                            {type === 'SIP' ? (
                                <div className="summary-item highlight-box-secondary">
                                    <span>Installment</span>
                                    <strong>{formatCurrency(formData.amount)} / {formData.frequency.toLowerCase()}</strong>
                                </div>
                            ) : (
                                <div className="summary-item highlight-box-secondary">
                                    <span>Total Value</span>
                                    <strong>{formatCurrency(formData.amount)}</strong>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
