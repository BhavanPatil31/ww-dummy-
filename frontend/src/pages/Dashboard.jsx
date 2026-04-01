import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import {
    AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
    FiPlus, FiBriefcase, FiTarget, FiFileText, FiBell, FiUser, FiLogOut,
    FiTrendingUp, FiTrendingDown, FiArrowUpRight, FiArrowDownRight,
    FiDollarSign, FiActivity, FiPieChart, FiZap, FiAward, FiStar,
    FiAlertTriangle, FiRefreshCw, FiClock, FiSettings
} from 'react-icons/fi';
import AddInvestment from './AddInvestment';
import Portfolio from './Portfolio';
import UserProfile from './UserProfile';
import TaxSummary from './TaxSummary';
import GoalPlanning from './GoalPlanning';
import '../styles/Dashboard.css';

const COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#14b8a6', '#6366f1', '#ec4899'];

const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const fmt = (v) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v || 0);
    return (
        <div className="chart-tooltip">
            <div className="ct-date">{label}</div>
            <div className="ct-val">₹{fmt(payload[0].value)}</div>
        </div>
    );
};

export default function Dashboard({ user, onLogout, onProfileUpdate, theme, setTheme }) {
    const [investments, setInvestments] = useState([]);
    const [dashboardData, setDashboardData] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [timeFrame, setTimeFrame] = useState('1M');
    const [activeView, setActiveView] = useState(
        () => localStorage.getItem('activeView') || 'dashboard'
    );
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef(null);

    // Close notifications on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => { localStorage.setItem('activeView', activeView); }, [activeView]);

    const fmt = (v) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v || 0);
    const fmtShort = (val) => {
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
        return `₹${fmt(val)}`;
    };
    const formatDate = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
    };

    // ── Value helpers ────────────────────────────────────────────
    const getCurrentValue = useCallback((inv) => {
        const nav = inv.current_nav && inv.current_nav > 0 ? inv.current_nav
            : inv.nav_at_buy > 0 ? inv.nav_at_buy * (1 + 0.05 + ((inv.investment_id || 1) % 10) / 100)
                : 0;
        if (inv.units > 0 && nav > 0) return inv.units * nav;
        const pct = 0.05 + ((inv.investment_id || 1) % 10) / 100;
        return parseFloat(inv.amount || 0) * (1 + pct);
    }, []);

    // ── Generate chart history ────────────────────────────────────
    const generateHistory = useCallback((baseVal, tf) => {
        const points = tf === '1W' ? 7 : tf === '1M' ? 30 : tf === '6M' ? 180 : tf === '1Y' ? 365 : 730;
        const data = [];
        let base = baseVal * 0.78;
        const now = new Date();
        for (let i = points; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            base = Math.max(base + (Math.random() - 0.44) * (baseVal * 0.014), baseVal * 0.5);
            data.push({
                date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                value: parseFloat(base.toFixed(2))
            });
        }
        if (data.length > 0) data[data.length - 1].value = baseVal;
        return data;
    }, []);

    // ── Fetch data ───────────────────────────────────────────────
    const fetchAllData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const token = localStorage.getItem('jwt_token');
        const userId = user?.userId || user?.id;
        const headers = { Authorization: `Bearer ${token}` };
        try {
            let invData = [];
            try {
                const r = await axios.get(`http://localhost:8088/api/investments/user/${userId}`, { headers });
                invData = r.data || [];
            } catch { }

            let dbData = null;
            try {
                const r = await axios.get(`http://localhost:8088/api/dashboard/${userId}`, { headers });
                dbData = r.data;
                if (dbData && dbData.profitLoss === undefined)
                    dbData.profitLoss = (dbData.portfolioValue || 0) - (dbData.totalInvested || 0);
            } catch { }

            setInvestments(invData);
            setDashboardData(dbData);
            const baseVal = dbData?.portfolioValue
                || invData.reduce((s, i) => s + getCurrentValue(i), 0)
                || 10000;
            setHistoryData(generateHistory(baseVal, timeFrame));
        } finally {
            setLoading(false);
        }
    }, [user, timeFrame, getCurrentValue, generateHistory]);

    useEffect(() => {
        if (user && (activeView === 'dashboard' || activeView === 'tax' || activeView === 'goals')) {
            fetchAllData();
        }
    }, [user, activeView, timeFrame]);

    // Notifications
    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const token = localStorage.getItem('jwt_token');
            const userId = user?.userId || user?.id;
            const res = await axios.get(`http://localhost:8088/api/notifications/user/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(res.data || []);
            setUnreadCount((res.data || []).filter(n => !n.read).length);
        } catch { }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchNotifications();
            const id = setInterval(fetchNotifications, 15000);
            return () => clearInterval(id);
        }
    }, [user, fetchNotifications]);

    const markNotificationAsRead = async (notifId) => {
        try {
            const token = localStorage.getItem('jwt_token');
            await axios.put(`http://localhost:8088/api/notifications/${notifId}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowNotifications(false);
            fetchNotifications();
        } catch (err) { console.error("Failed to mark read", err); }
    };

    const clearAllNotifications = async () => {
        if (!user) return;
        try {
            const token = localStorage.getItem('jwt_token');
            const userId = user?.userId || user?.id;
            await axios.delete(`http://localhost:8088/api/notifications/user/${userId}/clear-all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications([]);
            setUnreadCount(0);
            setShowNotifications(false);
        } catch (err) { console.error("Failed to clear", err); }
    };

    // ── Derived metrics ──────────────────────────────────────────
    const metrics = useMemo(() => {
        if (dashboardData) return {
            totalInvested: dashboardData.totalInvested || 0,
            portfolioValue: dashboardData.portfolioValue || 0,
            profitLoss: dashboardData.profitLoss || 0,
            returnPct: dashboardData.returnPercentage || 0,
        };
        const totalInvested = investments.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
        const portfolioValue = investments.reduce((s, i) => s + getCurrentValue(i), 0);
        const profitLoss = portfolioValue - totalInvested;
        const returnPct = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
        return { totalInvested, portfolioValue, profitLoss, returnPct };
    }, [dashboardData, investments, getCurrentValue]);

    const assetAllocation = useMemo(() => {
        if (dashboardData?.assetAllocation?.length) return dashboardData.assetAllocation;
        if (!investments.length) return [];
        const groups = {};
        investments.forEach(inv => {
            const t = inv.investment_type || 'Other';
            groups[t] = (groups[t] || 0) + getCurrentValue(inv);
        });
        return Object.entries(groups).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
    }, [dashboardData, investments, getCurrentValue]);

    const topPerformers = useMemo(() => {
        if (!investments.length) return { best: null, worst: null };
        const withRet = investments.map(inv => {
            const invested = parseFloat(inv.amount || 0);
            const current = getCurrentValue(inv);
            const returnPct = invested > 0 ? ((current - invested) / invested) * 100 : 0;
            return { ...inv, returnPct };
        });
        const sorted = [...withRet].sort((a, b) => b.returnPct - a.returnPct);
        return { best: sorted[0], worst: sorted[sorted.length - 1] };
    }, [investments, getCurrentValue]);

    const recentActivity = useMemo(() =>
        [...investments]
            .sort((a, b) => new Date(b.buy_date || b.start_date || 0) - new Date(a.buy_date || a.start_date || 0))
            .slice(0, 5),
        [investments]
    );

    const insights = useMemo(() => {
        const out = [];
        if (!investments.length) {
            out.push({ type: 'blue', icon: <FiPlus />, text: 'Add your first investment to start building your wealth portfolio.' });
            return out;
        }
        const types = new Set(investments.map(inv => inv.investment_type));
        if (types.size === 1) {
            out.push({ type: 'yellow', icon: <FiAlertTriangle />, text: `All investments are in ${[...types][0]}. Diversify to reduce risk.` });
        } else {
            out.push({ type: 'green', icon: <FiAward />, text: `Diversified across ${types.size} asset classes — great strategy!` });
        }
        if (metrics.returnPct > 10) {
            out.push({ type: 'blue', icon: <FiTrendingUp />, text: `Portfolio is growing at ${metrics.returnPct.toFixed(1)}% — beating inflation!` });
        } else if (metrics.returnPct < 0) {
            out.push({ type: 'yellow', icon: <FiAlertTriangle />, text: `Portfolio is down ${Math.abs(metrics.returnPct).toFixed(1)}%. Consider rebalancing.` });
        } else {
            out.push({ type: 'blue', icon: <FiStar />, text: `Steady returns at ${metrics.returnPct.toFixed(1)}%. Keep investing consistently.` });
        }
        if (investments.length < 3) {
            out.push({ type: 'green', icon: <FiPlus />, text: 'Add more investments to unlock full diversification analytics.' });
        }
        return out.slice(0, 3);
    }, [investments, metrics]);

    const profitPill = () => {
        const { profitLoss, returnPct } = metrics;
        if (!dashboardData && investments.length === 0) return null;
        if (profitLoss === 0) return <span className="profit-neutral">Break-even</span>;
        const isPos = profitLoss > 0;
        return (
            <div className={`profit-pill ${isPos ? 'pos' : 'neg'}`}>
                {isPos ? <FiArrowUpRight /> : <FiArrowDownRight />}
                {isPos ? '+' : ''}₹{fmt(Math.abs(profitLoss))}
                <span>({isPos ? '+' : ''}{returnPct.toFixed(2)}%)</span>
            </div>
        );
    };

    return (
        <div className="dashboard-container">
            {/* ── SIDEBAR ── */}
            <aside className="dashboard-sidebar">
                <div className="brand"><h2>WealthWise</h2></div>
                <nav className="sidebar-nav">
                    {[
                        { view: 'dashboard', icon: <FiTrendingUp />, label: 'Dashboard' },
                        { view: 'addInvestment', icon: <FiPlus />, label: 'Add Investment' },
                        { view: 'portfolio', icon: <FiBriefcase />, label: 'Portfolio' },
                        { view: 'tax', icon: <FiFileText />, label: 'Tax Reports' },
                        { view: 'goals', icon: <FiTarget />, label: 'Goals' }
                    ].map(({ view, icon, label }) => (
                        <button key={view} className={`nav-item ${activeView === view ? 'active' : ''}`} onClick={() => setActiveView(view)}>
                            {icon} {label}
                        </button>
                    ))}
                </nav>
                <div className="sidebar-bottom">
                    <button className="logout-btn" onClick={onLogout}><FiLogOut /> Logout</button>
                </div>
            </aside>

            {/* ── MAIN ── */}
            <main className="dashboard-main">
                <header className="dashboard-header">
                    <div className="welcome-section">
                        <h1>
                            {activeView === 'dashboard'
                                ? `Welcome back, ${user?.name?.split(' ')[0] || 'Investor'} 👋`
                                : activeView === 'profile' ? 'Account Overview'
                                    : activeView === 'addInvestment' ? 'Add Investment'
                                        : activeView === 'portfolio' ? 'My Portfolio'
                                            : activeView === 'tax' ? 'Tax Summary'
                                                : activeView === 'settings' ? 'Settings'
                                                    : activeView === 'goals' ? 'Goals & Targets'
                                                        : 'WealthWise'}
                        </h1>
                        <p>
                            {activeView === 'dashboard'
                                ? new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                                : activeView === 'addInvestment' ? 'Track a new mutual fund, SIP or lump-sum investment'
                                    : activeView === 'portfolio' ? 'Monitor performance across all your holdings'
                                        : activeView === 'profile' ? 'Manage your personal details and preferences'
                                            : activeView === 'tax' ? 'Review your realized capital gains and tax liabilities'
                                                : activeView === 'settings' ? 'Configure application preferences and security'
                                                    : activeView === 'goals' ? 'Set and track your financial milestones'
                                                        : new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="header-actions">
                        <div className="notification-wrapper" ref={notifRef}>
                            <button className={`icon-btn ${showNotifications ? 'active' : ''}`}
                                onClick={() => setShowNotifications(!showNotifications)}>
                                <FiBell />
                                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                            </button>

                            {showNotifications && (
                                <div className="notifications-dropdown">
                                    <div className="notif-header">
                                        <h3>Notifications</h3>
                                        {notifications.length > 0 && (
                                            <button onClick={clearAllNotifications} className="clear-all-btn">Clear All</button>
                                        )}
                                    </div>
                                    <div className="notif-list">
                                        {notifications.length === 0 ? (
                                            <div className="notif-empty">No notifications</div>
                                        ) : (
                                            notifications.map(n => (
                                                <div key={n.id} className={`notif-item ${n.read ? 'read' : 'unread'}`}
                                                    onClick={() => !n.read && markNotificationAsRead(n.id)}>
                                                    <div className="notif-icon-circle">
                                                        <FiAlertTriangle />
                                                    </div>
                                                    <div className="notif-content">
                                                        <p className="notif-msg">{n.message}</p>
                                                        <span className="notif-time">{formatDate(n.createdAt)}</span>
                                                    </div>
                                                    {!n.read && <div className="unread-dot"></div>}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="profile-pill" onClick={() => {
                            setActiveView('profile');
                            setShowNotifications(false);
                        }}>
                            <FiUser /> {user?.name || 'User'}
                        </div>
                    </div>
                </header>

                <div className="dashboard-view-content">
                    {activeView === 'dashboard' ? (
                        <div className="premium-dashboard">

                            {/* ── 1. PORTFOLIO GROWTH HERO ── */}
                            <section className="growth-hero-card">
                                <div className="hero-top">
                                    <div className="hero-left">
                                        <span className="eyebrow">TOTAL PORTFOLIO VALUE</span>
                                        <div className="hero-value-row">
                                            <span className="big-price">₹{fmt(metrics.portfolioValue)}</span>
                                            {profitPill()}
                                        </div>
                                        <div className="timeframe-filters">
                                            {['1W', '1M', '6M', '1Y', 'ALL'].map(tf => (
                                                <button key={tf} className={timeFrame === tf ? 'active' : ''} onClick={() => setTimeFrame(tf)}>{tf}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="hero-right">
                                        <div className="hero-mini-stat">
                                            <span>Invested</span>
                                            <strong>₹{fmt(metrics.totalInvested)}</strong>
                                        </div>
                                        <div className="hero-mini-stat">
                                            <span>Holdings</span>
                                            <strong>{investments.length}</strong>
                                        </div>
                                        <div className="hero-mini-stat">
                                            <span>Return</span>
                                            <strong className={metrics.returnPct >= 0 ? 'pos' : 'neg'}>
                                                {metrics.returnPct >= 0 ? '+' : ''}{metrics.returnPct.toFixed(2)}%
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                                <div className="main-chart-container">
                                    <ResponsiveContainer width="100%" height={240}>
                                        <AreaChart data={historyData} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} interval="preserveStartEnd" dy={8} />
                                            <YAxis hide domain={['auto', 'auto']} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5}
                                                fill="url(#areaGrad)" dot={false}
                                                activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </section>

                            {/* ── 2. KPI CARDS ── */}
                            <div className="kpi-grid">
                                {[
                                    { label: 'Total Invested', value: `₹${fmt(metrics.totalInvested)}`, icon: <FiDollarSign />, cls: 'i-purple', sub: `${investments.length} holding${investments.length !== 1 ? 's' : ''}` },
                                    { label: 'Portfolio Value', value: `₹${fmt(metrics.portfolioValue)}`, icon: <FiBriefcase />, cls: 'i-blue', sub: 'Current market value', highlight: true },
                                    {
                                        label: 'Total Gain / Loss',
                                        value: metrics.profitLoss === 0 ? 'Break-even'
                                            : `${metrics.profitLoss > 0 ? '+' : ''}₹${fmt(Math.abs(metrics.profitLoss))}`,
                                        icon: metrics.profitLoss >= 0 ? <FiTrendingUp /> : <FiTrendingDown />,
                                        cls: metrics.profitLoss > 0 ? 'i-green' : metrics.profitLoss < 0 ? 'i-red' : 'i-muted',
                                        sub: metrics.profitLoss === 0 ? 'No change yet' : `${metrics.returnPct.toFixed(2)}% overall`,
                                        valueColor: metrics.profitLoss > 0 ? 'pos' : metrics.profitLoss < 0 ? 'neg' : ''
                                    },
                                    {
                                        label: 'Returns %', value: `${metrics.returnPct >= 0 ? '+' : ''}${metrics.returnPct.toFixed(2)}%`,
                                        icon: <FiActivity />, cls: metrics.returnPct >= 0 ? 'i-green' : 'i-red',
                                        sub: 'Absolute return', valueColor: metrics.returnPct >= 0 ? 'pos' : 'neg'
                                    },
                                ].map((kpi, i) => (
                                    <div key={i} className={`kpi-card${kpi.highlight ? ' highlight' : ''}`}>
                                        <div className="kpi-header">
                                            <span className={`kpi-icon ${kpi.cls}`}>{kpi.icon}</span>
                                            <span className="kpi-label">{kpi.label}</span>
                                        </div>
                                        <div className={`kpi-value ${kpi.valueColor || ''}`}>{kpi.value}</div>
                                        <div className="kpi-sub">{kpi.sub}</div>
                                    </div>
                                ))}
                            </div>

                            {/* ── 3. MIDDLE ROW: Allocation + Insights ── */}
                            <div className="mid-row">
                                <div className="allocation-card">
                                    <div className="card-top"><h3>Asset Allocation</h3><FiPieChart /></div>
                                    {assetAllocation.length === 0 ? (
                                        <div className="empty-state-sm"><FiPieChart /><p>Add investments to see allocation</p></div>
                                    ) : (
                                        <>
                                            <div className="donut-wrapper">
                                                <ResponsiveContainer width="100%" height={190}>
                                                    <PieChart>
                                                        <Pie data={assetAllocation} innerRadius={58} outerRadius={82} paddingAngle={4} dataKey="value" stroke="none">
                                                            {assetAllocation.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                        </Pie>
                                                        <Tooltip formatter={(v) => [`₹${fmt(v)}`, '']} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '0.85rem' }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                <div className="donut-center">
                                                    <span className="donut-label">Total</span>
                                                    <span className="donut-val">{fmtShort(metrics.portfolioValue)}</span>
                                                </div>
                                            </div>
                                            <div className="legend-list">
                                                {assetAllocation.map((item, i) => (
                                                    <div key={i} className="legend-item">
                                                        <span className="legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
                                                        <span className="legend-name">{item.name}</span>
                                                        <span className="legend-pct">{metrics.portfolioValue > 0 ? ((item.value / metrics.portfolioValue) * 100).toFixed(0) : 0}%</span>
                                                        <span className="legend-val">₹{fmt(item.value)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="insights-card">
                                    <div className="card-top"><h3>Smart Insights</h3><FiZap /></div>
                                    <div className="insights-list">
                                        {insights.map((ins, i) => (
                                            <div key={i} className={`insight-item ${ins.type}`}>
                                                <div className="ins-icon">{ins.icon}</div>
                                                <p>{ins.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* ── 4. BOTTOM ROW: Performers + Activity ── */}
                            <div className="bottom-row">
                                <div className="performers-card">
                                    <div className="card-top"><h3>Top Performers</h3><FiAward /></div>
                                    {investments.length === 0 ? (
                                        <div className="empty-state-sm"><FiAward /><p>Add investments to see performers</p></div>
                                    ) : (
                                        <div className="performers-list">
                                            {topPerformers.best && (
                                                <div className="performer-item">
                                                    <div className="performer-badge green">Best</div>
                                                    <div className="performer-info">
                                                        <strong title={topPerformers.best.scheme_name}>
                                                            {(topPerformers.best.scheme_name || `Fund #${topPerformers.best.fund_id}`).slice(0, 30)}{topPerformers.best.scheme_name?.length > 30 ? '…' : ''}
                                                        </strong>
                                                        <span>{topPerformers.best.investment_type}</span>
                                                    </div>
                                                    <div className="performer-ret pos"><FiArrowUpRight />+{topPerformers.best.returnPct.toFixed(2)}%</div>
                                                </div>
                                            )}
                                            {topPerformers.worst && topPerformers.worst.investment_id !== topPerformers.best?.investment_id && (
                                                <div className="performer-item">
                                                    <div className="performer-badge red">Lowest</div>
                                                    <div className="performer-info">
                                                        <strong title={topPerformers.worst.scheme_name}>
                                                            {(topPerformers.worst.scheme_name || `Fund #${topPerformers.worst.fund_id}`).slice(0, 30)}{topPerformers.worst.scheme_name?.length > 30 ? '…' : ''}
                                                        </strong>
                                                        <span>{topPerformers.worst.investment_type}</span>
                                                    </div>
                                                    <div className={`performer-ret ${topPerformers.worst.returnPct >= 0 ? 'pos' : 'neg'}`}>
                                                        {topPerformers.worst.returnPct >= 0 ? <FiArrowUpRight /> : <FiArrowDownRight />}
                                                        {topPerformers.worst.returnPct >= 0 ? '+' : ''}{topPerformers.worst.returnPct.toFixed(2)}%
                                                    </div>
                                                </div>
                                            )}
                                            {investments.length === 1 && (
                                                <p className="hint-text">Add more investments to compare performance</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="activity-card">
                                    <div className="card-top"><h3>Recent Activity</h3><FiClock /></div>
                                    {recentActivity.length === 0 ? (
                                        <div className="empty-state-sm"><FiClock /><p>No recent transactions</p></div>
                                    ) : (
                                        <div className="activity-list">
                                            {recentActivity.map((inv, i) => (
                                                <div key={i} className="activity-item">
                                                    <div className={`activity-dot ${inv.investment_type === 'SIP' ? 'blue' : 'green'}`}>
                                                        {inv.investment_type === 'SIP' ? <FiRefreshCw size={11} /> : <FiArrowUpRight size={11} />}
                                                    </div>
                                                    <div className="activity-info">
                                                        <strong>{(inv.scheme_name || `Fund #${inv.fund_id}`).slice(0, 24)}{(inv.scheme_name?.length > 24) ? '…' : ''}</strong>
                                                        <span>{inv.investment_type} · {formatDate(inv.buy_date || inv.start_date)}</span>
                                                    </div>
                                                    <div className="activity-amount">+₹{fmt(inv.amount)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── 5. GOALS PREVIEW ── */}
                            <div className="goals-preview-card">
                                <div className="card-top"><h3>Financial Goals</h3><FiTarget /></div>
                                <div className="goals-grid">
                                    {[
                                        { emoji: '🏠', name: 'New Home Fund', pct: 65, cur: '₹6.5L', total: '₹10L', rem: '₹3.5L', color: '' },
                                        { emoji: '✈️', name: 'Vacation Fund', pct: 40, cur: '₹80K', total: '₹2L', rem: '₹1.2L', color: 'blue' },
                                    ].map((g, i) => (
                                        <div key={i} className="goal-card">
                                            <div className="goal-header">
                                                <span>{g.emoji} {g.name}</span>
                                                <span className="goal-pct">{g.pct}%</span>
                                            </div>
                                            <div className="goal-bar">
                                                <div className={`goal-fill ${g.color}`} style={{ width: `${g.pct}%` }} />
                                            </div>
                                            <div className="goal-footer">
                                                <span>{g.cur} of {g.total}</span>
                                                <span className="goal-rem">{g.rem} to go</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    ) : activeView === 'addInvestment' ? (
                        <AddInvestment user={user} onBackToDashboard={() => { fetchAllData(); setActiveView('dashboard'); }} />
                    ) : activeView === 'portfolio' ? (
                        <Portfolio user={user} />
                    ) : activeView === 'tax' ? (
                        <TaxSummary user={user} investments={investments} />
                    ) : activeView === 'profile' ? (
                        <UserProfile user={user} onBack={() => setActiveView('dashboard')} onLogout={onLogout} onProfileUpdate={onProfileUpdate} theme={theme} setTheme={setTheme} />
                    ) : activeView === 'goals' ? (
                        <GoalPlanning user={user} investments={investments} getCurrentValue={getCurrentValue} />
                    ) : null}
                </div>
            </main>
        </div>
    );
}