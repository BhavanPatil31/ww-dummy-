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
                // Using user id if exists, default to 1 for dummy/testing
                const userId = user?.id || 1;
                const response = await axios.get(`http://localhost:8088/api/dashboard/${userId}`, {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });
                setDashboardData(response.data);
            } catch (error) {
                console.error("Error fetching dashboard data", error);
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

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <aside className="dashboard-sidebar">
                <div className="brand">
                    <h2>WealthWise</h2>
                </div>
                <nav className="sidebar-nav">
                    <a href="#" className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveView('dashboard'); }}><FiTrendingUp /> Dashboard</a>
                    <a href="#" className={`nav-item ${activeView === 'addInvestment' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveView('addInvestment'); }}><FiPlus /> Add Investment</a>
                    <a href="#" className="nav-item"><FiBriefcase /> Portfolio</a>
                    <a href="#" className="nav-item"><FiTarget /> Goals</a>
                    <a href="#" className="nav-item"><FiFileText /> Tax Reports</a>
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
                        <h1>Welcome back, {user?.name || "Investor"}</h1>
                        <p>Here is your portfolio summary</p>
                    </div>
                    <div className="header-actions">
                        <button className="icon-btn"><FiBell /></button>
                        <div className="profile-btn">
                            <FiUser /> {user?.name || "User"}
                        </div>
                    </div>
                </header>

                {loading && activeView === 'dashboard' ? (
                    <div className="loading">Loading your dashboard...</div>
                ) : activeView === 'addInvestment' ? (
                    <AddInvestment user={user} onBackToDashboard={() => setActiveView('dashboard')} />
                ) : (
                    <div className="dashboard-content">
                        {/* Main Metrics Section */}

                        {/* Metrics Cards */}
                        <div className="metrics-grid">
                            <div className="metric-card">
                                <h3>Total Invested Amount</h3>
                                <div className="value">₹{dashboardData?.totalInvested?.toLocaleString() || "0"}</div>
                            </div>
                            <div className="metric-card">
                                <h3>Total Portfolio Value</h3>
                                <div className="value highlight">₹{dashboardData?.portfolioValue?.toLocaleString() || "0"}</div>
                            </div>
                            <div className="metric-card">
                                <h3>Return Percentage</h3>
                                <div className={`value ${dashboardData?.returnPercentage >= 0 ? 'positive' : 'negative'}`}>
                                    {dashboardData?.returnPercentage >= 0 ? '+' : ''}{dashboardData?.returnPercentage?.toFixed(2) || "0"}%
                                </div>
                            </div>
                        </div>

                        {/* Charts Section */}
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
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                                                <Legend verticalAlign="bottom" height={36} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="no-data">No investment data available to display chart.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
