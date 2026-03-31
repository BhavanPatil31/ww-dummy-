import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    FiBriefcase, FiEye, FiEdit2, FiTrash2,
    FiTrendingUp, FiTrendingDown, FiX, FiCheckCircle,
    FiDollarSign, FiCalendar, FiTag, FiActivity, FiAlertTriangle, FiRefreshCw
} from 'react-icons/fi';
import {
    ComposedChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend,
    AreaChart, Area, BarChart
} from 'recharts';
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
    const [sellModalOpen, setSellModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [sellForm, setSellForm] = useState({ sell_date: '', sellNav: '' });
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
                investmentsData = (invRes.data || []).filter(inv => !inv.end_date && inv.status !== 'SOLD');
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

    // ── Chart Data (P&L per investment, trading-bar style) ─────
    const generateChartData = () => {
        if (!investments.length) return [];
        const sorted = [...investments].sort((a, b) => {
            const d1 = new Date(a.buy_date || a.start_date || 0);
            const d2 = new Date(b.buy_date || b.start_date || 0);
            return (isNaN(d1) ? 0 : d1.getTime()) - (isNaN(d2) ? 0 : d2.getTime());
        });
        return sorted.map(inv => {
            const invested = parseFloat(inv.amount || 0);
            const current = getCurrentValue(inv);
            const pnl = parseFloat((current - invested).toFixed(0));
            const pct = invested > 0 ? ((current - invested) / invested * 100).toFixed(1) : '0.0';
            const label = (inv.scheme_name || `Fund #${inv.fund_id}` || '?').slice(0, 10);
            return { name: label, pnl, pct: parseFloat(pct), invested, current, fullName: inv.scheme_name || `Fund #${inv.fund_id}` };
        });
    };

    const chartData = generateChartData();

    const PnLTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            const isProfit = d.pnl >= 0;
            return (
                <div style={{ background: 'rgba(10,15,30,0.97)', padding: '12px 16px', border: `1px solid ${isProfit ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)', minWidth: '180px' }}>
                    <p style={{ margin: '0 0 8px', color: '#94a3b8', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{d.fullName}</p>
                    <p style={{ margin: '2px 0', color: '#64748b', fontSize: '0.8rem' }}>Invested: <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{formatCurrency(d.invested)}</span></p>
                    <p style={{ margin: '2px 0', color: '#64748b', fontSize: '0.8rem' }}>Current: <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{formatCurrency(d.current)}</span></p>
                    <p style={{ margin: '6px 0 0', fontSize: '1rem', fontWeight: 800, color: isProfit ? '#22c55e' : '#ef4444' }}>{isProfit ? '+' : ''}{formatCurrency(d.pnl)} ({isProfit ? '+' : ''}{d.pct}%)</p>
                </div>
            );
        }
        return null;
    };

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
            scheme_name: inv.scheme_name || '',
            nav_at_buy: inv.nav_at_buy || '',
            amount: inv.amount || '',
            buy_date: inv.buy_date || inv.start_date || '',
            end_date: inv.end_date || '',
            frequency: inv.frequency || 'Monthly'
        });
        setEditModalOpen(true);
    };
    const closeEdit = () => { setEditModalOpen(false); setSelectedInvestment(null); setEditForm({}); };

    const handleEditSubmit = async (e) => {
        e.preventDefault();

        const navAtBuy = parseFloat(editForm.nav_at_buy || selectedInvestment.nav_at_buy || 0);
        const amountValue = parseFloat(editForm.amount || 0);

        const payload = {
            ...selectedInvestment,
            amount: amountValue,
            amount_invested: amountValue,
            buy_date: editForm.buy_date,
            start_date: editForm.buy_date,
            end_date: editForm.end_date || null,
            frequency: editForm.frequency,
            nav_at_buy: navAtBuy,
            units: navAtBuy > 0 ? amountValue / navAtBuy : selectedInvestment.units
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

    // ── Sell ───────────────────────────────────────────────────
    const openSell = (inv) => {
        setSelectedInvestment(inv);
        const today = new Date().toISOString().split('T')[0];
        setSellForm({ sell_date: today, sellNav: getCurrentNav(inv).toFixed(2) });
        setSellModalOpen(true);
    };
    const closeSell = () => { setSellModalOpen(false); setSelectedInvestment(null); setSellForm({ sell_date: '', sellNav: '' }); };

    const handleSellSubmit = async (e) => {
        e.preventDefault();

        // Prevent future dates
        const selectedDate = new Date(sellForm.sell_date);
        const todayDate = new Date();
        todayDate.setHours(23, 59, 59, 999);
        if (selectedDate > todayDate) {
            setActionStatus({ type: 'error', message: 'Sell date cannot be in the future.' });
            setTimeout(() => setActionStatus({ type: '', message: '' }), 3500);
            return;
        }

        const payload = {
            sellDate: sellForm.sell_date,
            sellNav: String(sellForm.sellNav || 0),
            status: 'SOLD'
        };

        try {
            const token = localStorage.getItem("jwt_token");
            const invId = selectedInvestment.investment_id || selectedInvestment.id;
            await axios.post(`http://localhost:8088/api/investments/${invId}/sell`, payload, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            setActionStatus({ type: 'success', message: 'Investment sold successfully!' });
            closeSell();
            fetchInvestments();
        } catch (err) {
            console.error(err);
            setActionStatus({ type: 'error', message: 'Sell out failed. Please try again.' });
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

            {/* ── Dashboard Top Section ── */}
            <div className="portfolio-dashboard-top">
                {/* ── Portfolio Growth Chart ── */}
                <div className="portfolio-chart-side">
                    {investments.length > 0 ? (
                        <div className="portfolio-chart-wrapper">
                            <div className="chart-header-row">
                                <h3 className="chart-title">P&amp;L Per Investment</h3>
                                <span className={`pnl-live-badge ${totalPnL >= 0 ? 'positive' : 'negative'}`}>
                                    {totalPnL >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                                    {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
                                    <span className="pnl-pct">({totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%)</span>
                                </span>
                            </div>
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={300}>
                                    <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 30 }} barCategoryGap="30%">
                                        <defs>
                                            <linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.95} />
                                                <stop offset="100%" stopColor="#16a34a" stopOpacity={0.7} />
                                            </linearGradient>
                                            <linearGradient id="barRed" x1="0" y1="1" x2="0" y2="0">
                                                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.95} />
                                                <stop offset="100%" stopColor="#dc2626" stopOpacity={0.7} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                                            axisLine={{ stroke: 'rgba(255,255,255,0.07)' }}
                                            tickLine={false}
                                            dy={8}
                                        />
                                        <YAxis
                                            tick={{ fill: '#64748b', fontSize: 10 }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(val) => `${val >= 0 ? '+' : ''}₹${Math.abs(val / 1000).toFixed(0)}k`}
                                            dx={-6}
                                        />
                                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} strokeDasharray="4 4" />
                                        <Tooltip content={<PnLTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                        <Bar dataKey="pnl" radius={[4, 4, 0, 0]} maxBarSize={48}>
                                            {chartData.map((entry, i) => (
                                                <Cell
                                                    key={i}
                                                    fill={entry.pnl >= 0 ? 'url(#barGreen)' : 'url(#barRed)'}
                                                    stroke={entry.pnl >= 0 ? '#22c55e' : '#ef4444'}
                                                    strokeWidth={1}
                                                />
                                            ))}
                                        </Bar>
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ) : (
                        <div className="portfolio-chart-wrapper empty-chart-wrapper">
                            <h3 className="chart-title">Portfolio Growth Timeline</h3>
                            <div className="chart-empty-state">
                                <FiActivity className="empty-icon-small" />
                                <p>No data to visualize. Add your first investment!</p>
                            </div>
                        </div>
                    )}

                    {/* ── Best Performer + Portfolio Health below chart ── */}
                    {investments.length > 0 && (() => {
                        const best = [...investments].sort((a, b) => getReturnPct(b) - getReturnPct(a))[0];
                        const diversification = new Set(investments.map(i => i.investment_type)).size;
                        const score = Math.min(100, Math.round(
                            (totalReturn >= 0 ? 40 : 10) +
                            Math.min(diversification * 15, 30) +
                            Math.min(investments.length * 5, 30)
                        ));
                        const scoreColor = score >= 70 ? 'green' : score >= 40 ? 'blue' : 'red';
                        return (
                            <div className="below-chart-row">
                                {best && (
                                    <div className="p-summary-card highlight-green">
                                        <span className="p-label">🏆 Best Performer</span>
                                        <span className="p-value green" style={{ fontSize: '0.92rem', lineHeight: 1.35 }}>
                                            {(best.scheme_name || `Fund #${best.fund_id}`).slice(0, 30)}{(best.scheme_name || '').length > 30 ? '…' : ''}
                                        </span>
                                        <span className="p-sub green">+{getReturnPct(best).toFixed(2)}% return</span>
                                    </div>
                                )}
                                <div className="p-summary-card health-card">
                                    <span className="p-label">📊 Portfolio Health</span>
                                    <div className="health-bar-wrap">
                                        <div className="health-bar-track">
                                            <div className={`health-bar-fill ${scoreColor}`} style={{ width: `${score}%` }} />
                                        </div>
                                        <span className={`p-value ${scoreColor}`}>{score}/100</span>
                                    </div>
                                    <span className="p-sub">
                                        {score >= 70 ? 'Well diversified & growing' : score >= 40 ? 'Moderate — add more assets' : 'Add investments to improve'}
                                    </span>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* ── Summary Cards ── */}
                <div className="portfolio-summary-side">
                    <div className="portfolio-summary-grid">
                        <div className="p-summary-card">
                            <span className="p-label">Current Value</span>
                            <span className="p-value highlight-text">{formatCurrency(totalCurrentValue)}</span>
                        </div>
                        <div className="p-summary-card">
                            <span className="p-label">Total Invested</span>
                            <span className="p-value">{formatCurrency(totalInvested)}</span>
                        </div>
                        <div className={`p-summary-card ${totalPnL >= 0 ? 'highlight-green' : 'highlight-red'}`}>
                            <span className="p-label">Total P&amp;L</span>
                            <span className={`p-value ${totalPnL >= 0 ? 'green' : 'red'}`}>
                                {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
                            </span>
                        </div>
                        <div className={`p-summary-card ${totalReturn >= 0 ? 'highlight-green' : 'highlight-red'}`}>
                            <span className="p-label">Returns %</span>
                            <span className={`p-value ${totalReturn >= 0 ? 'green' : 'red'}`}>
                                {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
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

                    {/* ── Allocation Bar Chart Sidebar ── */}
                    {investments.length > 0 && (() => {
                        const groups = {};
                        investments.forEach(inv => {
                            const t = inv.investment_type || 'Other';
                            groups[t] = (groups[t] || 0) + getCurrentValue(inv);
                        });
                        const totalVal = Object.values(groups).reduce((s, v) => s + v, 0);
                        const barData = Object.entries(groups).map(([name, value]) => ({
                            name,
                            value: parseFloat(value.toFixed(0)),
                            pct: totalVal > 0 ? ((value / totalVal) * 100).toFixed(1) : '0.0'
                        }));
                        const BAR_COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#14b8a6'];

                        const AllocTooltip = ({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            const idx = barData.findIndex(b => b.name === d.name);
                            const color = BAR_COLORS[idx % BAR_COLORS.length];
                            return (
                                <div style={{
                                    background: '#0d1526',
                                    border: `1px solid ${color}55`,
                                    borderRadius: '10px',
                                    padding: '10px 14px',
                                    boxShadow: `0 8px 24px rgba(0,0,0,0.6), 0 0 0 1px ${color}22`,
                                    minWidth: '160px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                                        <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.85rem' }}>{d.name}</span>
                                    </div>
                                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                                        Value: <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.88rem' }}>{formatCurrency(d.value)}</span>
                                    </div>
                                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>
                                        Share: <span style={{ color, fontWeight: 700 }}>{d.pct}%</span>
                                    </div>
                                </div>
                            );
                        };

                        return (
                            <div className="sidebar-bar-chart-card">
                                <h3 className="chart-title" style={{ marginBottom: '16px' }}>Allocation Breakdown</h3>
                                <ResponsiveContainer width="100%" height={barData.length * 52 + 10}>
                                    <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }} barCategoryGap="35%">
                                        <XAxis type="number" hide domain={[0, totalVal]} />
                                        <YAxis type="category" dataKey="name" width={72}
                                            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                                            axisLine={false} tickLine={false} />
                                        <Tooltip content={<AllocTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)', rx: 6 }} />
                                        <Bar dataKey="value" radius={[4, 6, 6, 4]} barSize={22} label={{ position: 'right', fill: '#64748b', fontSize: 10, formatter: (v, entry) => `${barData.find(b => b.value === v)?.pct || ''}%` }}>
                                            {barData.map((entry, i) => (
                                                <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        );
                    })()}
                </div>
            </div>


            {/* ── Professional Features Row ── */}
            {investments.length > 0 && (() => {
                const sorted_by_ret = [...investments].sort((a, b) => getReturnPct(b) - getReturnPct(a));
                const winners = sorted_by_ret.slice(0, 3);
                const losers = sorted_by_ret.slice().reverse().slice(0, 3).filter(i => getReturnPct(i) < getReturnPct(winners[winners.length - 1]));
                const types = [...new Set(investments.map(i => i.investment_type || 'Other'))];
                const avgReturn = investments.length > 0 ? investments.reduce((s, i) => s + getReturnPct(i), 0) / investments.length : 0;
                const winRate = investments.length > 0 ? Math.round((investments.filter(i => getReturnPct(i) >= 0).length / investments.length) * 100) : 0;
                const maxConc = Math.max(...types.map(t => {
                    const val = investments.filter(i => (i.investment_type || 'Other') === t).reduce((s, i) => s + getCurrentValue(i), 0);
                    return totalCurrentValue > 0 ? (val / totalCurrentValue) * 100 : 0;
                }));
                const riskLevel = maxConc > 80 ? 'High' : maxConc > 50 ? 'Medium' : 'Low';
                const riskColor = maxConc > 80 ? '#ef4444' : maxConc > 50 ? '#f59e0b' : '#22c55e';
                return (
                    <>
                        {/* ── Ticker / Market Intel Strip ── */}
                        <div className="market-intel-strip">
                            <div className="intel-ticker-inner">
                                <div className="intel-item"><span className="intel-label">Holdings</span><span className="intel-val">{investments.length}</span></div>
                                <div className="intel-divider" />
                                <div className="intel-item"><span className="intel-label">Win Rate</span><span className="intel-val green">{winRate}%</span></div>
                                <div className="intel-divider" />
                                <div className="intel-item"><span className="intel-label">Avg Return</span><span className={`intel-val ${avgReturn >= 0 ? 'green' : 'red'}`}>{avgReturn >= 0 ? '+' : ''}{avgReturn.toFixed(2)}%</span></div>
                                <div className="intel-divider" />
                                <div className="intel-item"><span className="intel-label">Asset Classes</span><span className="intel-val">{types.length}</span></div>
                                <div className="intel-divider" />
                                <div className="intel-item"><span className="intel-label">Concentration Risk</span><span className="intel-val" style={{ color: riskColor }}>{riskLevel} ({maxConc.toFixed(0)}%)</span></div>
                                <div className="intel-divider" />
                                <div className="intel-item"><span className="intel-label">Portfolio Value</span><span className="intel-val">{formatCurrency(totalCurrentValue)}</span></div>
                            </div>
                        </div>

                        {/* ── Top Movers + Risk Exposure ── */}
                        <div className="pro-features-row">
                            {/* Top Winners */}
                            <div className="pro-card movers-card">
                                <div className="pro-card-header">
                                    <span className="pro-card-title"><FiTrendingUp className="title-icon green-icon" /> Top Winners</span>
                                </div>
                                <div className="movers-list">
                                    {winners.map((inv, i) => {
                                        const ret = getReturnPct(inv);
                                        return (
                                            <div key={i} className="mover-row">
                                                <span className="mover-rank">{i + 1}</span>
                                                <div className="mover-info">
                                                    <span className="mover-name">{(inv.scheme_name || `Fund #${inv.fund_id}`).slice(0, 26)}{(inv.scheme_name || '').length > 26 ? '…' : ''}</span>
                                                    <span className="mover-type">{inv.investment_type}</span>
                                                </div>
                                                <span className="mover-ret positive">+{ret.toFixed(2)}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Top Losers */}
                            <div className="pro-card movers-card">
                                <div className="pro-card-header">
                                    <span className="pro-card-title"><FiTrendingDown className="title-icon red-icon" /> Underperformers</span>
                                </div>
                                <div className="movers-list">
                                    {sorted_by_ret.slice().reverse().slice(0, 3).map((inv, i) => {
                                        const ret = getReturnPct(inv);
                                        return (
                                            <div key={i} className="mover-row">
                                                <span className="mover-rank">{i + 1}</span>
                                                <div className="mover-info">
                                                    <span className="mover-name">{(inv.scheme_name || `Fund #${inv.fund_id}`).slice(0, 26)}{(inv.scheme_name || '').length > 26 ? '…' : ''}</span>
                                                    <span className="mover-type">{inv.investment_type}</span>
                                                </div>
                                                <span className={`mover-ret ${ret >= 0 ? 'positive' : 'negative'}`}>{ret >= 0 ? '+' : ''}{ret.toFixed(2)}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Risk Exposure Meter */}
                            <div className="pro-card risk-card">
                                <div className="pro-card-header">
                                    <span className="pro-card-title"><FiActivity className="title-icon blue-icon" /> Risk Exposure</span>
                                    <span className="risk-level-badge" style={{ background: `${riskColor}20`, color: riskColor, border: `1px solid ${riskColor}40` }}>{riskLevel}</span>
                                </div>
                                <div className="risk-meter-wrap">
                                    <div className="risk-meter-track">
                                        <div className="risk-meter-fill" style={{ width: `${maxConc}%`, background: riskColor }} />
                                        <div className="risk-zone low" />
                                        <div className="risk-zone med" />
                                        <div className="risk-zone high" />
                                    </div>
                                    <div className="risk-labels">
                                        <span>Low</span><span>Med</span><span>High</span>
                                    </div>
                                </div>
                                <div className="risk-breakdown">
                                    {types.map((t, i) => {
                                        const val = investments.filter(inv => (inv.investment_type || 'Other') === t).reduce((s, inv) => s + getCurrentValue(inv), 0);
                                        const pct = totalCurrentValue > 0 ? (val / totalCurrentValue) * 100 : 0;
                                        const COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#14b8a6'];
                                        return (
                                            <div key={i} className="risk-row">
                                                <span className="risk-dot" style={{ background: COLORS[i % COLORS.length] }} />
                                                <span className="risk-name">{t}</span>
                                                <div className="risk-bar-mini"><div style={{ width: `${pct}%`, background: COLORS[i % COLORS.length], height: '100%', borderRadius: '4px' }} /></div>
                                                <span className="risk-pct">{pct.toFixed(0)}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </>
                );
            })()}

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
                                            {!inv.end_date && (
                                                <button className="table-icon-btn sell" onClick={() => openSell(inv)} title="Sell Investment">
                                                    <FiCheckCircle size={18} />
                                                </button>
                                            )}
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
                                {selectedInvestment.end_date && (
                                    <div className="detail-item">
                                        <span className="detail-label"><FiCalendar /> End Date</span>
                                        <span className="detail-value">{formatDate(selectedInvestment.end_date)}</span>
                                    </div>
                                )}
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
                                {selectedInvestment.frequency && selectedInvestment.investment_type === 'SIP' && (
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
                                            readOnly
                                            style={{ backgroundColor: 'rgba(255,255,255,0.05)', cursor: 'not-allowed' }}
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
                                                readOnly
                                                style={{ backgroundColor: 'rgba(255,255,255,0.05)', cursor: 'not-allowed' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Current NAV</label>
                                        <div className="input-wrapper">
                                            <FiActivity className="input-icon" />
                                            <input
                                                type="number"
                                                value={getCurrentNav(selectedInvestment).toFixed(2)}
                                                readOnly
                                                style={{ backgroundColor: 'rgba(255,255,255,0.05)', cursor: 'not-allowed' }}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Units Held</label>
                                        <div className="input-wrapper">
                                            <FiActivity className="input-icon" />
                                            <input
                                                type="number"
                                                value={parseFloat(selectedInvestment.units || 0).toFixed(4)}
                                                readOnly
                                                style={{ backgroundColor: 'rgba(255,255,255,0.05)', cursor: 'not-allowed' }}
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
                                    <div className="form-group">
                                        <label>End Date (Optional)</label>
                                        <div className="input-wrapper">
                                            <FiCalendar className="input-icon" />
                                            <input
                                                type="date"
                                                value={editForm.end_date}
                                                onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                                            />
                                        </div>
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

            {/* ── Sell Modal ── */}
            {sellModalOpen && selectedInvestment && (
                <div className="modal-overlay" onClick={closeSell}>
                    <div className="modal-card modal-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3><FiCheckCircle style={{ color: '#22c55e' }} /> Sell Investment</h3>
                            <button className="modal-close" onClick={closeSell}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            <p className="modal-subtitle">Realize your investment and transfer to Tax Reports</p>
                            <h4 className="detail-fund-name" style={{ marginTop: '10px' }}>
                                {selectedInvestment.scheme_name || `Fund #${selectedInvestment.fund_id}`}
                            </h4>
                            <div className="detail-grid" style={{ marginTop: '15px' }}>
                                <div className="detail-item">
                                    <span className="detail-label"><FiDollarSign /> Invested</span>
                                    <span className="detail-value">{formatCurrency(selectedInvestment.amount)}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label"><FiActivity /> Current Value</span>
                                    <span className="detail-value">{formatCurrency(getCurrentValue(selectedInvestment))}</span>
                                </div>
                            </div>

                            <form onSubmit={handleSellSubmit} className="edit-form" style={{ marginTop: '20px' }}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Sell Date</label>
                                        <div className="input-wrapper">
                                            <FiCalendar className="input-icon" />
                                            <input
                                                type="date"
                                                value={sellForm.sell_date}
                                                onChange={(e) => setSellForm({ ...sellForm, sell_date: e.target.value })}
                                                required
                                                max={new Date().toISOString().split('T')[0]} // Block future dates
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Exit NAV (₹)</label>
                                        <div className="input-wrapper">
                                            <FiActivity className="input-icon" />
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={sellForm.sellNav || ''}
                                                onChange={(e) => setSellForm({ ...sellForm, sellNav: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Real-time preview of the outcome */}
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px', marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>Estimated Payout</span>
                                    <span style={{ color: '#10b981', fontSize: '18px', fontWeight: '700' }}>
                                        {formatCurrency(parseFloat(selectedInvestment?.units || 0) * parseFloat(sellForm.sellNav || 0))}
                                    </span>
                                </div>

                                <div className="form-actions" style={{ marginTop: '24px' }}>
                                    <button type="button" className="btn-cancel" onClick={closeSell}>Cancel</button>
                                    <button type="submit" className="btn-submit" style={{ backgroundColor: '#22c55e' }}>Confirm Sale</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
