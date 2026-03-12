import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    FiDollarSign, FiCalendar, FiActivity, FiTag, FiCheckCircle, 
    FiLayers, FiSmartphone, FiShield, FiTarget, FiPercent, FiClock, FiFileText, FiInfo
} from 'react-icons/fi';
import '../styles/AddInvestment.css';

// Mock Dataset based on the user's provided fund list
// We'll fetch these from the backend now
// const [MOCK_FUNDS, setMockFunds] = useState([]); // REMOVED from here

export default function AddInvestment({ user, onBackToDashboard }) {
    const [MOCK_FUNDS, setMockFunds] = useState([]);
    const [loadingFunds, setLoadingFunds] = useState(false);
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
    const [loadingNav, setLoadingNav] = useState(false);
    const suggestionRef = useRef(null);

    // Fetch fund list on mount
    useEffect(() => {
        const fetchFundList = async () => {
            setLoadingFunds(true);
            try {
                const response = await axios.get('http://localhost:8088/api/mf/list');
                // The API returns {schemeCode: X, schemeName: Y}
                const formatted = response.data.map(f => ({
                    code: (f.schemeCode || f.scheme_code || "").toString(),
                    name: f.schemeName || f.scheme_name || "Unknown Fund",
                    nav: 0 // Will fetch later
                }));
                setMockFunds(formatted);
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (name === "fundName") {
            setShowSuggestions(true);
        }
    };

    // Reactive filtering: update filteredFunds whenever MOCK_FUNDS or the input changes
    useEffect(() => {
        const searchVal = formData.fundName.trim().toLowerCase();
        const results = MOCK_FUNDS.filter(fund => 
            (fund.name && fund.name.toLowerCase().includes(searchVal)) || 
            (fund.code && fund.code.includes(searchVal))
        ).slice(0, 300); // More results
        setFilteredFunds(results);
    }, [formData.fundName, MOCK_FUNDS]);

    const handleFocus = () => {
        setShowSuggestions(true);
    };

    const handleSelectFund = async (fund) => {
        setLoadingNav(true);
        setFormData({
            ...formData,
            fundName: fund.name,
            fund_id: fund.code,
            nav: "" // Clear while loading
        });
        setShowSuggestions(false);
        
        try {
            const response = await axios.get(`http://localhost:8088/api/mf/${fund.code}`);
            // MF API Response structure: { meta: {}, data: [{date: X, nav: Y}, ...] }
            if (response.data && response.data.data && response.data.data.length > 0) {
                const latestNav = response.data.data[0].nav;
                setFormData(prev => ({
                    ...prev,
                    fundName: fund.name,
                    fund_id: fund.code,
                    nav: latestNav.toString()
                }));
            }
        } catch (err) {
            console.error("Failed to fetch NAV", err);
            setFormData(prev => ({ ...prev, nav: "0.00" }));
        } finally {
            setLoadingNav(false);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val || 0);
    };

    const units = (formData.amount > 0 && formData.nav > 0) 
        ? (parseFloat(formData.amount) / parseFloat(formData.nav)).toFixed(4) 
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
                                            {loadingFunds ? (
                                                <li className="no-suggestions">Searching all funds...</li>
                                            ) : filteredFunds.length > 0 ? (
                                                filteredFunds.map((fund) => (
                                                    <li key={fund.code} onClick={() => handleSelectFund(fund)}>
                                                        <strong>{fund.code}</strong> - {fund.name}
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="no-suggestions">
                                                    {formData.fundName.length > 0 ? "No matching funds found" : "Click or type to search all funds"}
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
                                            type="number"
                                            name="nav"
                                            placeholder={loadingNav ? "Fetching..." : "52.4"}
                                            value={formData.nav}
                                            onChange={handleChange}
                                            required
                                            step="0.01"
                                            disabled={loadingNav}
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
