import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiRotateCcw, FiTrash2, FiAlertCircle, FiRefreshCw, FiX, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

export default function DeletedHistory({ user }) {
    const [deletedItems, setDeletedItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionId, setActionId] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ show: false, type: null, item: null });

    const userId = user?.userId || user?.id || user?.user_id;

    const fetchDeleted = async () => {
        if (!userId) {
            console.warn("DeletedHistory: No userId found in user object", user);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const token = localStorage.getItem('jwt_token');
            const headers = { Authorization: `Bearer ${token}` };
            const response = await axios.get(`http://localhost:8088/api/investments/user/${userId}/deleted`, { headers });
            setDeletedItems(response.data);
        } catch (error) {
            console.error("Failed to fetch deleted history", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDeleted();
    }, [userId]);

    const handleActionClick = (type, item) => {
        setConfirmModal({ show: true, type, item });
    };

    const closeConfirm = () => {
        setConfirmModal({ show: false, type: null, item: null });
    };

    const confirmAction = async () => {
        const { type, item } = confirmModal;
        const id = item.investment_id || item.id;
        closeConfirm();
        
        setActionId(id);
        try {
            const token = localStorage.getItem('jwt_token');
            const headers = { Authorization: `Bearer ${token}` };
            
            if (type === 'recover') {
                await axios.post(`http://localhost:8088/api/investments/${id}/recover`, {}, { headers });
            } else {
                await axios.delete(`http://localhost:8088/api/investments/${id}/permanent`, { headers });
            }
            
            setDeletedItems(prev => prev.filter(i => (i.investment_id || i.id) !== id));
        } catch (error) {
            console.error(`Failed to ${type} investment`, error);
            alert(`Failed to ${type} investment`);
        } finally {
            setActionId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="deleted-history-loading" style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <span className="loader-spinner"></span>
            </div>
        );
    }

    return (
        <div className="deleted-history-container">
            <div className="settings-section-header">
                <h2>Deleted History</h2>
                <p>Recover investments deleted within the last 30 days or delete them permanently.</p>
            </div>

            {deletedItems.length === 0 ? (
                <div className="empty-history" style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-secondary)', borderRadius: '16px', marginTop: '2rem' }}>
                    <FiTrash2 size={48} style={{ color: 'var(--text-secondary)', opacity: 0.3, marginBottom: '1rem' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>No deleted investments found.</p>
                </div>
            ) : (
                <div className="deleted-items-list" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <AnimatePresence>
                        {deletedItems.map((item) => (
                            <motion.div
                                key={item.investment_id || item.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="deleted-item-card"
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1.25rem',
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-color)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div className="item-info">
                                    <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>{item.scheme_name}</h4>
                                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        Invested: ₹{item.amount?.toLocaleString('en-IN')} • Deleted on: {item.deleted_at ? new Date(item.deleted_at).toLocaleDateString() : 'Unknown'}
                                    </p>
                                </div>
                                
                                <div className="item-actions" style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button
                                        onClick={() => handleActionClick('recover', item)}
                                        disabled={actionId === (item.investment_id || item.id)}
                                        className="recover-btn"
                                        title="Recover Investment"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            padding: '0.6rem 1rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--primary-color)',
                                            background: 'transparent',
                                            color: 'var(--primary-color)',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem',
                                            fontWeight: '500',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {actionId === (item.investment_id || item.id) ? <FiRefreshCw className="spin" /> : <FiRotateCcw />}
                                        Recover
                                    </button>
                                    <button
                                        onClick={() => handleActionClick('delete', item)}
                                        disabled={actionId === (item.investment_id || item.id)}
                                        className="perm-delete-btn"
                                        title="Delete Permanently"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                            background: 'rgba(239, 68, 68, 0.05)',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            <div className="deleted-history-footer" style={{ marginTop: '2.5rem', padding: '1.25rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <FiAlertCircle style={{ color: 'var(--primary-color)', marginTop: '0.2rem', flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Recovered investments will reappear in your active portfolio with their original historical data and performance metrics intact.
                </p>
            </div>

            {/* Custom Confirmation Modal */}
            <AnimatePresence>
                {confirmModal.show && (
                    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={closeConfirm}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="modal-card" 
                            style={{ width: '90%', maxWidth: '400px', background: 'var(--bg-primary)', borderRadius: '20px', padding: '2rem', border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ 
                                    width: '64px', 
                                    height: '64px', 
                                    borderRadius: '50%', 
                                    background: confirmModal.type === 'delete' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    margin: '0 auto 1.5rem',
                                    color: confirmModal.type === 'delete' ? '#ef4444' : 'var(--primary-color)',
                                    fontSize: '24px'
                                }}>
                                    {confirmModal.type === 'delete' ? <FiAlertTriangle /> : <FiRotateCcw />}
                                </div>
                                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                                    {confirmModal.type === 'delete' ? 'Permanently Delete?' : 'Recover Investment?'}
                                </h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 2rem' }}>
                                    {confirmModal.type === 'delete' 
                                        ? `Are you sure you want to permanently remove "${confirmModal.item?.scheme_name}"? This action cannot be undone.`
                                        : `Do you want to restore "${confirmModal.item?.scheme_name}" back to your active portfolio?`}
                                </p>
                                
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button 
                                        onClick={closeConfirm}
                                        style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '600' }}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={confirmAction}
                                        style={{ 
                                            flex: 1, 
                                            padding: '0.75rem', 
                                            borderRadius: '10px', 
                                            border: 'none', 
                                            background: confirmModal.type === 'delete' ? '#ef4444' : 'var(--primary-color)', 
                                            color: 'white', 
                                            cursor: 'pointer', 
                                            fontWeight: '600',
                                            boxShadow: confirmModal.type === 'delete' ? '0 4px 14px rgba(239, 68, 68, 0.4)' : '0 4px 14px rgba(59, 130, 246, 0.4)'
                                        }}
                                    >
                                        {confirmModal.type === 'delete' ? 'Delete' : 'Recover'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
