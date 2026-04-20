import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FiEdit2, FiTrash2, FiPlus, FiX } from 'react-icons/fi';
import axios from 'axios';
import InfoHint from '../components/InfoHint';
import '../styles/GoalPlanning.css';

export default function GoalPlanning({ user, investments, getCurrentValue, currency = 'INR' }) {
    const API_BASE = 'http://localhost:8088/api/goals';
    const [goals, setGoals] = useState([]);
    const [form, setForm] = useState({
        id: null,
        name: '',
        amount: '',
        year: new Date().getFullYear() + 5,
        linkedInvestments: []
    });
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const [linkError, setLinkError] = useState('');

    // Edit Modal States
    const [editModalData, setEditModalData] = useState(null);
    const [modalDropdownOpen, setModalDropdownOpen] = useState(false);
    const modalDropdownRef = useRef(null);

    // Deletion Modal States
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
            if (modalDropdownRef.current && !modalDropdownRef.current.contains(event.target)) {
                setModalDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);



    const fetchGoals = useCallback(async () => {
        if (!user) return;
        const userId = user.userId || user.id;
        const token = localStorage.getItem('jwt_token');
        try {
            const response = await axios.get(`${API_BASE}/user/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGoals(response.data || []);
        } catch (error) {
            console.error("Failed to fetch goals", error);
        }
    }, [user, API_BASE]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchGoals();
        }, 0);
        return () => clearTimeout(timer);
    }, [fetchGoals]);

    const investmentIdOf = (inv) => String(inv?.investment_id || inv?.id || inv?.investmentId);
    const goalIdOf = (goal) => String(goal?.goal_id || goal?.id);

    const goalById = useMemo(() => {
        const map = {};
        (goals || []).forEach((g) => {
            const gid = goalIdOf(g);
            if (gid) map[gid] = g;
        });
        return map;
    }, [goals]);

    const linkedInvestmentGoalMap = useMemo(() => {
        const map = {};
        (goals || []).forEach(g => {
            const gid = String(g.goal_id || g.id);
            (g.linkedInvestments || []).forEach(li => {
                const iid = String(li?.investment_id || li);
                if (iid) map[iid] = gid;
            });
        });
        return map;
    }, [goals]);

    const activeInvestments = useMemo(() => {
        return (investments || []).filter(inv => {
            if (inv.end_date || inv.endDate) return false;
            const status = String(inv.status || '').toUpperCase();
            return status !== 'SOLD' && status !== 'CLOSED';
        });
    }, [investments]);

    const activeInvestmentIdSet = useMemo(
        () => new Set(activeInvestments.map(investmentIdOf)),
        [activeInvestments]
    );

    const getSelectableInvestments = (currentGoalId = null) => {
        const gid = currentGoalId != null ? String(currentGoalId) : null;
        return activeInvestments.filter(inv => {
            const iid = investmentIdOf(inv);
            const owner = linkedInvestmentGoalMap[iid];
            return !owner || (gid && owner === gid);
        });
    };

    const isLinkedToAnotherGoal = (investmentId, currentGoalId = null) => {
        const owner = linkedInvestmentGoalMap[String(investmentId)];
        if (!owner) return false;
        if (currentGoalId == null) return true;
        return owner !== String(currentGoalId);
    };

    const getPersistedLinkedAmount = (goalLike, investmentId) => {
        const links = goalLike?.linkedInvestments || [];
        const found = links.find(li => String(li?.investment_id || li) === String(investmentId));
        return Number(found?.linked_amount || 0);
    };

    const getLinkedAmountForPayload = (investmentId, existingGoal = null) => {
        const inv = investments.find(i => investmentIdOf(i) === String(investmentId));
        if (inv) {
            return Number(inv.amount_invested || inv.amountInvested || inv.amount || 0);
        }
        return getPersistedLinkedAmount(existingGoal, investmentId);
    };

    // Format currency
    // Format currency
    const formatCurrency = (val) =>
        new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(val || 0);

    const fmt = (v) => {
        const formatted = formatCurrency(v);
        // If it's INR, we might want to keep just the numbers for some parts or full string
        return formatted;
    };

    const formatIndian = (num) => {
        if (num === null || num === undefined || num === '') return '';
        const s = num.toString().replace(/,/g, '');
        if (isNaN(s)) return num;
        const parts = s.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{2})+(?!\d))/g, ",").replace(/(\d+),(\d{3})$/, "$1,$2");
        return parts.join('.');
    };

    const parseNumber = (val) => val.toString().replace(/,/g, '');

    const handleInput = (e) => {
        const { name, value } = e.target;
        if (name === 'linkedInvestments') {
            const options = e.target.options;
            const values = [];
            for (let i = 0, l = options.length; i < l; i++) {
                if (options[i].selected) values.push(options[i].value);
            }
            setForm({ ...form, [name]: values });
        } else if (name === 'amount') {
            const raw = parseNumber(value);
            if (raw === '' || !isNaN(raw)) {
                setForm({ ...form, [name]: raw });
            }
        } else {
            setForm({ ...form, [name]: value });
        }
    };

    const handleSave = async () => {
        if (!form.name || !form.amount || !user) return;
        setLinkError('');

        const uniqueSelectedIds = [...new Set((form.linkedInvestments || []).map(id => String(id)))];
        const safeSelectedIds = uniqueSelectedIds.filter(id => activeInvestmentIdSet.has(id));

        const conflictingIds = safeSelectedIds.filter(id => isLinkedToAnotherGoal(id, null));
        if (conflictingIds.length > 0) {
            setLinkError('One or more selected investments are already linked to another goal.');
            return;
        }

        const currentProgress = calculateProgress(safeSelectedIds);
        const goalData = {
            user_id: user.userId || user.id,
            goal_name: form.name,
            target_amount: parseFloat(form.amount),
            target_year: parseInt(form.year, 10),
            progress: currentProgress,
            linkedInvestments: safeSelectedIds.map(id => ({
                investment_id: parseInt(id),
                linked_amount: getLinkedAmountForPayload(id)
            }))
        };

        const token = localStorage.getItem('jwt_token');
        const headers = { Authorization: `Bearer ${token}` };

        try {
            if (form.id) {
                await axios.put(`${API_BASE}/${form.id}`, goalData, { headers });
            } else {
                await axios.post(`${API_BASE}/add`, goalData, { headers });
            }
            fetchGoals();
            // Reset
            setForm({
                id: null, name: '', amount: '',
                year: new Date().getFullYear() + 5,
                linkedInvestments: []
            });
            setLinkError('');
            setDropdownOpen(false);
        } catch (error) {
            console.error("Failed to save goal", error);
            setLinkError(error?.response?.data?.message || 'Failed to save goal. Please try again.');
        }
    };

    const toggleScheme = (investmentId) => {
        if (isLinkedToAnotherGoal(investmentId, null)) {
            setLinkError('This investment is already linked to another goal.');
            return;
        }
        setLinkError('');
        const isSelected = form.linkedInvestments.includes(investmentId);
        if (isSelected) {
            setForm({ ...form, linkedInvestments: form.linkedInvestments.filter(id => id !== investmentId) });
        } else {
            setForm({ ...form, linkedInvestments: [...form.linkedInvestments, investmentId] });
        }
        setDropdownOpen(false);
    };

    const handleEdit = (goal) => {
        setLinkError('');
        const linkedIds = goal.linkedInvestments?.map(li => String(li?.investment_id || li)) || [];
        const activeLinkedIds = [...new Set(linkedIds)].filter(id => activeInvestmentIdSet.has(String(id)));
        setEditModalData({
            id: goal.goal_id,
            name: goal.goal_name,
            amount: goal.target_amount,
            year: goal.target_year,
            linkedInvestments: activeLinkedIds
        });
    };

    const handleModalInput = (e) => {
        const { name, value } = e.target;
        if (name === 'amount') {
            const raw = parseNumber(value);
            if (raw === '' || !isNaN(raw)) {
                setEditModalData({ ...editModalData, [name]: raw });
            }
        } else {
            setEditModalData({ ...editModalData, [name]: value });
        }
    };

    const toggleModalScheme = (investmentId) => {
        if (isLinkedToAnotherGoal(investmentId, editModalData?.id)) {
            setLinkError('This investment is already linked to another goal.');
            return;
        }
        setLinkError('');
        const isSelected = editModalData.linkedInvestments.includes(investmentId);
        if (isSelected) {
            setEditModalData({ ...editModalData, linkedInvestments: editModalData.linkedInvestments.filter(id => id !== investmentId) });
        } else {
            setEditModalData({ ...editModalData, linkedInvestments: [...editModalData.linkedInvestments, investmentId] });
        }
        setModalDropdownOpen(false);
    };

    const handleModalSave = async () => {
        if (!editModalData.name || !editModalData.amount || !user) return;
        setLinkError('');

        const uniqueSelectedIds = [...new Set((editModalData.linkedInvestments || []).map(id => String(id)))];
        const safeSelectedIds = uniqueSelectedIds.filter(id => activeInvestmentIdSet.has(id));

        const conflictingIds = safeSelectedIds.filter(id => isLinkedToAnotherGoal(id, editModalData.id));
        if (conflictingIds.length > 0) {
            setLinkError('One or more selected investments are already linked to another goal.');
            return;
        }

        const existingGoal = goalById[String(editModalData.id)];
        const existingLinkedIdSet = new Set(
            (existingGoal?.linkedInvestments || []).map(li => String(li?.investment_id || li))
        );
        const newLinkedIds = safeSelectedIds.filter(id => !existingLinkedIdSet.has(String(id)));
        const currentProgress = calculateProgress(safeSelectedIds);
        const buildGoalPayload = (ids, opts = {}) => ({
            user_id: user.userId || user.id,
            goal_name: editModalData.name,
            target_amount: parseFloat(editModalData.amount),
            target_year: parseInt(editModalData.year, 10),
            ...(opts.includeProgress === false ? {} : { progress: currentProgress }),
            linkedInvestments: opts.asIdArray
                ? ids.map(id => parseInt(id))
                : ids.map(id => ({
                    investment_id: parseInt(id),
                    linked_amount: getLinkedAmountForPayload(id, existingGoal)
                }))
        });

        const token = localStorage.getItem('jwt_token');
        const headers = { Authorization: `Bearer ${token}` };

        try {
            await axios.put(`${API_BASE}/${editModalData.id}`, buildGoalPayload(safeSelectedIds), { headers });
            fetchGoals();
            setEditModalData(null);
            setLinkError('');
            setModalDropdownOpen(false);
        } catch (error) {
            const duplicateMsg = String(
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.response?.data ||
                error?.message ||
                ''
            ).toLowerCase();
            const isDuplicateLinkError = duplicateMsg.includes('duplicate entry') || duplicateMsg.includes('uq_goal_investments_investment_id');

            // Retry for stricter backend DTOs that may expect ID arrays instead of objects.
            try {
                await axios.put(
                    `${API_BASE}/${editModalData.id}`,
                    buildGoalPayload(safeSelectedIds, { asIdArray: true }),
                    { headers }
                );
                fetchGoals();
                setEditModalData(null);
                setLinkError('');
                setModalDropdownOpen(false);
                return;
            } catch (shapeError) {
                // Final shape retry: omit progress for backends that compute it server-side.
                try {
                    await axios.put(
                        `${API_BASE}/${editModalData.id}`,
                        buildGoalPayload(safeSelectedIds, { asIdArray: true, includeProgress: false }),
                        { headers }
                    );
                    fetchGoals();
                    setEditModalData(null);
                    setLinkError('');
                    setModalDropdownOpen(false);
                    return;
                } catch {
                    // continue to existing duplicate-specific fallback and final error handling
                }
            }

            if (isDuplicateLinkError) {
                try {
                    await axios.put(`${API_BASE}/${editModalData.id}`, buildGoalPayload(newLinkedIds), { headers });
                    fetchGoals();
                    setEditModalData(null);
                    setLinkError('');
                    setModalDropdownOpen(false);
                    return;
                } catch (retryError) {
                    console.error("Failed to update goal (retry)", retryError);
                    const retryResp = retryError?.response?.data;
                    const retryMsg = typeof retryResp === 'string'
                        ? retryResp
                        : (retryResp?.message || retryResp?.error || 'Failed to update goal. Please try again.');
                    setLinkError(retryMsg);
                    return;
                }
            }

            console.error("Failed to update goal", error);
            const resp = error?.response?.data;
            const msg = typeof resp === 'string'
                ? resp
                : (resp?.message || resp?.error || 'Failed to update goal. Please try again.');
            setLinkError(msg);
        }
    };

    const handleDeleteRequest = (id) => {
        setDeleteConfirmId(id);
    };

    const handleConfirmDelete = async () => {
        if (deleteConfirmId) {
            const token = localStorage.getItem('jwt_token');
            const headers = { Authorization: `Bearer ${token}` };
            try {
                await axios.delete(`${API_BASE}/${deleteConfirmId}`, { headers });
                fetchGoals();
                setDeleteConfirmId(null);
            } catch (error) {
                console.error("Failed to delete goal", error);
            }
        }
    };

    const calculateProgress = React.useCallback((linked) => {
        if (!linked || !linked.length || !investments?.length) return 0;
    const calculateProgress = (linked) => {
        if (!linked || !linked.length) return 0;
        let sum = 0;
        linked.forEach(item => {
            // item can be an ID (from form) or an object (from backend)
            const id = item.investment_id || item;
            const inv = investments.find(i => String(i.investment_id || i.id || i.investmentId) === String(id));
            if (inv) {
                if (getCurrentValue) {
                    sum += getCurrentValue(inv);
                } else {
                    sum += parseFloat(inv.amount_invested || inv.amountInvested || inv.amount || 0);
                }
            } else {
                sum += Number(item?.linked_amount || 0);
            }
        });
        return sum;
    }, [investments, getCurrentValue]);

    const currentYear = new Date().getFullYear();
    const startYear = currentYear;
    const endYear = currentYear + 30;
    const yearOptions = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

    return (
        <div className="goal-planning-container">
            <h1 className="goal-planning-title">
                Goal Planning Page
                <InfoHint text="Create goals, set target amount/year, and link investments to track progress automatically." />
            </h1>

            {/* Form Section */}
            <div className="goal-card" style={{ position: 'relative', zIndex: 10 }}>
                <div className="goal-form">
                    <div className="goal-input-group">
                        <label>Goal Name <InfoHint text="Example: Emergency Fund, Dream Home, Retirement." /></label>
                        <input type="text" className="goal-input" name="name"
                            placeholder="e.g. Dream Home, Retirement"
                            value={form.name} onChange={handleInput} />
                    </div>

                    <div className="goal-input-group">
                        <label>
                            Target Amount ({currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£'})
                            <InfoHint text="Set how much you want to accumulate by the target year." />
                        </label>
                        <input type="text" className="goal-input" name="amount"
                            placeholder="e.g. 5,00,000"
                            value={formatIndian(form.amount)} onChange={handleInput} />
                    </div>

                    <div className="goal-input-group">
                        <label>Target Year <InfoHint text="Choose your expected completion year for this goal." /></label>
                        <select className="goal-select" name="year"
                            value={form.year} onChange={handleInput}>
                            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    <div className="goal-input-group" style={{ position: 'relative' }} ref={dropdownRef}>
                        <label>Link Investments <InfoHint text="Only active investments are shown. Linked assets count toward goal progress." /></label>
                        <div className="custom-multiselect" onClick={() => setDropdownOpen(!dropdownOpen)}>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '10px' }}>
                                {form.linkedInvestments.length === 0
                                    ? "Select investments..."
                                    : form.linkedInvestments.map(id => {
                                        const s = investments?.find(sc => String(sc.investment_id || sc.id || sc.investmentId) === String(id));
                                        return s ? (s.scheme_name || s.name || s.schemeName) : 'Unknown';
                                    }).join(', ')}
                            </div>
                            <span style={{ marginLeft: 'auto', fontSize: '10px' }}>▼</span>
                        </div>

                        {dropdownOpen && (
                            <div className="custom-multiselect-popup">
                                {getSelectableInvestments().map(inv => {
                                    const invId = String(inv.investment_id || inv.id || inv.investmentId);
                                    const invName = inv.scheme_name || inv.name || inv.schemeName;
                                    const invType = inv.investment_type || 'Unknown';
                                    const isSelected = form.linkedInvestments.includes(invId);
                                    return (
                                        <div key={invId}
                                            className={`multiselect-option ${isSelected ? 'selected' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); toggleScheme(invId); }}
                                            onDoubleClick={(e) => { e.stopPropagation(); setDropdownOpen(false); }}>
                                            <input type="checkbox" checked={isSelected} readOnly />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
                                                <strong style={{ fontSize: '13.5px', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }} title={invName}>
                                                    {invName}
                                                </strong>
                                                <span style={{ fontSize: '11.5px', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8', border: '1px solid rgba(255, 255, 255, 0.1)', flexShrink: 0 }}>
                                                    {invType}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {getSelectableInvestments().length === 0 && (
                                    <div className="multiselect-option" style={{ color: '#94a3b8' }}>
                                        No eligible active investments available
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="goal-input-group" style={{ justifyContent: 'flex-start' }}>
                        <button className="goal-btn-done" onClick={handleSave}>
                            <FiPlus style={{ marginRight: '8px' }} /> Add Goal
                        </button>
                    </div>

                    {linkError && (
                        <div style={{ color: '#f87171', fontSize: '13px', marginTop: '8px' }}>
                            {linkError}
                        </div>
                    )}
                </div>
            </div>

            {/* Summary Section */}
            <div className="goal-card goal-summary-section">
                <h3>Goal Summary</h3>
                <div className="goal-table-wrapper">
                    {goals.length === 0 ? (
                        <div className="goal-empty-state">No goals created yet. Fill the form above to add one.</div>
                    ) : (
                        <table className="goal-table">
                            <thead>
                                <tr>
                                    <th>Sl No</th>
                                    <th>Goal Name</th>
                                    <th>Target Amount</th>
                                    <th>Target Year</th>
                                    <th>Linked Investments</th>
                                    <th>Progress</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {goals.map((goal, idx) => {
                                    const progressVal = calculateProgress(goal.linkedInvestments);
                                    let percentage = (progressVal / goal.target_amount) * 100;
                                    if (percentage > 100) percentage = 100;
                                    if (isNaN(percentage)) percentage = 0;

                                    return (
                                        <tr key={goal.goal_id}>
                                            <td>{idx + 1}</td>
                                            <td style={{ fontWeight: 500 }}>{goal.goal_name}</td>
                                            <td style={{ color: '#f8fafc' }}>{fmt(goal.target_amount)}</td>
                                            <td>{goal.target_year}</td>
                                            <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={
                                                goal.linkedInvestments?.map(li => {
                                                    const s = investments?.find(sc => String(sc.investment_id || sc.id || sc.investmentId) === String(li.investment_id || li));
                                                    return s ? (s.scheme_name || s.name || s.schemeName) : 'Unknown';
                                                }).join(', ')
                                            }>
                                                {goal.linkedInvestments && goal.linkedInvestments.length > 0 ? (
                                                    goal.linkedInvestments.map((li, i) => {
                                                        const s = investments?.find(sc => String(sc.investment_id || sc.id || sc.investmentId) === String(li.investment_id || li));
                                                        const name = s ? (s.scheme_name || s.name || s.schemeName) : 'Unknown';
                                                        return name + (i < goal.linkedInvestments.length - 1 ? ', ' : '');
                                                    })
                                                ) : 'No Assets'}
                                            </td>
                                            <td style={{ width: '200px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <span className="goal-progress-text">{fmt(progressVal)}</span>
                                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{percentage.toFixed(1)}%</span>
                                                </div>
                                                <div className="goal-progress-container">
                                                    <div className="goal-progress-bar" style={{ width: `${percentage}%` }}></div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="goal-actions">
                                                    <button className="btn-action edit" onClick={() => handleEdit(goal)} title="Edit"><FiEdit2 /></button>
                                                    <button className="btn-action delete" onClick={() => handleDeleteRequest(goal.goal_id)} title="Delete"><FiTrash2 /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                            })}
                        </tbody>
                    </table>
                )}
                </div>
            </div>

            {/* Investments */}
            {investments && investments.filter(inv => inv.status !== 'SOLD').length > 0 && (
                    <div className="goal-card" style={{ marginTop: '24px' }}>
                        <h3 style={{ marginBottom: '16px', fontSize: '18px', color: '#f8fafc' }}>Investments</h3>
                        <div className="goal-table-wrapper">
                            <table className="goal-table">
                                    <thead>
                                        <tr>
                                            <th>Sl No</th>
                                            <th>Fund Name</th>
                                            <th>Target Amount (Est.)</th>
                                            <th>End Year</th>
                                            <th>Type</th>
                                            <th>Progress</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                    {investments.filter(inv => inv.status !== 'SOLD').map((inv, idx) => {
                                            const start = new Date(inv.start_date || inv.buy_date);
                                            const end = inv.end_date ? new Date(inv.end_date) : null;
                                            let targetAmt = parseFloat(inv.amount || 0);

                                            if (inv.end_date) {
                                                if (inv.frequency === 'Monthly') {
                                                    let m = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
                                                    targetAmt = targetAmt * (m > 0 ? m : 1);
                                                } else if (inv.frequency === 'Yearly') {
                                                    let y = end.getFullYear() - start.getFullYear();
                                                    targetAmt = targetAmt * (y > 0 ? y : 1);
                                                } else if (inv.frequency === 'Weekly') {
                                                    let w = Math.floor((end - start) / (1000 * 60 * 60 * 24 * 7));
                                                    targetAmt = targetAmt * (w > 0 ? w : 1);
                                                } else if (inv.frequency === 'Quarterly') {
                                                    let m = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
                                                    let q = Math.floor(m / 3);
                                                    targetAmt = targetAmt * (q > 0 ? q : 1);
                                                }
                                            }

                                            const progressVal = getCurrentValue ? getCurrentValue(inv) : parseFloat(inv.amount || 0);
                                            let percentage = targetAmt > 0 ? (progressVal / targetAmt) * 100 : 0;
                                            if (percentage > 100) percentage = 100;
                                            if (isNaN(percentage)) percentage = 0;

                                            return (
                                                <tr key={`term-${inv.investment_id || idx}`}>
                                                    <td>{idx + 1}</td>
                                                    <td style={{ fontWeight: 500 }}>{inv.scheme_name || `Fund #${inv.fund_id}`}</td>
                                                    <td style={{ color: '#f8fafc' }}>{fmt(targetAmt)}</td>
                                                    <td>{end ? end.getFullYear() : '-'}</td>
                                                    <td style={{ color: '#94a3b8' }}>{inv.investment_type || 'Unknown'}</td>
                                                    <td style={{ width: '200px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                            <span className="goal-progress-text">{fmt(progressVal)}</span>
                                                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{percentage.toFixed(1)}%</span>
                                                        </div>
                                                        <div className="goal-progress-container">
                                                            <div className="goal-progress-bar" style={{ width: `${percentage}%` }}></div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>Auto-tracked</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                        </div>
                    </div>
                )}
            

            {/* Edit Modal Overlay */ }
    {
        editModalData && (
            <div className="goal-modal-overlay">
                <div className="goal-modal-content">
                    <div className="goal-modal-header">
                        <h2><FiEdit2 /> Edit Goal</h2>
                        <button className="goal-modal-close" onClick={() => { setEditModalData(null); setModalDropdownOpen(false); setLinkError(''); }}><FiX /></button>
                    </div>

                    <div className="goal-input-group" style={{ marginBottom: '16px' }}>
                        <label>Goal Name</label>
                        <input type="text" className="goal-input" name="name"
                            value={editModalData.name} onChange={handleModalInput} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div className="goal-input-group">
                            <label>Target Amount ({currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£'})</label>
                            <input type="text" className="goal-input" name="amount"
                                value={formatIndian(editModalData.amount)} onChange={handleModalInput} />
                        </div>
                        <div className="goal-input-group">
                            <label>Target Year</label>
                            <select className="goal-select" name="year"
                                value={editModalData.year} onChange={handleModalInput}>
                                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="goal-input-group" style={{ marginBottom: '24px', position: 'relative' }} ref={modalDropdownRef}>
                        <label>Link Investments</label>
                        <div className="custom-multiselect" onClick={() => setModalDropdownOpen(!modalDropdownOpen)}>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '10px' }}>
                                {editModalData.linkedInvestments.length === 0
                                    ? "Select investments..."
                                    : editModalData.linkedInvestments.map(id => {
                                        const s = investments?.find(sc => String(sc.investment_id || sc.id || sc.investmentId) === String(id));
                                        return s ? (s.scheme_name || s.name || s.schemeName) : 'Unknown';
                                    }).join(', ')}
                            </div>
                            <span style={{ marginLeft: 'auto', fontSize: '10px' }}>▼</span>
                        </div>

                        {modalDropdownOpen && (
                            <div className="custom-multiselect-popup">
                                {getSelectableInvestments(editModalData?.id).map(inv => {
                                    const invId = String(inv.investment_id || inv.id || inv.investmentId);
                                    const invName = inv.scheme_name || inv.name || inv.schemeName;
                                    const invType = inv.investment_type || 'Unknown';
                                    const isSelected = editModalData.linkedInvestments.includes(invId);
                                    return (
                                        <div key={invId}
                                            className={`multiselect-option ${isSelected ? 'selected' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); toggleModalScheme(invId); }}
                                            onDoubleClick={(e) => { e.stopPropagation(); setModalDropdownOpen(false); }}>
                                            <input type="checkbox" checked={isSelected} readOnly />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
                                                <strong style={{ fontSize: '13.5px', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }} title={invName}>
                                                    {invName}
                                                </strong>
                                                <span style={{ fontSize: '11.5px', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8', border: '1px solid rgba(255, 255, 255, 0.1)', flexShrink: 0 }}>
                                                    {invType}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {getSelectableInvestments(editModalData?.id).length === 0 && (
                                    <div className="multiselect-option" style={{ color: '#94a3b8' }}>
                                        No eligible active investments available
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="goal-modal-actions">
                        <button className="goal-btn-cancel" onClick={() => { setEditModalData(null); setModalDropdownOpen(false); setLinkError(''); }}>Cancel</button>
                        <button className="goal-btn-save" onClick={handleModalSave}>Save Changes</button>
                    </div>
                    {linkError && (
                        <div style={{ color: '#f87171', fontSize: '13px', marginTop: '8px' }}>
                            {linkError}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    {/* Delete Confirmation Modal */ }
    {
        deleteConfirmId && (
            <div className="goal-modal-overlay">
                <div className="goal-modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
                    <div className="goal-modal-header" style={{ borderBottom: 'none', marginBottom: '0px', justifyContent: 'center' }}>
                        <h2 style={{ fontSize: '20px' }}>Confirm Deletion</h2>
                    </div>
                    <p style={{ color: '#94a3b8', margin: '20px 0 30px 0', fontSize: '15px' }}>
                        Are you sure you want to delete this goal? This action cannot be undone.
                    </p>
                    <div className="goal-modal-actions">
                        <button className="goal-btn-cancel" onClick={() => setDeleteConfirmId(null)}>No</button>
                        <button className="goal-btn-save"
                            style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
                            onClick={handleConfirmDelete}>
                            Yes
                        </button>
                    </div>
                </div>
            </div>
        )
    }
        </div>
    );
}
