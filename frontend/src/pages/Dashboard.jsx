import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.js?url";
import {
    ComposedChart, Area, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
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
import Settings from './Settings';
import '../styles/Dashboard.css';

const COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#14b8a6', '#6366f1', '#ec4899'];

const ChartTooltip = ({ active, payload, label, currency = 'INR' }) => {
    if (!active || !payload?.length) return null;
    const fmt = (val) =>
        new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(val || 0);
    const currentVal = payload.find(p => p.dataKey === 'value');
    const investedVal = payload.find(p => p.dataKey === 'invested');
    const gain = currentVal && investedVal ? (currentVal.value - investedVal.value) : 0;
    const gainPct = investedVal?.value > 0 ? ((gain / investedVal.value) * 100) : 0;
    // Format the date label nicely
    let dateStr = label;
    try {
        const d = new Date(label + 'T00:00:00');
        dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (err) {
        console.warn("Date parsing failed in Tooltip", err);
    }
    return (
        <div className="chart-tooltip-pro">
            <div className="ct-date-pro">{dateStr}</div>
            <div className="ct-rows">
                {currentVal && (
                    <div className="ct-row">
                        <span className="ct-dot" style={{ background: '#3b82f6' }} />
                        <span className="ct-label">Current Value</span>
                        <span className="ct-amount">{fmt(currentVal.value)}</span>
                    </div>
                )}
                {investedVal && (
                    <div className="ct-row">
                        <span className="ct-dot" style={{ background: '#a855f7' }} />
                        <span className="ct-label">Invested</span>
                        <span className="ct-amount">{fmt(investedVal.value)}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// Format Y-axis tick values as short currency
const formatYAxis = (val, currency = 'INR') => {
    const sym = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';
    if (currency === 'INR') {
        if (val >= 10000000) return `${sym}${(val / 10000000).toFixed(1)}Cr`;
        if (val >= 100000) return `${sym}${(val / 100000).toFixed(1)}L`;
        if (val >= 1000) return `${sym}${(val / 1000).toFixed(0)}K`;
    } else {
        if (val >= 1000000) return `${sym}${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `${sym}${(val / 1000).toFixed(0)}K`;
    }
    return `${sym}${val}`;
};

// Format X-axis date ticks
const formatXDate = (dateStr) => {
    try {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch { return dateStr; }
};
const HISTORY_DAYS = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, 'ALL': 5000 };

/** When API history is missing or all zeros, show a readable trend from invested → current. */
function buildFallbackHistory(timeFrame, totalInvested, portfolioValue) {
    const span = HISTORY_DAYS[timeFrame] ?? 30;
    const n = Math.min(Math.max(span, 7), 120);
    const out = [];
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (n - 1));
    const inv = Number(totalInvested) || 0;
    const cur = Number(portfolioValue) || 0;
    for (let i = 0; i < n; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const t = n <= 1 ? 1 : i / (n - 1);
        const eased = t * t * (3 - 2 * t);
        const value = inv + (cur - inv) * eased;
        const iso = d.toISOString().slice(0, 10);
        out.push({
            date: iso,
            value: Math.round(value * 100) / 100,
            invested: Math.round(inv * 100) / 100,
        });
    }
    return out;
}

export default function Dashboard({ user, onLogout, onProfileUpdate, theme, setTheme, currency, setCurrency }) {
    const [investments, setInvestments] = useState([]);
    const [dashboardData, setDashboardData] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(false);
    const [timeFrame, setTimeFrame] = useState('1M');
    const [activeView, setActiveView] = useState(
        () => localStorage.getItem('activeView') || 'dashboard'
    );
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef(null);
    const casFileInputRef = useRef(null);
    const [liveClock, setLiveClock] = useState(new Date());

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

    useEffect(() => {
        const timer = setInterval(() => setLiveClock(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    }, []);

    useEffect(() => {
        const msg = localStorage.getItem("showLoginToast");
        if (msg) {
            showToast(msg, 'success');
            localStorage.removeItem("showLoginToast");
        }
    }, [showToast]);

    useEffect(() => { localStorage.setItem('activeView', activeView); }, [activeView]);

    const formatCurrency = (val) =>
        new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(val || 0);

    const fmtShort = (val) => {
        const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';
        if (currency === 'INR') {
            if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
            if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
        }
        return formatCurrency(val);
    };
    const formatDate = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
    };

    // ── Value helpers ────────────────────────────────────────────
    const getCurrentValue = useCallback((inv) => {
        const units = Number(inv.units || 0);
        const currentNav = Number(inv.current_nav || 0);
        const navAtBuy = Number(inv.nav_at_buy || 0);

        if (units > 0 && currentNav > 0) {
            return units * currentNav;
        }
        if (units > 0 && navAtBuy > 0) {
            return units * navAtBuy;
        }
        return Number(inv.amount_invested || inv.amount || 0);
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
                const r = await axios.get(`http://localhost:8088/api/investments/user/${userId}/active`, { headers });
                invData = r.data || [];
            } catch (err) {
                console.warn("Failed to fetch investments", err);
            }

            let dbData = null;
            try {
                const r = await axios.get(`http://localhost:8088/api/dashboard/${userId}`, { headers });
                dbData = r.data;
                if (dbData && dbData.profitLoss === undefined)
                    dbData.profitLoss = (dbData.portfolioValue || 0) - (dbData.totalInvested || 0);
            } catch (err) {
                console.warn("Failed to fetch dashboard summary", err);
            }

            setChartLoading(true);
            let histData = [];
            try {
                const points = HISTORY_DAYS[timeFrame] ?? 30;
                const r = await axios.get(`http://localhost:8088/api/dashboard/${userId}/history?days=${points}`, { headers });
                histData = r.data || [];
            } catch (err) {
                console.warn("Failed to fetch history data", err);
            }

            setInvestments(invData);
            setDashboardData(dbData);
            setHistoryData(histData);
        } finally {
            setLoading(false);
            setChartLoading(false);
        }
    }, [user, timeFrame, getCurrentValue]);

    useEffect(() => {
        if (user && (activeView === 'dashboard' || activeView === 'tax' || activeView === 'goals')) {
            fetchAllData();
        }
    }, [user, activeView, timeFrame]);

    // Auto-refresh dashboard data every 60s for real-time graph
    useEffect(() => {
        if (!user || activeView !== 'dashboard') return;
        const interval = setInterval(() => {
            fetchAllData();
        }, 60000);
        return () => clearInterval(interval);
    }, [user, activeView, timeFrame, fetchAllData]);


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
        } catch (err) {
            console.warn("Failed to fetch notifications", err);
        }
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

    const handleCASFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            console.log('Selected PDF file:', file.name);
            parseCASPDF(file);
        } else if (file) {
            showToast('Please select a valid PDF file', 'error');
        }
        // Reset the input value so the same file can be selected again
        if (casFileInputRef.current) {
            casFileInputRef.current.value = '';
        }
    };

    const parseCASPDF = async (file) => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            GlobalWorkerOptions.workerSrc = workerSrc;
            const pdf = await getDocument({ data: arrayBuffer }).promise;
            let allText = '';

            for (let i = 0; i < pdf.numPages; i++) {
                const page = await pdf.getPage(i + 1);
                const textContent = await page.getTextContent();
                allText += textContent.items.map(item => item.str).join(' ') + '\n';
            }

            const casData = extractCASData(allText);
            if (casData && casData.transactions.length > 0) {
                await sendCASDataToBackend(casData);
            } else {
                alert('No transaction data found in PDF');
            }
        } catch (err) {
            console.error('Error parsing PDF:', err);
            showToast('Error parsing PDF file. Please ensure it\'s a valid CAS PDF.', 'error');
        }
    };

    const extractCASData = (text) => {
        const lines = text.split('\n');

        // Extract Financial Year
        let financialYear = '2026-2027';
        for (let line of lines) {
            if (line.includes('Financial Year:')) {
                const match = line.match(/(\d{4}-\d{4})/);
                if (match) financialYear = match[1];
                break;
            }
        }

        // Extract Account Name and ID
        let accountName = 'Unknown';
        let accountId = 'Unknown';
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('Account Name:')) {
                accountName = lines[i].replace(/Account Name:/, '').trim();
            }
            if (lines[i].includes('Account ID:')) {
                accountId = lines[i].replace(/Account ID:/, '').trim();
            }
        }

        // Extract LTCG and STCG
        let ltcg = 0, stcg = 0;
        for (let line of lines) {
            if (line.includes('Long Term Capital Gains') || line.includes('LTCG')) {
                const match = line.match(/Rs\.\s*([-+]?\d+[,\d]*)/);
                if (match) ltcg = parseFloat(match[1].replace(/,/g, ''));
            }
            if (line.includes('Short Term Capital Gains') || line.includes('STCG')) {
                const match = line.match(/Rs\.\s*([-+]?\d+[,\d]*)/);
                if (match) stcg = parseFloat(match[1].replace(/,/g, ''));
            }
        }

        // Extract transactions - look for table data
        const transactions = [];
        const textJoined = text.replace(/\n/g, ' ');
        const textLines = text.split('\n').map(line => line.trim()).filter(Boolean);

        const addTransaction = (candidate) => {
            const key = `${candidate.fundName}|${candidate.buyDate}|${candidate.sellDate}|${candidate.units}|${candidate.gain}|${candidate.type}`;
            if (!transactions.some(tx => `${tx.fundName}|${tx.buyDate}|${tx.sellDate}|${tx.units}|${tx.gain}|${tx.type}` === key)) {
                transactions.push(candidate);
            }
        };

        const normalizeGain = (gainText) => {
            return parseFloat(gainText.replace(/Rs\.?|₹|\s|,/gi, ''));
        };

        const isValidFundName = (fundName) => {
            const trimmed = fundName.trim();
            return trimmed.length >= 5 && !/(Fund Name|Buy Date|Simulated Sell|Gain\/Loss|Type)/i.test(trimmed);
        };

        const fundPattern = /([A-Za-z0-9\s&\-\(\)\.,'\/]+?)\s+(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})\s+(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})\s+([\d,]+(?:\.\d+)?)\s+([+-]?\s*(?:Rs\.?|₹)\s*[\d,]+)\s+(LTCG|STCG)/gi;

        const cleanText = (source) => source.replace(/\s+/g, ' ').trim();

        const tryExtract = (source) => {
            let match;
            while ((match = fundPattern.exec(source)) !== null) {
                const fundName = match[1].trim();
                if (!isValidFundName(fundName)) continue;
                const gainValue = normalizeGain(match[5]);
                if (Number.isNaN(gainValue)) continue;
                addTransaction({
                    fundName,
                    buyDate: parseDate(match[2]),
                    sellDate: parseDate(match[3]),
                    units: parseFloat(match[4].replace(/,/g, '')),
                    gain: gainValue,
                    type: match[6]
                });
            }
        };

        tryExtract(cleanText(textJoined.replace(/Fund Name|Buy Date|Simulated Sell|Units|Gain\/Loss|Type/gi, ' ')));

        if (transactions.length === 0) {
            for (let i = 0; i < textLines.length; i++) {
                let combined = textLines[i];
                tryExtract(cleanText(combined));
                for (let j = i + 1; j < Math.min(i + 3, textLines.length); j++) {
                    combined = `${combined} ${textLines[j]}`;
                    tryExtract(cleanText(combined));
                }
            }
        }

        if (transactions.length === 0) {
            tryExtract(cleanText(textJoined));
        }

        console.log('CAS extraction result:', { financialYear, accountName, accountId, ltcg, stcg, transactions });
        console.log('Transactions details:', transactions);

        return {
            financialYear,
            accountName,
            accountId,
            ltcg,
            stcg,
            transactions
        };
    };

    const parseDate = (dateStr) => {
        // Convert "17 Mar 2026" to "2026-03-17"
        const months = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
            'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };
        const parts = dateStr.trim().split(/\s+/);
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = months[parts[1]] || '01';
            const year = parts[2];
            return `${year}-${month}-${day}`;
        }
        return dateStr;
    };

    const sendCASDataToBackend = async (casData) => {
        if (!user) return;
        try {
            const token = localStorage.getItem('jwt_token');
            const userId = user?.userId || user?.id;

            const payload = {
                user_id: userId,
                financial_year: casData.financialYear,
                account_name: casData.accountName,
                account_id: casData.accountId,
                ltcg: casData.ltcg,
                stcg: casData.stcg,
                transactions: casData.transactions
            };

            console.log('CAS upload payload:', payload);

            const response = await axios.post(
                `http://localhost:8088/api/cas/upload`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log('CAS data saved:', response.data);
            showToast('CAS data uploaded successfully!', 'success');
            fetchAllData(); // Refresh dashboard
        } catch (err) {
            const serverMessage = err?.response?.data?.message || err?.response?.data || err?.message;
            console.error('Error sending CAS data to backend:', err?.response?.status, serverMessage, err);
            showToast(`Error uploading CAS data. ${serverMessage || 'Check PDF format.'}`, 'error');
        }
    };

    const openCASFilePicker = () => {
        casFileInputRef.current?.click();
    };

    // ── Derived metrics ──────────────────────────────────────────
    const metrics = useMemo(() => {
        if (dashboardData) return {
            totalInvested: dashboardData.totalInvested || 0,
            portfolioValue: dashboardData.portfolioValue || 0,
            profitLoss: dashboardData.profitLoss || 0,
            returnPct: dashboardData.returnPercentage || 0,
            realizedPnL: dashboardData.realizedProfitLoss || 0,
        };
        const totalInvested = investments.reduce((s, i) => s + parseFloat(i.amount_invested || i.amount || 0), 0);
        const portfolioValue = investments.reduce((s, i) => s + getCurrentValue(i), 0);
        const profitLoss = portfolioValue - totalInvested;
        const returnPct = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
        return { totalInvested, portfolioValue, profitLoss, returnPct };
    }, [dashboardData, investments, getCurrentValue]);

    const assetAllocation = useMemo(() => {
        return dashboardData?.assetAllocation || [];
    }, [dashboardData]);

    const topPerformers = useMemo(() => {
        if (!investments.length) return { best: null, worst: null };
        const withRet = investments.map(inv => {
            const invested = parseFloat(inv.amount_invested || inv.amount || 0);
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

    const chartDisplayData = useMemo(() => {
        const raw = Array.isArray(historyData) ? historyData : [];
        const normalized = raw
            .map((p) => ({
                date: p.date,
                value: Number(p.value ?? 0),
                invested: Number(p.invested ?? 0),
            }))
            .filter((p) => p.date)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        const maxVal = normalized.reduce((m, p) => Math.max(m, p.value), 0);
        const looksEmpty = normalized.length === 0 || (maxVal <= 0 && (metrics.portfolioValue || 0) > 0);
        if (looksEmpty && (metrics.portfolioValue || 0) > 0) {
            return buildFallbackHistory(timeFrame, metrics.totalInvested, metrics.portfolioValue);
        }
        return normalized;
    }, [historyData, timeFrame, metrics.portfolioValue, metrics.totalInvested]);

    const profitPill = () => {
        const { profitLoss, returnPct } = metrics;
        if (!dashboardData && investments.length === 0) return null;
        if (profitLoss === 0) return <span className="profit-neutral">Break-even</span>;
        const isPos = profitLoss > 0;
        return (
            <div className={`profit-pill ${isPos ? 'pos' : 'neg'}`}>
                {isPos ? <FiArrowUpRight /> : <FiArrowDownRight />}
                {isPos ? '+' : ''}{formatCurrency(Math.abs(profitLoss))}
                <span>({isPos ? '+' : ''}{returnPct.toFixed(2)}%)</span>
            </div>
        );
    };

    return (
        <div className="dashboard-container">
            {toast && (
                <div className={`ww-toast ${toast.type === 'error' ? 'error-toast' : 'success-toast'}`}>
                    <span className="toast-icon">{toast.type === 'error' ? '✕' : '✓'}</span> {toast.message}
                </div>
            )}

            {/* ── SIDEBAR ── */}
            <aside className="dashboard-sidebar">
                <div className="brand">
                    <div className="logo-wrapper">
                        <img src="/logo.png" alt="WealthWise Logo" style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }} />
                    </div>
                    <h2>WealthWise</h2>
                </div>
                <nav className="sidebar-nav">
                    {[
                        { view: 'dashboard', icon: <FiTrendingUp />, label: 'Dashboard' },
                        { view: 'addInvestment', icon: <FiPlus />, label: 'Add Investment' },
                        { view: 'portfolio', icon: <FiBriefcase />, label: 'Portfolio' },
                        { view: 'tax', icon: <FiFileText />, label: 'Tax Reports' },
                        { view: 'goals', icon: <FiTarget />, label: 'Goals' },
                        { view: 'settings', icon: <FiSettings />, label: 'Settings' }
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
                                ? `Welcome back, ${dashboardData?.userName || user?.name || 'Investor'} 👋`
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
                            <FiUser /> {dashboardData?.userName || user?.name || 'User'}
                        </div>
                    </div>
                </header>

                <div className="dashboard-view-content">
                    {activeView === 'dashboard' ? (
                        <div className="premium-dashboard">

                            {/* ── 1. PORTFOLIO GROWTH HERO ── */}
                            <section className="groww-style-hero">
                                <div className="hero-header-groww">
                                    <span className="hero-label-small">Total Portfolio Value</span>
                                    <div className="hero-main-row">
                                        <div className="hero-value-big">{formatCurrency(metrics.portfolioValue)}</div>
                                        <div className={`profit-badge-groww ${metrics.profitLoss >= 0 ? 'pos' : 'neg'}`}>
                                            <span className="profit-badge-tri">{metrics.profitLoss >= 0 ? '▲' : '▼'}</span>
                                            <span className="profit-badge-amt">{metrics.profitLoss >= 0 ? '+' : ''}{formatCurrency(Math.abs(metrics.profitLoss))}</span>
                                            <span className="profit-badge-pct">({metrics.profitLoss >= 0 ? '+' : ''}{metrics.returnPct.toFixed(2)}%)</span>
                                        </div>
                                    </div>

                                    <div className="timeframe-pill-container">
                                        {['1W', '1M', '3M', '6M', '1Y', 'ALL'].map(tf => (
                                            <button
                                                key={tf}
                                                className={`tf-pill ${timeFrame === tf ? 'active' : ''}`}
                                                onClick={() => setTimeFrame(tf)}
                                            >
                                                {tf}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="chart-area-container">
                                    {chartLoading && <div className="chart-skeleton"><div className="skeleton-wave" /></div>}
                                    {chartDisplayData.length === 0 ? (
                                        <div className="chart-empty-hint">Add investments to see portfolio value over time.</div>
                                    ) : (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <ComposedChart
                                            data={chartDisplayData}
                                            margin={{ top: 16, right: 8, left: 0, bottom: 8 }}
                                        >
                                            <defs>
                                                <linearGradient id="gwValGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                                                    <stop offset="55%" stopColor="#3b82f6" stopOpacity={0.08} />
                                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(148,163,184,0.12)" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={{ stroke: 'rgba(148,163,184,0.15)' }}
                                                stroke="rgba(148,163,184,0.15)"
                                                tickLine={false}
                                                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                                                tickFormatter={formatXDate}
                                                minTickGap={48}
                                                dy={8}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                                                tickFormatter={(v) => formatYAxis(v, currency)}
                                                domain={['auto', 'auto']}
                                                width={54}
                                            />
                                            <Tooltip
                                                content={<ChartTooltip currency={currency} />}
                                                cursor={{ stroke: '#64748b', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.6 }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="value"
                                                stroke="#3b82f6"
                                                strokeWidth={2.5}
                                                fill="url(#gwValGrad)"
                                                dot={false}
                                                activeDot={{ r: 5, fill: '#3b82f6', stroke: '#0f172a', strokeWidth: 2 }}
                                                isAnimationActive
                                                animationDuration={500}
                                                animationEasing="ease-in-out"
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="invested"
                                                stroke="#a855f7"
                                                strokeWidth={2}
                                                strokeDasharray="6 5"
                                                dot={false}
                                                activeDot={false}
                                                isAnimationActive
                                                animationDuration={500}
                                                animationEasing="ease-in-out"
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                    )}
                                </div>

                                <div className="chart-footer-legend">
                                    <div className="legend-item-gw">
                                        <div className="l-line blue" />
                                        Current Value
                                    </div>
                                    <div className="legend-item-gw">
                                        <div className="l-line purple" />
                                        Invested
                                    </div>
                                    <div className="live-tag">
                                        <div className="live-dot-pulse" />
                                        Live · {liveClock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </section>

                            {/* ── 2. KPI CARDS ── */}
                            <div className="kpi-grid">
                                {[
                                    { label: 'Total Invested', value: formatCurrency(metrics.totalInvested), icon: <FiDollarSign />, cls: 'i-purple', sub: `${investments.length} holding${investments.length !== 1 ? 's' : ''}` },
                                    { label: 'Portfolio Value', value: formatCurrency(metrics.portfolioValue), icon: <FiBriefcase />, cls: 'i-blue', sub: 'Current market value', highlight: true },
                                    {
                                        label: 'Total Gain / Loss',
                                        value: metrics.profitLoss === 0 ? 'Break-even'
                                            : `${metrics.profitLoss > 0 ? '+' : ''}${formatCurrency(Math.abs(metrics.profitLoss))}`,
                                        icon: metrics.profitLoss >= 0 ? <FiTrendingUp /> : <FiTrendingDown />,
                                        cls: metrics.profitLoss > 0 ? 'i-green' : metrics.profitLoss < 0 ? 'i-red' : 'i-muted',
                                        sub: metrics.realizedPnL !== 0 ? `Incl. ${fmtShort(metrics.realizedPnL)} realized` : `${(metrics.returnPct || 0).toFixed(2)}% overall`,
                                        valueColor: metrics.profitLoss > 0 ? 'pos' : metrics.profitLoss < 0 ? 'neg' : ''
                                    },
                                    {
                                        label: 'Returns %', value: `${(metrics.returnPct || 0) >= 0 ? '+' : ''}${(metrics.returnPct || 0).toFixed(2)}%`,
                                        icon: <FiActivity />, cls: (metrics.returnPct || 0) >= 0 ? 'i-green' : 'i-red',
                                        sub: 'Absolute return', valueColor: (metrics.returnPct || 0) >= 0 ? 'pos' : 'neg'
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
                                                        <Tooltip formatter={(v) => [formatCurrency(v), '']} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '0.85rem' }} />
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
                                                        <span className="legend-val">{formatCurrency(item.value)}</span>
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
                                            {topPerformers.worst && topPerformers.worst.fundId !== topPerformers.best?.fundId && (
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
                                                    <div className={`activity-dot ${inv.investment_type === 'SIP' ? 'blue' : inv.investment_type === 'SELL' ? 'red' : 'green'}`}>
                                                        {inv.investment_type === 'SIP' ? <FiRefreshCw size={11} /> : inv.investment_type === 'SELL' ? <FiArrowDownRight size={11} /> : <FiArrowUpRight size={11} />}
                                                    </div>
                                                    <div className="activity-info">
                                                        <strong>{(inv.scheme_name || `Fund #${inv.fund_id}`).slice(0, 24)}{(inv.scheme_name?.length > 24) ? '…' : ''}</strong>
                                                        <span>{inv.investment_type === 'Lumpsum' ? 'BUY' : inv.investment_type} · {formatDate(inv.buy_date || inv.start_date)}</span>
                                                    </div>
                                                    <div className="activity-amount">{inv.investment_type === 'SELL' ? '-' : '+'}{formatCurrency(inv.amount)}</div>
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

                            {/* ── 6. CAS UPLOAD SECTION ── */}
                            <div className="cas-section">
                                <button className="cas-button" onClick={openCASFilePicker}>
                                    📄 Upload CAS (.pdf)
                                </button>
                                <input
                                    ref={casFileInputRef}
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleCASFileSelect}
                                    hidden
                                />
                            </div>

                        </div>
                    ) : activeView === 'addInvestment' ? (
                        <AddInvestment user={user} currency={currency} onBackToDashboard={() => { fetchAllData(); setActiveView('dashboard'); }} />
                    ) : activeView === 'portfolio' ? (
                        <Portfolio user={user} currency={currency} />
                    ) : activeView === 'tax' ? (
                        <TaxSummary user={user} investments={investments} currency={currency} />
                    ) : activeView === 'profile' ? (
                        <UserProfile user={user} onBack={() => setActiveView('dashboard')} onLogout={onLogout} onProfileUpdate={onProfileUpdate} theme={theme} setTheme={setTheme} />
                    ) : activeView === 'goals' ? (
                        <GoalPlanning user={user} investments={investments} getCurrentValue={getCurrentValue} currency={currency} />
                    ) : activeView === 'settings' ? (
                        <Settings user={user} theme={theme} setTheme={setTheme} currency={currency} setCurrency={setCurrency} />
                    ) : null}
                </div>
            </main>
        </div>
    );
}
