const fs = require('fs');
const path = 'c:/Users/bhava/OneDrive/Desktop/ww(dummy)/frontend/src/pages/AddInvestment.jsx';
let lines = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n').split('\n');

let newLines = [];
let i = 0;
while (i < lines.length) {
    if (lines[i].includes('}, [formData.fund_id, formData.startDate]);') && lines[i+2] && lines[i+2].includes('}, [formData.fund_id, formData.amount, formData.startDate]);')) {
        newLines.push(lines[i]);
        newLines.push('');
        newLines.push('    const formatCurrency = (val) => {');
        newLines.push("        return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {");
        newLines.push("            style: 'currency',");
        newLines.push('            currency: currency,');
        newLines.push('            maximumFractionDigits: 0');
        newLines.push('        }).format(val || 0);');
        newLines.push('    };');
        
        i += 9; // Skip the duplicated and broken lines for the formatCurrency function
    } else if (lines[i].includes('{/* ── SIP Frequency ── */}')) {
        break; // Ignore the rest, we will append it cleanly
    } else {
        newLines.push(lines[i]);
        i++;
    }
}

const bottomHalf = `                                {/* ── SIP Frequency ── */}
                                {type === 'SIP' && (
                                    <div className="form-group">
                                        <label>SIP Frequency</label>
                                        <div className="input-wrapper">
                                            <select
                                                id="frequency"
                                                name="frequency"
                                                value={formData.frequency}
                                                onChange={handleChange}
                                                className="styled-select"
                                            >
                                                {['Weekly', 'Monthly', 'Quarterly', 'Yearly'].map(f => (
                                                    <option key={f} value={f}>{f}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* ── Start + End Date Row ── */}
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>
                                            {type === 'SIP' ? 'SIP Start Date' : 'Purchase Date'}
                                        </label>
                                        <div className="input-wrapper">
                                            <FiCalendar className="input-icon" />
                                            <input
                                                id="startDate"
                                                type="date"
                                                name="startDate"
                                                value={formData.startDate}
                                                onChange={handleChange}
                                                max={TODAY}
                                                required
                                            />
                                        </div>
                                    </div>

                                    {type === 'SIP' && (
                                        <div className="form-group">
                                            <label>End Date <span className="optional-tag">(optional)</span></label>
                                            <div className="input-wrapper">
                                                <FiCalendar className="input-icon" />
                                                <input
                                                    id="endDate"
                                                    type="date"
                                                    name="endDate"
                                                    value={formData.endDate}
                                                    onChange={handleChange}
                                                    min={formData.startDate}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ── Actions ── */}
                                <div className="form-actions">
                                    <button
                                        type="button"
                                        className="btn-cancel"
                                        onClick={onBackToDashboard}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        id="submit-investment"
                                        type="submit"
                                        className={\`btn-submit \${!canSubmit ? 'disabled' : ''}\`}
                                        disabled={!canSubmit}
                                        title={!canSubmit && isNavUnavail ? 'NAV unavailable — cannot save' : ''}
                                    >
                                        {status.loading ? 'Saving…' : 'Save Investment'}
                                    </button>
                                </div>

                            </form>
                        )}
                    </div>
                </div>

                {/* ── SUMMARY PANEL ────────────────────────────────────── */}
                <div className="summary-section">
                    <div className="summary-card">
                        <h3>Investment Summary</h3>
                        <div className="summary-list">

                            <div className="summary-row">
                                <span>Type</span>
                                <strong>{type}</strong>
                            </div>

                            <div className="summary-row">
                                <span>Fund</span>
                                <strong className="fund-name-clamp" title={formData.fundName}>
                                    {formData.fundName || '—'}
                                </strong>
                            </div>

                            {formData.fund_id && (
                                <div className="summary-row">
                                    <span>Scheme Code</span>
                                    <strong className="code-mono">#{formData.fund_id}</strong>
                                </div>
                            )}

                            {type === 'SIP' && (
                                <div className="summary-row">
                                    <span>Frequency</span>
                                    <strong>{formData.frequency}</strong>
                                </div>
                            )}

                            <div className="summary-row">
                                <span>Amount</span>
                                <strong>{formData.amount ? formatCurrency(formData.amount) : '—'}</strong>
                            </div>

                            <div className="summary-row">
                                <span>NAV (at Purchase)</span>
                                <strong>
                                    {isNavFetching ? (
                                        <span className="fetching-text">Fetching…</span>
                                    ) : isNavValid ? (
                                        \`\${currencySymbols[currency] || '₹'}\${parseFloat(formData.nav).toFixed(4)}\`
                                    ) : '—'}
                                </strong>
                            </div>

                            {latestNavInfo.nav && !isNavUnavail && (
                                <div className="summary-row">
                                    <span>Latest Market NAV</span>
                                    <strong className="green">
                                        {currencySymbols[currency] || '₹'}{parseFloat(latestNavInfo.nav).toFixed(4)}
                                        <span className="nav-date-sub"> ({latestNavInfo.date})</span>
                                    </strong>
                                </div>
                            )}

                            {/* Highlight Panels */}
                            <div className="highlight-panel units">
                                <span className="label">Expected Units</span>
                                <span className="value">{units}</span>
                            </div>

                            <div className="highlight-panel value">
                                <span className="label">
                                    {type === 'SIP' ? 'Per Instalment' : 'Total Value'}
                                </span>
                                <span className="value">
                                    {formData.amount ? formatCurrency(formData.amount) : '—'}
                                    {type === 'SIP' ? \` / \${formData.frequency.toLowerCase()}\` : ''}
                                </span>
                            </div>

                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}`;

fs.writeFileSync(path, newLines.join('\n') + '\n' + bottomHalf + '\n');
