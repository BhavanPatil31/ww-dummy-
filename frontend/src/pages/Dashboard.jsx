import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FiPlus, FiBriefcase, FiTarget, FiFileText, FiBell, FiUser, FiLogOut, FiTrendingUp } from 'react-icons/fi';
import AddInvestment from './AddInvestment';
import Portfolio from './Portfolio';
import '../styles/Dashboard.css';

const COLORS = ['#1e293b', '#22c55e', '#3b82f6', '#a855f7', '#f97316', '#ef4444'];

export default function Dashboard({ user, onLogout, onOpenProfile }) {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Initialize from localStorage or default to 'dashboard'
    const [activeView, setActiveView] = useState(() => {
        return localStorage.getItem("activeView") || 'dashboard';
    });

    // Save activeView to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem("activeView", activeView);
    }, [activeView]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const token = localStorage.getItem("jwt_token");
                const userId = user?.id || 1;
                const response = await axios.get(`http://localhost:8088/api/dashboard/${userId}`, {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });
                setDashboardData(response.data);
            } catch (error) {
                console.error("Error fetching dashboard data", error);
                const userId = user?.id;

                // Separate fetch for investments and summary to avoid one failure blocking everything
                let investments = [];
                let portfolio = null;

                try {
                    const invRes = await axios.get(`http://localhost:8088/api/investments/user/${userId}`, {
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    investments = invRes.data || [];
                } catch (e) {
                    console.error("Error fetching investments", e);
                }

                try {
                    const portRes = await axios.get(`http://localhost:8088/api/portfolio/user/${userId}`, {
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    portfolio = portRes.data;
                } catch (e) {
                    console.error("Error fetching portfolio summary", e);
                }

                // Calculate Asset Allocation Chart locally from investments
                const assetMap = {};
                investments.forEach(inv => {
                    const type = inv.asset_category || inv.investment_type || 'Other';
                    assetMap[type] = (assetMap[type] || 0) + (parseFloat(inv.amount) || 0);
                });

                const assetAllocation = Object.keys(assetMap).map(key => ({
                    name: key,
                    value: assetMap[key]
                }));

                setDashboardData({
                    totalInvested: portfolio?.total_invested || 0,
                    portfolioValue: portfolio?.current_value || 0,
                    profitLoss: (portfolio?.current_value || 0) - (portfolio?.total_invested || 0),
                    returnPercentage: portfolio?.return_percentage || 0,
                    assetAllocation
                });

            } catch (error) {
                console.error("Error fetching dashboard data", error);

                // Set fallback empty state on error
                setDashboardData({
                    totalInvested: 0,
                    portfolioValue: 0,
                    profitLoss: 0,
                    returnPercentage: 0,
                    assetAllocation: []
                });
            } finally {
                setLoading(false);
            }
        };

        if (user && activeView === 'dashboard') {
            fetchDashboardData();
        } else {
            // Immediately stop global loading for other views so they can render their own loaders/content
            setLoading(false);
        }
    }, [user, activeView]);

    return (
        <div className="dashboard-container">

            <aside className="dashboard-sidebar">
                <div className="brand">
                    <h2>WealthWise</h2>
                </div>
                <nav className="sidebar-nav">

                    <a href="#"
                        className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
                        onClick={(e) => { e.preventDefault(); setActiveView('dashboard'); }}>
                        <FiTrendingUp /> Dashboard
                    </a>

                    <a href="#"
                        className={`nav-item ${activeView === 'addInvestment' ? 'active' : ''}`}
                        onClick={(e) => { e.preventDefault(); setActiveView('addInvestment'); }}>
                        <FiPlus /> Add Investment
                    </a>

                    <a href="#" className="nav-item">
                        <FiBriefcase /> Portfolio
                    </a>

                    <a href="#" className="nav-item">
                        <FiTarget /> Goals
                    </a>

                    <a href="#" className="nav-item">
                        <FiFileText /> Tax Reports
                    </a>

                    <a href="#"
                        className="nav-item"
                        onClick={(e) => { e.preventDefault(); onOpenProfile(); }}>
                        <FiUser /> My Profile
                    </a>

                    <button className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}><FiTrendingUp /> Dashboard</button>
                    <button className={`nav-item ${activeView === 'addInvestment' ? 'active' : ''}`} onClick={() => setActiveView('addInvestment')}><FiPlus /> Add Investment</button>
                    <button className={`nav-item ${activeView === 'portfolio' ? 'active' : ''}`} onClick={() => setActiveView('portfolio')}><FiBriefcase /> Portfolio</button>
                    <button className="nav-item"><FiTarget /> Goals</button>
                    <button className="nav-item"><FiFileText /> Tax Reports</button>
                </nav>
                <div className="sidebar-bottom">
                    <button className="logout-btn" onClick={onLogout}>
                        <FiLogOut /> Logout
                    </button>
                </div>
            </aside>

            <main className="dashboard-main">
                <header className="dashboard-header">
                    <div className="welcome-section">
                        <h1>Welcome back, {user?.name || "Investor"}</h1>
                        <p>Here is your portfolio summary</p>
                    </div>
                    <div className="header-actions">
                        <button className="icon-btn"><FiBell /></button>
                        <div
                            className="profile-btn"
                            onClick={onOpenProfile}
                            style={{ cursor: "pointer" }}
                            title="View My Profile">
                            <FiUser /> {user?.name || "User"}
                        </div>
                    </div>
                </header>

                {loading && activeView === 'dashboard' ? (
                    <div className="loading">Loading your dashboard...</div>

                ) : activeView === 'addInvestment' ? (
                    <AddInvestment
                        user={user}
                        onBackToDashboard={() => setActiveView('dashboard')}
                    />

                    <AddInvestment user={user} onBackToDashboard={() => setActiveView('dashboard')} />
                ) : activeView === 'portfolio' ? (
                    <Portfolio user={user} />
                ) : (
                    <div className="dashboard-content">
                        <div className="metrics-grid">
                            <div className="metric-card">
                                <h3>Total Invested Amount</h3>
                                <div className="value">
                                    ₹{dashboardData?.totalInvested?.toLocaleString() || "0"}
                                </div>
                            </div>
                            <div className="metric-card">
                                <h3>Total Portfolio Value</h3>
                                <div className="value highlight">
                                    ₹{dashboardData?.portfolioValue?.toLocaleString() || "0"}
                                </div>
                            </div>
                            <div className="metric-card">
                                <h3>Return Percentage</h3>
                                <div className={`value ${dashboardData?.returnPercentage >= 0 ? 'positive' : 'negative'}`}>
                                    {dashboardData?.returnPercentage >= 0 ? '+' : ''}
                                    {dashboardData?.returnPercentage?.toFixed(2) || "0"}%
                                </div>
                            </div>
                        </div>

                        <div className="charts-section">
                            <div className="chart-card">
                                <h3>Asset Allocation</h3>
                                {dashboardData?.assetAllocation && dashboardData.assetAllocation.length > 0 ? (
                                    <div className="pie-chart-container">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={dashboardData.assetAllocation}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={80}
                                                    outerRadius={110}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                >
                                                    {dashboardData.assetAllocation.map((entry, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={COLORS[index % COLORS.length]}
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value) => `₹${value.toLocaleString()}`}
                                                />
                                                <Legend verticalAlign="bottom" height={36} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="no-data">
                                        No investment data available to display chart.
                                    </div>
                                )}
                            </div>
                        </div>
                        )}

                    </div>
                )}
            </main>
        </div>
    );
}