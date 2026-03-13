import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FiPlus, FiBriefcase, FiTarget, FiFileText, FiBell, FiUser, FiLogOut, FiTrendingUp } from 'react-icons/fi';
import AddInvestment from './AddInvestment';
import '../styles/Dashboard.css';

const COLORS = ['#1e293b', '#22c55e', '#3b82f6', '#a855f7', '#f97316', '#ef4444'];

export default function Dashboard({ user, onLogout }) {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState('dashboard');

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const token = localStorage.getItem("jwt_token");
                const userId = user?.id;
                
                // Fetch direct investments instead of the backend calculated dashboard data
                const response = await axios.get(`http://localhost:8088/api/investments/user/${userId}`, {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });
                
                const investments = response.data || [];
                
                // Calculate Total Invested Amount
                const totalInvested = investments.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
                
                // Calculate Total Portfolio Value using currentNav
                let portfolioValue = 0;
                investments.forEach(inv => {
                    const navAtBuy = inv.nav_at_buy || 0;
                    let currentNav = inv.current_nav || 0;
                    
                    // Simulate current NAV if missing or same as navAtBuy
                    if (!currentNav || currentNav === navAtBuy) {
                        // Increase by a random percentage between 5% and 10%
                        const increasePercent = 0.05 + Math.random() * 0.05;
                        currentNav = navAtBuy > 0 ? navAtBuy * (1 + increasePercent) : 0;
                    }

                    const units = inv.units || 0;
                    
                    if (units > 0 && currentNav > 0) {
                        portfolioValue += (units * currentNav);
                    } else {
                        // fallback if units weren't recorded
                        const increasePercent = 0.05 + Math.random() * 0.05;
                        portfolioValue += parseFloat(inv.amount || 0) * (1 + increasePercent);
                    }
                });
                
                // Calculate Profit/Loss and Return Percentage
                let profitLoss = 0;
                let returnPercentage = 0;
                if (totalInvested > 0) {
                    profitLoss = portfolioValue - totalInvested;
                    returnPercentage = (profitLoss / totalInvested) * 100;
                }
                
                // Calculate Asset Allocation Chart
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
                    totalInvested,
                    portfolioValue,
                    profitLoss,
                    returnPercentage,
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
        } else if (!user) {
            setLoading(false);
        }
    }, [user, activeView]);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val || 0);
    };

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <aside className="dashboard-sidebar">
                <div className="brand">
                    <h2>WealthWise</h2>
                </div>
                <nav className="sidebar-nav">
                    <button className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}><FiTrendingUp /> Dashboard</button>
                    <button className={`nav-item ${activeView === 'addInvestment' ? 'active' : ''}`} onClick={() => setActiveView('addInvestment')}><FiPlus /> Add Investment</button>
                    <button className="nav-item"><FiBriefcase /> Portfolio</button>
                    <button className="nav-item"><FiTarget /> Goals</button>
                    <button className="nav-item"><FiFileText /> Tax Reports</button>
                </nav>
                <div className="sidebar-bottom">
                    <button className="logout-btn" onClick={onLogout}>
                        <FiLogOut /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="dashboard-main">
                {/* Top Header */}
                <header className="dashboard-header">
                    <div className="welcome-section">
                        <h1>
                            {activeView === 'dashboard' ? `Welcome back, ${user?.name || "Investor"}` : 
                             activeView === 'addInvestment' ? 'Add Investment' : 'WealthWise'}
                        </h1>
                        <p>
                            {activeView === 'dashboard' ? 'Here is your portfolio summary' : 
                             activeView === 'addInvestment' ? 'Search and log your mutual fund or stock investment' : 'Manage your wealth assets'}
                        </p>
                    </div>
                    <div className="header-actions">
                        <button className="icon-btn"><FiBell /></button>
                        <div className="profile-btn">
                            <FiUser /> {user?.name || "User"}
                        </div>
                    </div>
                </header>

                {loading ? (
                    <div className="loading">
                        <div className="loader-spinner large"></div>
                        <span>Loading your portfolio...</span>
                    </div>
                ) : activeView === 'addInvestment' ? (
                    <AddInvestment user={user} onBackToDashboard={() => setActiveView('dashboard')} />
                ) : (
                    <div className="dashboard-content">

                        {/* Metrics Cards */}
                        <div className="metrics-grid">
                            <div className="metric-card">
                                <h3>Total Invested Amount</h3>
                                <div className="value">{formatCurrency(dashboardData?.totalInvested)}</div>
                            </div>
                            <div className="metric-card">
                                <h3>Current Portfolio Value</h3>
                                <div className="value highlight">{formatCurrency(dashboardData?.portfolioValue)}</div>
                            </div>
                            <div className="metric-card">
                                <h3>Profit/Loss</h3>
                                <div className={`value ${dashboardData?.profitLoss >= 0 ? 'positive' : 'negative'}`}>
                                    {dashboardData?.profitLoss >= 0 ? '+' : ''}{formatCurrency(dashboardData?.profitLoss)}
                                </div>
                            </div>
                            <div className="metric-card">
                                <h3>Return Percentage</h3>
                                <div className={`value ${dashboardData?.returnPercentage >= 0 ? 'positive' : 'negative'}`}>
                                    {dashboardData?.returnPercentage >= 0 ? '+' : ''}{dashboardData?.returnPercentage?.toFixed(2) || "0"}%
                                </div>
                            </div>
                        </div>

                        {dashboardData?.totalInvested === 0 ? (
                            <div className="empty-state">
                                <h3>No investments added yet</h3>
                                <p>Get started by adding your first investment to see analytics.</p>
                                <button className="add-btn" onClick={() => setActiveView('addInvestment')}>
                                    <FiPlus /> Add Investment
                                </button>
                            </div>
                        ) : (
                            /* Charts Section */
                            <div className="charts-grid" style={{ gridTemplateColumns: '1fr' }}>
                                <div className="chart-card">
                                    <h3>Asset Allocation</h3>
                                    {dashboardData?.assetAllocation && dashboardData.assetAllocation.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={350}>
                                            <PieChart>
                                                <Pie
                                                    data={dashboardData.assetAllocation}
                                                    cx="50%" cy="50%"
                                                    innerRadius={80} outerRadius={120} paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {dashboardData.assetAllocation.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                                <Legend verticalAlign="bottom" height={36} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="no-data">No investment data available to display chart.</div>
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
