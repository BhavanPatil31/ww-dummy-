import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    FiBriefcase, FiEye, FiEdit2, FiTrash2,
    FiTrendingUp, FiTrendingDown, FiX, FiCheckCircle,
    FiDollarSign, FiCalendar, FiTag, FiActivity, FiAlertTriangle, FiRefreshCw
} from 'react-icons/fi';
import '../styles/Portfolio.css';

const MOCK_FUNDS = [
    { code: "100027", name: "Grindlays Super Saver Income Fund-GSSIF-Half Yearly Dividend", nav: 24.50 },
    { code: "100028", name: "Grindlays Super Saver Income Fund-GSSIF-Quaterly Dividend", nav: 22.10 },
    { code: "100029", name: "Grindlays Super Saver Income Fund-GSSIF-Growth", nav: 42.10 },
    { code: "100033", name: "Aditya Birla Sun Life Large & Mid Cap Fund - Regular Growth", nav: 115.42 },
    { code: "100034", name: "Aditya Birla Sun Life Large & Mid Cap Fund - Regular - IDCW", nav: 45.60 },
    { code: "100035", name: "Birla Sun Life Freedom Fund-Plan A (Dividend)", nav: 18.90 },
    { code: "100036", name: "Birla Sun Life Freedom Fund-Plan B (Growth)", nav: 98.70 },
    { code: "100038", name: "Aditya Birla Sun Life Income Fund - Growth - Regular Plan", nav: 105.20 },
    { code: "100042", name: "Aditya Birla Sun Life Liquid Fund-Retail (Growth)", nav: 341.80 },
    { code: "100047", name: "Aditya Birla Sun Life Liquid Fund - Growth", nav: 343.10 },
    { code: "100064", name: "Aditya Birla Sun Life MNC Fund - Growth - Regular Plan", nav: 850.50 },
    { code: "100078", name: "DSP Bond Fund - Growth", nav: 78.90 },
    { code: "100081", name: "DSP Aggressive Hybrid Fund - Regular Plan - Growth", nav: 165.20 },
    { code: "500001", name: "HDFC Index Fund - Sensex Plan", nav: 564.30 },
    { code: "500002", name: "SBI Small Cap Fund - Regular Growth", nav: 142.10 }
];

export default function Portfolio({ user }) {
    const [investments, setInvestments] = useState([]);
    const [portfolioSummary, setPortfolioSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedInvestment, setSelectedInvestment] = useState(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [actionStatus, setActionStatus] = useState({ type: '', message: '' });
    const [sortConfig, setSortConfig] = useState({ key: 'buy_date', dir: 'desc' });

    const fetchInvestments = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("jwt_token");
            const userId = user?.userId || user?.id;
            let investmentsData = [];
            let portfolioData = null;

            try {
                const invRes = await axios.get(`http://localhost:8088/api/investments/user/${userId}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                investmentsData = invRes.data || [];
            } catch (e) {
                console.error("Error fetching investments", e);
            }

            try {
                const portRes = await axios.get(`http://localhost:8088/api/portfolio/user/${userId}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                portfolioData = portRes.data;
            } catch (e) {
                console.error("Error fetching portfolio summary", e);
            }

            setInvestments(investmentsData);
            setPortfolioSummary(portfolioData);
        } catch (err) {
            console.error("Error fetching data", err);
            setInvestments([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchInvestments();
    }, [user]);

    // ── Helpers ────────────────────────────────────────────────
    const formatCurrency = (val) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

    const getCurrentNav = (inv) => {
        const navAtBuy = inv.nav_at_buy || 0;
        let currentNav = inv.current_nav || 0;
        
        // If currentNav is still 0 or specifically the same as navAtBuy and we want to show growth in mock data
        // But with real API, we should trust the currentNav if it's set and non-zero
        if (!currentNav || currentNav === 0) {
            // Fallback for very old data or non-integrated funds
            const seed = (inv.id || 1) * 7919;
            const pct = 0.05 + (seed % 100) / 1000;
            currentNav = navAtBuy * (1 + pct);
        }
        return currentNav;
    };

    const getCurrentValue = (inv) => {
        const units = inv.units || 0;
        const currentNav = getCurrentNav(inv);
        if (units > 0 && currentNav > 0) return units * currentNav;
        const pct = 0.05 + ((inv.id || 1) % 10) / 100;
        return parseFloat(inv.amount || 0) * (1 + pct);
    };

    const getReturnPct = (inv) => {
        const invested = parseFloat(inv.amount || 0);
        if (!invested) return 0;
        return ((getCurrentValue(inv) - invested) / invested) * 100;
    };

    // ── Aggregates ─────────────────────────────────────────────
    const totalInvested = investments.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
    const totalCurrentValue = investments.reduce((s, i) => s + getCurrentValue(i), 0);
    const totalPnL = totalCurrentValue - totalInvested;
    const totalReturn = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    // ── Sort ───────────────────────────────────────────────────
    const sorted = [...investments].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (sortConfig.key === 'return_pct') { aVal = getReturnPct(a); bVal = getReturnPct(b); }
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortConfig.dir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.dir === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (key) => {
        setSortConfig(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
    };

    const sortIcon = (key) => {
        if (sortConfig.key !== key) return <span className="sort-icon neutral">⇅</span>;
        return <span className="sort-icon active">{sortConfig.dir === 'asc' ? '↑' : '↓'}</span>;
    };

    // ── View Details ───────────────────────────────────────────
    const openView = (inv) => { setSelectedInvestment(inv); setViewModalOpen(true); };
    const closeView = () => { setViewModalOpen(false); setSelectedInvestment(null); };

    // ── Edit ───────────────────────────────────────────────────
    const openEdit = (inv) => {
        setSelectedInvestment(inv);
        setEditForm({
            amount: inv.amount || '',
            nav_at_buy: inv.nav_at_buy || '',
            buy_date: inv.buy_date || inv.start_date || '',
            frequency: inv.frequency || 'Monthly',
            scheme_name: inv.scheme_name || ''
        });
        setEditModalOpen(true);
    };
    const closeEdit = () => { setEditModalOpen(false); setSelectedInvestment(null); setEditForm({}); };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...selectedInvestment,
            ...editForm,
            amount: parseFloat(editForm.amount),
            amount_invested: parseFloat(editForm.amount),
            nav_at_buy: parseFloat(editForm.nav_at_buy),
            units: editForm.nav_at_buy > 0 ? parseFloat(editForm.amount) / parseFloat(editForm.nav_at_buy) : selectedInvestment.units,
            buy_date: editForm.buy_date,
            start_date: editForm.buy_date // Keep start_date in sync
        };

        try {
            const token = localStorage.getItem("jwt_token");
            await axios.put(`http://localhost:8088/api/investments/${selectedInvestment.investment_id}`, payload, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            setActionStatus({ type: 'success', message: 'Investment updated successfully!' });
            closeEdit();
            fetchInvestments();
        } catch (err) {
            console.error(err);
            setActionStatus({ type: 'error', message: 'Update failed. Please try again.' });
        }
        setTimeout(() => setActionStatus({ type: '', message: '' }), 3500);
    };

    // ── Delete ─────────────────────────────────────────────────
    const openDelete = (inv) => { setDeleteTarget(inv); setDeleteConfirmOpen(true); };
    const closeDelete = () => { setDeleteTarget(null); setDeleteConfirmOpen(false); };

    const handleDelete = async () => {
        try {
            const token = localStorage.getItem("jwt_token");
            await axios.delete(`http://localhost:8088/api/investments/${deleteTarget.investment_id}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            setActionStatus({ type: 'success', message: 'Investment deleted successfully!' });
            closeDelete();
            fetchInvestments();
        } catch (err) {
            console.error("Delete failed:", err);
            const errMsg = err.response?.data?.message || err.message || 'Delete failed. Please try again.';
            setActionStatus({ type: 'error', message: errMsg });
            closeDelete();
        }
        setTimeout(() => setActionStatus({ type: '', message: '' }), 3500);
    };

    const formatDate = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const handleFullRefresh = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("jwt_token");
            const userId = user?.userId || user?.id;
            // Force backend to fetch live NAV for all funds and update DB
            await axios.post(`http://localhost:8088/api/portfolio/refresh/${userId}`, {}, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            await fetchInvestments();
            setActionStatus({ type: 'success', message: 'All investments updated with real-time NAV data!' });
        } catch (err) {
            console.error("Full refresh failed", err);
            setActionStatus({ type: 'error', message: 'Failed to fetch live data. Please check if backend is running.' });
        } finally {
            setLoading(false);
            setTimeout(() => setActionStatus({ type: '', message: '' }), 3500);
        }
    };

    // ── Render ─────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="portfolio-loading">
                <div className="loader-spinner large"></div>
                <span>Loading your portfolio...</span>
            </div>
        );
    }

    return (
        <div className="portfolio-container">

            {/* ── Toast ── */}
            {actionStatus.message && (
                <div className={`portfolio-toast ${actionStatus.type}`}>
                    {actionStatus.type === 'success' ? <FiCheckCircle /> : <FiAlertTriangle />}
                    {actionStatus.message}
                </div>
            )}

            {/* ── Page Header ── */}
            <div className="portfolio-page-header" style={{ justifyContent: 'flex-end' }}>
                <button className="btn-refresh" onClick={handleFullRefresh} disabled={loading}>
                    <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh All
                </button>
            </div>

            {/* ── Summary Cards ── */}
            <div className="portfolio-summary-grid">
                <div className="p-summary-card">
                    <span className="p-label">Total Invested</span>
                    <span className="p-value">{formatCurrency(portfolioSummary?.total_invested)}</span>
                </div>
                <div className={`p-summary-card ${(portfolioSummary?.return_percentage || 0) >= 0 ? 'highlight-green' : 'highlight-red'}`}>
                    <span className="p-label">Total Return %</span>
                    <span className={`p-value ${(portfolioSummary?.return_percentage || 0) >= 0 ? 'green' : 'red'}`}>
                        {(portfolioSummary?.return_percentage || 0) >= 0 ? '+' : ''}
                        {(portfolioSummary?.return_percentage || 0).toFixed(2)}%
                    </span>
                </div>
                <div className="p-summary-card">
                    <span className="p-label">XIRR</span>
                    <span className="p-value blue">{(portfolioSummary?.xirr || 0).toFixed(2)}%</span>
                </div>
                <div className="p-summary-card">
                    <span className="p-label">CAGR</span>
                    <span className="p-value blue">{(portfolioSummary?.cagr || 0).toFixed(2)}%</span>
                </div>
            </div>


            {/* ── Table ── */}
            {investments.length === 0 ? (
                <div className="portfolio-empty">
                    <FiBriefcase className="empty-icon" />
                    <h3>No investments found</h3>
                    <p>Add your first investment to start tracking your portfolio.</p>
                </div>
            ) : (
                <div className="portfolio-table-wrapper">
                    <table className="portfolio-table">
                        <thead>
                            <tr>
                                <th className="th-sl">Sl No.</th>
                                <th className="th-sortable" onClick={() => handleSort('investment_type')}>
                                    Investment Type {sortIcon('investment_type')}
                                </th>
                                <th className="th-sortable" onClick={() => handleSort('scheme_name')}>
                                    Fund Name {sortIcon('scheme_name')}
                                </th>
                                <th>
                                    Investment Date
                                </th>
                                <th className="th-sortable" onClick={() => handleSort('amount')}>
                                    Amount Invested {sortIcon('amount')}
                                </th>
                                <th className="th-sortable" onClick={() => handleSort('return_pct')}>
                                    Return % {sortIcon('return_pct')}
                                </th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((inv, index) => {
                                const currentVal = getCurrentValue(inv);
                                const returnPct = getReturnPct(inv);
                                const isPositive = returnPct >= 0;
                                return (
                                    <tr key={inv.investment_id || index} className="portfolio-row">
                                        <td className="td-sl">{index + 1}</td>
                                        <td className="td-fund">
                                            <span className="fund-type-badge">{inv.investment_type || 'N/A'}</span>
                                        </td>
                                        <td className="td-fund">
                                            <div className="fund-name-cell">
                                                <span className="fund-name">{inv.scheme_name || `Fund #${inv.fund_id}`}</span>
                                            </div>
                                        </td>
                                        <td className="td-date">{formatDate(inv.buy_date || inv.start_date)}</td>
                                        <td className="td-amount">{formatCurrency(inv.amount)}</td>
                                        <td className={`td-return ${isPositive ? 'positive' : 'negative'}`}>
                                            <span className="return-badge">
                                                {isPositive ? <FiTrendingUp /> : <FiTrendingDown />}
                                                {isPositive ? '+' : ''}{returnPct.toFixed(2)}%
                                            </span>
                                        </td>
                                        <td className="td-actions">
                                            <button className="table-icon-btn view" onClick={() => openView(inv)} title="View Details">
                                                <FiEye size={18} />
                                            </button>
                                            <button className="table-icon-btn edit" onClick={() => openEdit(inv)} title="Edit">
                                                <FiEdit2 size={18} />
                                            </button>
                                            <button className="table-icon-btn delete" onClick={() => openDelete(inv)} title="Delete">
                                                <FiTrash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div className="table-footer">
                        <strong>{investments.length}</strong> investment{investments.length !== 1 ? 's' : ''} in your portfolio
                    </div>
                </div>
            )}

            {/* ── View Details Modal ── */}
            {viewModalOpen && selectedInvestment && (
                <div className="modal-overlay" onClick={closeView}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3><FiEye /> Investment Details</h3>
                            <button className="modal-close" onClick={closeView}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-badge-row">
                                <span className="fund-type-badge large">{selectedInvestment.investment_type}</span>
                                <span className={`return-badge large ${getReturnPct(selectedInvestment) >= 0 ? 'positive' : 'negative'}`}>
                                    {getReturnPct(selectedInvestment) >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                                    {getReturnPct(selectedInvestment) >= 0 ? '+' : ''}{getReturnPct(selectedInvestment).toFixed(2)}%
                                </span>
                            </div>
                            <h4 className="detail-fund-name">{selectedInvestment.scheme_name || `Fund #${selectedInvestment.fund_id}`}</h4>

                            <div className="detail-grid">
                                <div className="detail-item">
                                    <span className="detail-label"><FiTag /> Fund ID</span>
                                    <span className="detail-value">{selectedInvestment.fund_id || '—'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label"><FiCalendar /> Buy Date</span>
                                    <span className="detail-value">{formatDate(selectedInvestment.buy_date || selectedInvestment.start_date)}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label"><FiDollarSign /> Amount Invested</span>
                                    <span className="detail-value">{formatCurrency(selectedInvestment.amount)}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label"><FiActivity /> NAV at Buy</span>
                                    <span className="detail-value">₹{parseFloat(selectedInvestment.nav_at_buy || 0).toFixed(2)}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label"><FiActivity /> Units Held</span>
                                    <span className="detail-value">{parseFloat(selectedInvestment.units || 0).toFixed(4)}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label"><FiActivity /> Current NAV (Est.)</span>
                                    <span className="detail-value">₹{getCurrentNav(selectedInvestment).toFixed(2)}</span>
                                </div>
                                {selectedInvestment.frequency && (
                                    <div className="detail-item">
                                        <span className="detail-label"><FiRefreshCw /> SIP Frequency</span>
                                        <span className="detail-value">{selectedInvestment.frequency}</span>
                                    </div>
                                )}
                            </div>

                            <div className="detail-highlight-row">
                                <div className={`detail-highlight ${getReturnPct(selectedInvestment) >= 0 ? 'green' : 'red'}`}>
                                    <span>Profit / Loss</span>
                                    <strong>
                                        {getReturnPct(selectedInvestment) >= 0 ? '+' : ''}
                                        {formatCurrency(getCurrentValue(selectedInvestment) - parseFloat(selectedInvestment.amount || 0))}
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Modal ── */}
            {editModalOpen && selectedInvestment && (
                <div className="modal-overlay" onClick={closeEdit}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3><FiEdit2 /> Edit Investment</h3>
                            <button className="modal-close" onClick={closeEdit}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <p className="modal-subtitle">{selectedInvestment.scheme_name || `Fund #${selectedInvestment.fund_id}`}</p>
                            <form onSubmit={handleEditSubmit} className="edit-form">
                                <div className="form-group">
                                    <label>Fund / Scheme Name</label>
                                    <div className="input-wrapper">
                                        <FiTag className="input-icon" />
                                        <input
                                            type="text"
                                            value={editForm.scheme_name}
                                            onChange={(e) => setEditForm({ ...editForm, scheme_name: e.target.value })}
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
                                                value={editForm.amount}
                                                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                                                required min="1" step="any"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>NAV at Buy</label>
                                        <div className="input-wrapper">
                                            <FiActivity className="input-icon" />
                                            <input
                                                type="number"
                                                value={editForm.nav_at_buy}
                                                onChange={(e) => setEditForm({ ...editForm, nav_at_buy: e.target.value })}
                                                required step="0.01"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Buy Date</label>
                                        <div className="input-wrapper">
                                            <FiCalendar className="input-icon" />
                                            <input
                                                type="date"
                                                value={editForm.buy_date}
                                                onChange={(e) => setEditForm({ ...editForm, buy_date: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    {selectedInvestment.investment_type === 'SIP' && (
                                        <div className="form-group">
                                            <label>SIP Frequency</label>
                                            <select
                                                className="styled-select"
                                                value={editForm.frequency}
                                                onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value })}
                                            >
                                                <option value="Weekly">Weekly</option>
                                                <option value="Monthly">Monthly</option>
                                                <option value="Quarterly">Quarterly</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="btn-cancel" onClick={closeEdit}>Cancel</button>
                                    <button type="submit" className="btn-submit">Save Changes</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirm Modal ── */}
            {deleteConfirmOpen && deleteTarget && (
                <div className="modal-overlay" onClick={closeDelete}>
                    <div className="modal-card modal-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header danger">
                            <h3><FiAlertTriangle /> Confirm Delete</h3>
                            <button className="modal-close" onClick={closeDelete}><FiX /></button>
                        </div>
                        <div className="modal-body center">
                            <FiTrash2 className="delete-icon-large" />
                            <p>Are you sure you want to remove</p>
                            <strong className="delete-fund-name">{deleteTarget.scheme_name || `Fund #${deleteTarget.fund_id}`}</strong>
                            <p className="delete-warn">This action cannot be undone.</p>
                            <div className="form-actions">
                                <button className="btn-cancel" onClick={closeDelete}>Cancel</button>
                                <button className="btn-delete" onClick={handleDelete}>
                                    <FiTrash2 /> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
