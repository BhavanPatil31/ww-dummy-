import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiShield, FiBell, FiMonitor, FiLock,
    FiSmartphone, FiEye, FiDownload, FiTrash2, FiSave, FiCheckCircle
} from 'react-icons/fi';
import axios from 'axios';
import '../styles/Settings.css';

export default function Settings({ user, theme, setTheme }) {
    // --- STATE MANAGEMENT ---
    const [activeTab, setActiveTab] = useState('security');
    const [isLoading, setIsLoading] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // 1. Security State
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    // 2. Notification State
    const [notifications, setNotifications] = useState({
        push: true,
        emailSummary: true,
        tradeAlerts: true,
        promo: false
    });

    // 3. Appearance State
    const [currency, setCurrency] = useState('USD');

    // 4. Privacy State
    const [privacy, setPrivacy] = useState({
        profileVisibility: true
    });

    // --- HANDLERS ---
    const handlePasswordChange = (e) => {
        setPasswords(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const toggleNotif = (key) => {
        setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const togglePrivacy = (key) => {
        setPrivacy(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            alert("New passwords do not match!");
            return;
        }

        setIsLoading(true);
        setSaveSuccess(false);

        try {
            const token = localStorage.getItem('jwt_token');
            const headers = { Authorization: `Bearer ${token}` };
            await axios.post('http://localhost:8088/api/auth/reset-password', {
                email: user?.email,
                newPassword: passwords.new
            }, { headers });
            setSaveSuccess(true);
            setPasswords({ current: '', new: '', confirm: '' });
            setTimeout(() => setSaveSuccess(false), 3000); 
        } catch (error) {
            alert(error.response?.data?.error || "Failed to update password.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogoutAll = () => {
        if (!window.confirm("Log out of all active sessions?")) return;
        localStorage.clear();
        window.location.reload();
    };

    const handleExport = async () => {
        try {
            const token = localStorage.getItem('jwt_token');
            const headers = { Authorization: `Bearer ${token}` };
            const uid = user?.userId || user?.id;
            const response = await axios.get(`http://localhost:8088/api/portfolio/export/${uid}`, { 
                headers, 
                responseType: 'blob' 
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `wealthwise_portfolio_${uid}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            alert("Failed to export data");
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("Are you absolutely sure you want to delete your account? This action cannot be undone.")) return;
        
        try {
            const token = localStorage.getItem('jwt_token');
            const headers = { Authorization: `Bearer ${token}` };
            const uid = user?.userId || user?.id;
            await axios.delete(`http://localhost:8088/api/auth/delete/${uid}`, { headers });
            alert("Account deleted securely.");
            localStorage.clear();
            window.location.reload();
        } catch (error) {
            alert(error.response?.data?.error || "Failed to delete account.");
        }
    };

    // --- CONFIG ---
    const tabs = [
        { id: 'security', label: 'Security & Login', icon: <FiShield /> },
        { id: 'notifications', label: 'Notifications', icon: <FiBell /> },
        { id: 'privacy', label: 'Privacy & Data', icon: <FiEye /> }
    ];

    // Animation settings for smoother transitions
    const pageTransition = {
        initial: { opacity: 0, y: 10, filter: 'blur(4px)' },
        animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
        exit: { opacity: 0, y: -10, filter: 'blur(4px)' },
        transition: { duration: 0.3, ease: "easeOut" }
    };

    // --- RENDERERS ---
    const renderContent = () => {
        switch (activeTab) {
            case 'security':
                return (
                    <motion.div {...pageTransition}>
                        <div className="settings-section-header">
                            <h2>Security & Login</h2>
                            <p>Manage your password, two-factor authentication, and active sessions.</p>
                        </div>

                        <form className="settings-form" onSubmit={handleSave}>
                            <div className="settings-input-group">
                                <label>Current Password</label>
                                <div className="input-wrapper" style={{ position: 'relative' }}>
                                    <FiLock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <input
                                        type="password"
                                        name="current"
                                        value={passwords.current}
                                        onChange={handlePasswordChange}
                                        placeholder="Enter current password"
                                        style={{ paddingLeft: '2.5rem' }}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="settings-input-group">
                                <label>New Password</label>
                                <div className="input-wrapper" style={{ position: 'relative' }}>
                                    <FiLock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <input
                                        type="password"
                                        name="new"
                                        value={passwords.new}
                                        onChange={handlePasswordChange}
                                        placeholder="Enter new password"
                                        style={{ paddingLeft: '2.5rem' }}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="settings-input-group">
                                <label>Confirm New Password</label>
                                <div className="input-wrapper" style={{ position: 'relative' }}>
                                    <FiLock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <input
                                        type="password"
                                        name="confirm"
                                        value={passwords.confirm}
                                        onChange={handlePasswordChange}
                                        placeholder="Confirm new password"
                                        style={{ paddingLeft: '2.5rem' }}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                                <button type="submit" className="btn-primary" disabled={isLoading} style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {isLoading ? <span className="loader-spinner"></span> : <FiSave />}
                                    {isLoading ? 'Updating...' : 'Update Password'}
                                </button>
                                {saveSuccess && <span style={{ color: 'var(--success-color, #10b981)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem' }}><FiCheckCircle /> Updated successfully</span>}
                            </div>
                        </form>

                        <div className="settings-divider" style={{ height: '1px', background: 'var(--border-color)', margin: '2.5rem 0' }}></div>

                        <div className="settings-advanced-section">
                            <div className="setting-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', marginBottom: '1rem' }}>
                                <div className="setting-info">
                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiSmartphone /> Two-Factor Authentication (2FA)</h4>
                                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Add an extra layer of security using an authenticator app.</p>
                                </div>
                                <button className="btn-secondary" style={{ padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>Enable 2FA</button>
                            </div>

                            <div className="setting-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                                <div className="setting-info">
                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiMonitor /> Active Sessions</h4>
                                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Currently logged in on 1 device (Windows - Chrome).</p>
                                </div>
                                <button onClick={handleLogoutAll} className="btn-danger" style={{ padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', background: 'transparent', border: '1px solid var(--danger-color, #ef4444)', color: 'var(--danger-color, #ef4444)' }}>Log out all</button>
                            </div>
                        </div>
                    </motion.div>
                );

            case 'notifications':
                return (
                    <motion.div {...pageTransition}>
                        <div className="settings-section-header">
                            <h2>Notification Preferences</h2>
                            <p>Choose what updates you want to receive and how you receive them.</p>
                        </div>

                        <div className="settings-toggles-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2rem' }}>
                            {Object.entries({
                                push: { title: 'Push Notifications', desc: 'Receive instant alerts in your browser when important events occur.' },
                                emailSummary: { title: 'Weekly Email Summaries', desc: 'Receive a weekly digest of your portfolio\'s performance.' },
                                tradeAlerts: { title: 'Transaction & Trade Alerts', desc: 'Get notified immediately when a transaction is successful or fails.' },
                                promo: { title: 'Promotional & Offers', desc: 'Receive emails about new features, offers, and premium upgrades.' }
                            }).map(([key, data]) => (
                                <div key={key} className="setting-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                                    <div className="setting-info" style={{ maxWidth: '80%' }}>
                                        <h4 style={{ marginBottom: '0.25rem' }}>{data.title}</h4>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>{data.desc}</p>
                                    </div>
                                    <div
                                        className={`custom-switch ${notifications[key] ? 'on' : 'off'}`}
                                        onClick={() => toggleNotif(key)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="switch-handle"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                );


            case 'privacy':
                return (
                    <motion.div {...pageTransition}>
                        <div className="settings-section-header">
                            <h2>Privacy & Data</h2>
                            <p>Manage your data, visibility, and account lifecycle.</p>
                        </div>

                        <div className="setting-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                            <div className="setting-info">
                                <h4>Profile Visibility</h4>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>Allow others to search for your public profile.</p>
                            </div>
                            <div
                                className={`custom-switch ${privacy.profileVisibility ? 'on' : 'off'}`}
                                onClick={() => togglePrivacy('profileVisibility')}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="switch-handle"></div>
                            </div>
                        </div>

                        <div className="setting-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <div className="setting-info">
                                <h4>Default Currency</h4>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>Choose the currency for displaying your portfolio value.</p>
                            </div>
                            <select
                                className="settings-select"
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                style={{
                                    padding: '0.6rem 1rem',
                                    borderRadius: '8px',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    minWidth: '180px',
                                    fontSize: '0.9rem'
                                }}
                            >
                                <option value="INR">₹ INR (Indian Rupee)</option>
                                <option value="USD">$ USD (US Dollar)</option>
                                <option value="EUR">€ EUR (Euro)</option>
                                <option value="GBP">£ GBP (British Pound)</option>
                            </select>
                        </div>

                        <div className="setting-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <div className="setting-info">
                                <h4>Download My Data</h4>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>Export a secure CSV of your complete investment history.</p>
                            </div>
                            <button onClick={handleExport} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '0.6rem 1rem' }}>
                                <FiDownload /> Export CSV
                            </button>
                        </div>

                        <div className="setting-item" style={{ marginTop: '2.5rem', padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <div className="setting-info" style={{ marginBottom: '1rem' }}>
                                <h4 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiTrash2 /> Danger Zone</h4>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                    Permanently delete your account and all associated data. This action is immediate and irreversible.
                                </p>
                            </div>
                            <button onClick={handleDeleteAccount} className="btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#ef4444', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Delete Account
                            </button>
                        </div>
                    </motion.div>
                );

            default: return null;
        }
    };

    return (
        <div className="settings-wrapper" style={{ display: 'flex', gap: '2rem', minHeight: '70vh' }}>
            {/* Sidebar Navigation */}
            <div className="settings-sidebar" style={{ minWidth: '250px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`settings-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '1rem',
                            borderRadius: '12px',
                            border: 'none',
                            background: activeTab === tab.id ? 'var(--bg-secondary)' : 'transparent',
                            color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-secondary)',
                            fontWeight: activeTab === tab.id ? '600' : '500',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <span style={{ fontSize: '1.2rem' }}>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="settings-content-area" style={{ flex: 1, padding: '0 1rem' }}>
                <AnimatePresence mode='wait'>
                    {renderContent()}
                </AnimatePresence>
            </div>
        </div>
    );
}