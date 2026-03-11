import React, { useState } from 'react';
import axios from 'axios';
import { FiDollarSign, FiCalendar, FiActivity, FiTag, FiCheckCircle } from 'react-icons/fi';
import '../styles/AddInvestment.css';

export default function AddInvestment({ user, onBackToDashboard }) {
    const [type, setType] = useState('SIP');
    const [formData, setFormData] = useState({
        fundName: '',
        nav: '',
        amount: '',
        frequency: 'Monthly',
        startDate: ''
    });
    const [status, setStatus] = useState({ loading: false, success: false, error: '' });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ loading: true, success: false, error: '' });

        const payload = {
            userId: user?.id || 1,
            fund_id: Math.floor(Math.random() * 1000) + 1,
            investment_type: type,
            amount: parseFloat(formData.amount),
            nav_at_buy: parseFloat(formData.nav),
            units: parseFloat(formData.amount) / parseFloat(formData.nav || 1),
            buy_date: formData.startDate,
            frequency: type === 'SIP' ? formData.frequency : null
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
            <div className="add-investment-card">
                <h2>Add New Investment</h2>
                <p className="subtitle">Enter the details of your mutual fund or stock investment</p>

                {status.success ? (
                    <div className="success-state">
                        <FiCheckCircle className="success-icon" />
                        <h3>Investment Added Successfully!</h3>
                        <p>Your portfolio has been updated. Redirecting...</p>
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

                        <div className="form-group">
                            <label>Fund/Asset Name</label>
                            <div className="input-wrapper">
                                <FiTag className="input-icon" />
                                <input
                                    type="text"
                                    name="fundName"
                                    placeholder="e.g. HDFC Index Fund"
                                    value={formData.fundName}
                                    onChange={handleChange}
                                    required
                                />
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
                                        min="100"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>NAV at Buy</label>
                                <div className="input-wrapper">
                                    <FiActivity className="input-icon" />
                                    <input
                                        type="number"
                                        name="nav"
                                        placeholder="52.4"
                                        value={formData.nav}
                                        onChange={handleChange}
                                        required
                                        step="0.01"
                                    />
                                </div>
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

                        <div className="form-actions">
                            <button type="button" className="btn-cancel" onClick={onBackToDashboard}>Cancel</button>
                            <button type="submit" className="btn-submit" disabled={status.loading}>
                                {status.loading ? 'Processing...' : 'Save Investment'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
