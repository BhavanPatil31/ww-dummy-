import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url';

GlobalWorkerOptions.workerSrc = workerSrc;

import {
    AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
    FiPlus, FiBriefcase, FiTarget, FiFileText, FiBell, FiUser, FiLogOut,
    FiTrendingUp, FiTrendingDown, FiArrowUpRight, FiArrowDownRight,
    FiDollarSign, FiActivity, FiPieChart, FiZap, FiAward, FiStar,
    FiAlertTriangle, FiRefreshCw, FiClock, FiSettings, FiMessageSquare
} from 'react-icons/fi';
import AddInvestment from './AddInvestment';
import Portfolio from './Portfolio';
import UserProfile from './UserProfile';
import TaxSummary from './TaxSummary';
import GoalPlanning from './GoalPlanning';
import Settings from './Settings';
import AIAssistant from './AIAssistant';
import '../styles/Dashboard.css';

const COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#14b8a6', '#6366f1', '#ec4899'];
const VALID_VIEWS = ['dashboard', 'addInvestment', 'portfolio', 'tax', 'goals', 'profile', 'settings', 'ai-assistant'];

const normalizeCurrency = (value) => {
    const code = String(value || '').toUpperCase();
    return ['INR', 'USD', 'EUR', 'GBP'].includes(code) ? code : 'INR';
};

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

export default function Dashboard({ user, onLogout, onProfileUpdate, theme, setTheme, currency = 'INR', setCurrency }) {
    const logoSrc = `${import.meta.env.BASE_URL}logo.png`;
    const safeCurrency = normalizeCurrency(currency);
    const [investments, setInvestments] = useState([]);
    const [dashboardData, setDashboardData] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [goals, setGoals] = useState([]);
    const [timeFrame, setTimeFrame] = useState('1M');
    const [activeView, setActiveView] = useState(() => {
        const stored = localStorage.getItem('activeView');
        return VALID_VIEWS.includes(stored) ? stored : 'dashboard';
    });
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef(null);
    const casFileInputRef = useRef(null);

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

    const [loginSuccessMsg, setLoginSuccessMsg] = useState("");
    useEffect(() => {
        const timer = setTimeout(() => {
            const msg = localStorage.getItem("showLoginToast");
            if (msg) {
                setLoginSuccessMsg(msg);
                localStorage.removeItem("showLoginToast");
                setTimeout(() => setLoginSuccessMsg(""), 3500);
            }
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const safeView = VALID_VIEWS.includes(activeView) ? activeView : 'dashboard';
        localStorage.setItem('activeView', safeView);
    }, [activeView]);

    const formatCurrency = useCallback((val) =>
        new Intl.NumberFormat(safeCurrency === 'INR' ? 'en-IN' : 'en-US', {
            style: 'currency',
            currency: safeCurrency,
            maximumFractionDigits: 0
        }).format(val || 0), [safeCurrency]);

    const fmt = (val) =>
        new Intl.NumberFormat(safeCurrency === 'INR' ? 'en-IN' : 'en-US', {
            maximumFractionDigits: 0
        }).format(Number(val) || 0);

    const fmtShort = useCallback((val) => {
        const symbol = safeCurrency === 'INR' ? '₹' : safeCurrency === 'USD' ? '$' : safeCurrency === 'EUR' ? '€' : '£';
        if (safeCurrency === 'INR') {
            if (val >= 10000000) return `${symbol}${(val / 10000000).toFixed(2)}Cr`;
            if (val >= 100000) return `${symbol}${(val / 100000).toFixed(2)}L`;
        }
        return formatCurrency(val);
    }, [safeCurrency, formatCurrency]);
    const formatDate = useCallback((d) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
    }, []);

    // ── Value helpers ────────────────────────────────────────────
    const getCurrentValue = useCallback((inv) => {
        const storedUnits = Number(inv.units || 0);
        const currentNav = Number(inv.current_nav || inv.currentNav || 0);
        const navAtBuy = Number(inv.nav_at_buy || inv.navAtBuy || 0);
        const invested = Number(inv.amount_invested || inv.amountInvested || inv.amount || 0);
        const healedUnits = (storedUnits > 0 && navAtBuy > 1.5 && invested > 0 && Math.abs(storedUnits - invested) < 0.0001)
            ? (invested / navAtBuy)
            : storedUnits;
        const units = healedUnits > 0 ? healedUnits : (invested > 0 && navAtBuy > 0 ? invested / navAtBuy : 0);
        const usableCurrentNav = (currentNav > 0 && !(currentNav <= 1.000001 && navAtBuy > 1.5)) ? currentNav : 0;

        if (units > 0 && usableCurrentNav > 0) return units * usableCurrentNav;
        if (units > 0 && navAtBuy > 0) return units * navAtBuy;
        return invested;
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
        const token = localStorage.getItem('jwt_token');

        // Robust userId extraction - handle camelCase, snake_case, or generic id keys
        const userId = user?.userId || user?.user_id || user?.id || (user?.user && (user.user.userId || user.user.user_id || user.user.id));

        if (!userId) {
            console.error("Dashboard: missing userId in user object", user);
            return;
        }

        const headers = { Authorization: `Bearer ${token}` };
        let invData = [];
        try {
            const r = await axios.get(`http://localhost:8088/api/investments/user/${userId}/active`, { headers });
            invData = r.data || [];
        } catch { }

        let dbData = null;
        try {
            const r = await axios.get(`http://localhost:8088/api/dashboard/${userId}`, { headers });
            dbData = r.data;
            if (dbData && dbData.profitLoss === undefined)
                dbData.profitLoss = (dbData.portfolioValue || 0) - (dbData.totalInvested || 0);
        } catch {
            // optional source endpoint
        }

        let goalsData = [];
        try {
            const r = await axios.get(`http://localhost:8088/api/goals/user/${userId}`, { headers });
            goalsData = r.data || [];
        } catch {
            // optional source endpoint
        }

            let histData = [];
            try {
                const points = timeFrame === '1W' ? 7 : timeFrame === '1M' ? 30 : timeFrame === '3M' ? 90 : timeFrame === '6M' ? 180 : timeFrame === '1Y' ? 365 : 36500;
                const r = await axios.get(`http://localhost:8088/api/dashboard/${userId}/history?days=${points}`, { headers });
                histData = r.data || [];
            } catch {
                // optional source endpoint
            }

            // Strict separation: If no investments pass the active filter, force graph to zero
            const hasActive = (invData || []).some(inv => {
                if (inv.end_date || inv.endDate) return false;
                const s = (inv.status || "").toUpperCase();
                return s !== "SOLD" && s !== "CLOSED";
            });

        const livePortfolioValue = (invData || [])
            .filter(inv => {
                if (inv.end_date || inv.endDate) return false;
                const s = (inv.status || "").toUpperCase();
                return s !== "SOLD" && s !== "CLOSED";
            })
            .reduce((sum, inv) => sum + getCurrentValue(inv), 0);

        let resolvedHistory = hasActive ? histData : histData.map(pt => ({ ...pt, value: 0 }));
        const historyAllZero = !resolvedHistory.length || resolvedHistory.every(pt => Number(pt?.value || 0) <= 0);
        if (hasActive && livePortfolioValue > 0 && historyAllZero) {
            const activeInv = (invData || []).filter(inv => {
                if (inv.end_date || inv.endDate) return false;
                const s = (inv.status || "").toUpperCase();
                return s !== "SOLD" && s !== "CLOSED";
            });

            const liveInvested = activeInv.reduce(
                (sum, inv) => sum + Number(inv.amount_invested || inv.amountInvested || inv.amount || 0),
                0
            );
            const earliestDate = activeInv
                .map(inv => new Date(inv.buy_date || inv.buyDate || inv.start_date || inv.startDate || new Date()))
                .sort((a, b) => a - b)[0] || new Date();
            const today = new Date();
            const totalDays = Math.max(1, Math.floor((today - earliestDate) / (1000 * 60 * 60 * 24)));
            const points = resolvedHistory.length ? resolvedHistory : [{ date: today.toISOString().slice(0, 10), value: liveInvested }];

            resolvedHistory = points.map(pt => {
                const d = new Date(pt.date);
                if (isNaN(d.getTime()) || d <= earliestDate) {
                    return { ...pt, value: liveInvested };
                }
                const elapsed = Math.max(0, Math.floor((d - earliestDate) / (1000 * 60 * 60 * 24)));
                const progress = Math.min(1, elapsed / totalDays);
                const synthetic = liveInvested + (livePortfolioValue - liveInvested) * progress;
                return { ...pt, value: Number(synthetic.toFixed(2)) };
            });
        }

            setInvestments(invData);
            setDashboardData(dbData);
            setHistoryData(resolvedHistory);
            setGoals(goalsData);
    }, [user, timeFrame, getCurrentValue]);

    const activeInvestments = useMemo(() => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return (investments || []).filter(inv => {
            // New strict logic: Hide if it has an end date OR it is sold
            if (inv.end_date) return false;
            if (inv.status === 'SOLD' || inv.status === 'CLOSED') return false;

            return true;
        });
    }, [investments]);

    const goalsPreview = useMemo(() => {
        return (goals || []).slice(0, 3).map((goal, index) => {
            const target = Number(goal.target_amount || goal.targetAmount || 0);
            const progress = Number(goal.progress || 0);
            const pct = target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : 0;
            return {
                key: goal.goal_id || goal.id || index,
                name: goal.goal_name || goal.goalName || `Goal ${index + 1}`,
                pct,
                cur: formatCurrency(progress),
                total: formatCurrency(target),
                rem: formatCurrency(Math.max(0, target - progress)),
                color: ['blue', 'purple', 'green'][index % 3]
            };
        });
    }, [goals, formatCurrency]);

    useEffect(() => {
        if (user && (activeView === 'dashboard' || activeView === 'tax' || activeView === 'goals')) {
            const timer = setTimeout(() => {
                fetchAllData();
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [user, activeView, fetchAllData]);

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
        } catch {
            // optional notifications endpoint
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            const timer = setTimeout(() => {
                fetchNotifications();
            }, 0);
            const id = setInterval(fetchNotifications, 15000);
            return () => {
                clearTimeout(timer);
                clearInterval(id);
            };
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
            alert('Please select a valid PDF file');
        }
        // Reset the input value so the same file can be selected again
        if (casFileInputRef.current) {
            casFileInputRef.current.value = '';
        }
    };

    const parseCASPDF = async (file) => {
        try {
            const arrayBuffer = await file.arrayBuffer();
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
            alert('Error parsing PDF file. Please ensure it\'s a valid CAS PDF.');
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

        const fundPattern = /([A-Za-z0-9\s&\-().,'/]+?)\s+(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})\s+(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})\s+([\d,]+(?:\.\d+)?)\s+([+-]?\s*(?:Rs\.?|₹)\s*[\d,]+)\s+(LTCG|STCG)/gi;

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
            fetchAllData(); // Refresh dashboard
            setActiveView('tax');
        } catch (err) {
            const serverMessage = err?.response?.data?.message || err?.response?.data || err?.message;
            console.error('Error sending CAS data to backend:', err?.response?.status, serverMessage, err);
            alert(`Error uploading CAS data. ${serverMessage || 'Please check the PDF format.'}`);
        }
    };

    const openCASFilePicker = () => {
        if (casFileInputRef.current) {
            casFileInputRef.current.value = '';
            casFileInputRef.current.click();
        }
        setActiveView('tax');
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
            const invested = parseFloat(inv.amount_invested || inv.amount || 0);
            const current = getCurrentValue(inv);
            const returnPct = invested > 0 ? ((current - invested) / invested) * 100 : 0;
            return { ...inv, returnPct };
        });
        const sorted = [...withRet].sort((a, b) => b.returnPct - a.returnPct);
        return { best: sorted[0], worst: sorted[sorted.length - 1] };
    }, [investments, getCurrentValue]);

    const recentActivity = useMemo(() =>
        [...activeInvestments]
            .sort((a, b) => new Date(b.buy_date || b.start_date || 0) - new Date(a.buy_date || a.start_date || 0))
            .slice(0, 5),
        [activeInvestments]
    );

    const goalsPreview = useMemo(() => {
        const idOf = (inv) => String(inv?.investment_id || inv?.id || inv?.investmentId);
        return (goals || []).slice(0, 4).map((g, idx) => {
            const target = Number(g.target_amount || g.targetAmount || 0);
            const linked = g.linkedInvestments || [];
            const computed = linked.reduce((sum, li) => {
                const liId = String(li?.investment_id || li);
                const inv = investments.find(i => idOf(i) === liId);
                if (inv) return sum + getCurrentValue(inv);
                return sum + Number(li?.linked_amount || 0);
            }, 0);
            const current = computed;
            const pctRaw = target > 0 ? (current / target) * 100 : 0;
            const pct = Math.max(0, Math.min(100, Math.round(pctRaw)));
            return {
                key: g.goal_id || g.id || idx,
                name: g.goal_name || g.goalName || `Goal ${idx + 1}`,
                pct,
                cur: fmtShort(current),
                total: fmtShort(target),
                rem: fmtShort(Math.max(target - current, 0)),
                color: idx % 2 === 1 ? 'blue' : '',
            };
        });
    }, [goals, investments, getCurrentValue, fmtShort]);

    const insights = useMemo(() => {
        const out = [];
        if (!activeInvestments.length) {
            out.push({ type: 'blue', icon: <FiPlus />, text: 'Add your first investment to start building your wealth portfolio.' });
            return out;
        }
        const types = new Set(activeInvestments.map(inv => inv.investment_type));
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
    }, [activeInvestments, investments.length, metrics.returnPct]);

    const profitPill = () => {
        const { profitLoss, returnPct } = metrics;
        if (!dashboardData && activeInvestments.length === 0) return null;
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
            {loginSuccessMsg && (
                <div className="login-success-toast">
                    <span className="toast-icon">✓</span> {loginSuccessMsg}
                </div>
            )}

            {/* ── SIDEBAR ── */}
            <aside className="dashboard-sidebar">
                <div className="brand">
                    <div className="logo-wrapper">
                        <img src={logoSrc} alt="WealthWise Logo" style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }} />
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
                        { view: 'ai-assistant', icon: <FiMessageSquare />, label: 'AI Assistant' },
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
                                ? `Welcome back, ${user?.name?.split(' ')[0] || 'Investor'} 👋`
                                : activeView === 'profile' ? 'Account Overview'
                                    : activeView === 'addInvestment' ? 'Add Investment'
                                        : activeView === 'portfolio' ? 'My Portfolio'
                                            : activeView === 'tax' ? 'Tax Summary'
                                                : activeView === 'settings' ? 'Settings'
                                                    : activeView === 'ai-assistant' ? 'AI Financial Assistant'
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
                                                    : activeView === 'ai-assistant' ? 'Ask anything about your portfolio, strategy, or tax optimizations'
                                                    : activeView === 'goals' ? 'Set and track your financial milestones'
                                                        : new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="header-actions">
                        <div className="notification-wrapper">
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
                            <section className="growth-hero-card">
                                <div className="hero-top">
                                    <div className="hero-left">
                                        <span className="eyebrow">TOTAL PORTFOLIO VALUE ({currency})</span>
                                        <div className="hero-value-row">
                                            <span className="big-price">₹{fmt(metrics.portfolioValue)}</span>
                                            {profitPill()}
                                        </div>
                                        <div className="timeframe-filters">
                                            {['1W', '1M', '3M', '6M', '1Y', 'ALL'].map(tf => (
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
                                            <strong>{activeInvestments.length}</strong>
                                        </div>
                                        <div className="hero-mini-stat">
                                            <span>Return</span>
                                            <strong className={metrics.returnPct >= 0 ? 'pos' : 'neg'}>
                                                {metrics.returnPct >= 0 ? '+' : ''}{metrics.returnPct.toFixed(2)}%
                                            </strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Chart */}
                                <div className="main-chart-container">
                                    {historyData.length === 0 ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260, flexDirection: 'column', gap: 12, opacity: 0.4 }}>
                                            <FiActivity size={40} />
                                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>No portfolio history yet</p>
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={280}>
                                            <AreaChart data={historyData} margin={{ top: 24, right: 8, left: -10, bottom: 0 }}>
                                                <defs>
                                                    {/* Main area gradient */}
                                                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                                                        <stop offset="60%" stopColor="#3b82f6" stopOpacity={0.08} />
                                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                                    </linearGradient>
                                                    {/* Glow filter on the line */}
                                                    <filter id="lineGlow" x="-10%" y="-80%" width="120%" height="260%">
                                                        <feGaussianBlur stdDeviation="4" result="blur" />
                                                        <feMerge>
                                                            <feMergeNode in="blur" />
                                                            <feMergeNode in="SourceGraphic" />
                                                        </feMerge>
                                                    </filter>
                                                    {/* Horizontal grid lines fade gradient */}
                                                    <linearGradient id="gridFade" x1="0" y1="0" x2="1" y2="0">
                                                        <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                                                        <stop offset="20%" stopColor="rgba(255,255,255,0.05)" />
                                                        <stop offset="80%" stopColor="rgba(255,255,255,0.05)" />
                                                        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                                                    </linearGradient>
                                                </defs>

                                                <CartesianGrid
                                                    strokeDasharray="0"
                                                    vertical={false}
                                                    stroke="rgba(255,255,255,0.045)"
                                                    strokeWidth={1}
                                                />

                                                <XAxis
                                                    dataKey="date"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                                                    interval="preserveStartEnd"
                                                    dy={14}
                                                    padding={{ left: 16, right: 16 }}
                                                />

                                                <YAxis
                                                    hide={false}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                                                    tickFormatter={(v) => {
                                                        if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
                                                        if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
                                                        if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
                                                        return `₹${v}`;
                                                    }}
                                                    width={64}
                                                    domain={['auto', 'auto']}
                                                />

                                                <Tooltip
                                                    content={({ active, payload, label }) => {
                                                        if (!active || !payload?.length) return null;
                                                        const val = payload[0].value;
                                                        const idx = historyData.findIndex(d => d.date === label);
                                                        const prev = idx > 0 ? historyData[idx - 1].value : val;
                                                        const change = val - prev;
                                                        const changePct = prev > 0 ? ((change / prev) * 100).toFixed(2) : '0.00';
                                                        const isPos = change >= 0;
                                                        return (
                                                            <div className="chart-tooltip-pro">
                                                                <div className="ct-date-pro">{label}</div>
                                                                <div className="ct-rows">
                                                                    <div className="ct-row">
                                                                        <span className="ct-dot" style={{ background: '#3b82f6' }} />
                                                                        <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Portfolio</span>
                                                                        <span style={{ marginLeft: 'auto', fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>
                                                                            ₹{new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Daily Change</span>
                                                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isPos ? '#4ade80' : '#f87171' }}>
                                                                        {isPos ? '+' : ''}₹{new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.abs(change))} ({isPos ? '+' : ''}{changePct}%)
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    }}
                                                    cursor={{ stroke: 'rgba(59,130,246,0.25)', strokeWidth: 1, strokeDasharray: '4 2' }}
                                                />

                                                {/* Shadow beneath line for depth */}
                                                <Area
                                                    type="monotoneX"
                                                    dataKey="value"
                                                    stroke="transparent"
                                                    fill="url(#areaGrad)"
                                                    fillOpacity={1}
                                                    dot={false}
                                                    activeDot={false}
                                                    strokeWidth={0}
                                                />

                                                {/* Main glowing line */}
                                                <Area
                                                    type="monotoneX"
                                                    dataKey="value"
                                                    stroke="#3b82f6"
                                                    strokeWidth={2.5}
                                                    fill="none"
                                                    dot={false}
                                                    activeDot={{
                                                        r: 6,
                                                        fill: '#3b82f6',
                                                        stroke: '#fff',
                                                        strokeWidth: 2.5,
                                                        filter: 'url(#lineGlow)'
                                                    }}
                                                    style={{ filter: 'url(#lineGlow)' }}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
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
                                    {activeInvestments.length === 0 ? (
                                        <div className="empty-state-sm"><FiPieChart /><p>Add investments to see allocation</p></div>
                                    ) : (
                                        <>
                                            <div className="donut-wrapper">
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <PieChart>
                                                        <Pie
                                                            data={assetAllocation}
                                                            innerRadius={45}
                                                            outerRadius={65}
                                                            paddingAngle={4}
                                                            dataKey="value"
                                                            stroke="none"
                                                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                                            labelLine={true}
                                                            fill="#fff"
                                                            style={{ fontSize: '11px', fontWeight: 'bold' }}
                                                        >
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
                                            {/* FIX 5: was comparing .fundId (camelCase) — correct field is .fund_id (snake_case) */}
                                            {topPerformers.worst && topPerformers.worst.fund_id !== topPerformers.best?.fund_id && (
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
                                {goalsPreview.length === 0 ? (
                                    <div className="empty-state-sm"><FiTarget /><p>No goals created yet</p></div>
                                ) : (
                                    <div className="goals-grid">
                                        {goalsPreview.map((g) => (
                                            <div key={g.key} className="goal-card">
                                                <div className="goal-header">
                                                    <span>{g.name}</span>
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
                                )}
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
                        <TaxSummary user={user} investments={investments} currency={currency} onOpenCAS={openCASFilePicker} />
                    ) : activeView === 'profile' ? (
                        <UserProfile user={user} onBack={() => setActiveView('dashboard')} onLogout={onLogout} onProfileUpdate={onProfileUpdate} theme={theme} setTheme={setTheme} />
                    ) : activeView === 'goals' ? (
                        <GoalPlanning user={user} investments={investments} getCurrentValue={getCurrentValue} currency={currency} />
                    ) : activeView === 'settings' ? (
                        <Settings user={user} theme={theme} setTheme={setTheme} currency={currency} setCurrency={setCurrency} />
                    ) : activeView === 'ai-assistant' ? (
                        <AIAssistant user={user} />
                    ) : null}
                </div>
                <input
                    ref={casFileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleCASFileSelect}
                    hidden
                />
            </main>
        </div>
    );
}
