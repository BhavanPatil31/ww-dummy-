import React, { useState, useMemo } from 'react';
import {
    FiFileText, FiDownload, FiCalendar,
    FiTrendingUp, FiTrendingDown, FiFilter, FiInfo
} from 'react-icons/fi';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../styles/TaxSummary.css';

export default function TaxSummary({ user, investments = [] }) {
    const [selectedYear, setSelectedYear] = useState(
        () => {
            const today = new Date();
            const year = today.getFullYear();
            if (today.getMonth() >= 3) { // April or later
                return `${year}-${year + 1}`;
            }
            return `${year - 1}-${year}`; // Jan - March
        }
    );

    // Format currency Helper
    const formatCurrency = (val) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

    // Format Date Helper
    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // Calculate simulated tax transactions entirely on the frontend
    const transactions = useMemo(() => {
        if (!investments || investments.length === 0) return [];
        
        return investments.map((inv, index) => {
            const buyDateStr = inv.buy_date || inv.start_date || new Date().toISOString().split('T')[0];
            
            // If the user hasn't sold the investment, safely simulate it resolving today so they can see data
            const sellDateStr = inv.end_date || new Date().toISOString().split('T')[0];
            
            const buyDate = new Date(buyDateStr);
            const sellDate = new Date(sellDateStr);
            
            const daysDiff = (sellDate - buyDate) / (1000 * 60 * 60 * 24);
            const type = daysDiff > 365 ? 'LTCG' : 'STCG';
            
            const invested = parseFloat(inv.amount || 0);
            
            let currentNav = inv.current_nav && inv.current_nav > 0 ? inv.current_nav
                           : inv.nav_at_buy > 0 ? inv.nav_at_buy * 1.05
                           : 0;

            let finalValue = invested;
            if (inv.units > 0 && currentNav > 0) {
                finalValue = inv.units * currentNav;
            } else {
                finalValue = invested * 1.15; // General 15% fallback approximation 
            }
            const gain = finalValue - invested;

            return {
                id: inv.investment_id || `txn-${index}`,
                fundName: inv.scheme_name || `Fund #${inv.fund_id || 'Unknown'}`,
                buyDate: buyDateStr,
                sellDate: sellDateStr,
                units: parseFloat(inv.units || 0),
                gain: parseFloat(gain.toFixed(2)),
                tax_type: type
            };
        });
    }, [investments]);

    const { filteredTransactions, totals } = useMemo(() => {
        const startYear = parseInt(selectedYear.substring(0, 4));
        const endYear = startYear + 1;
        const fyStart = new Date(`${startYear}-04-01`);
        const fyEnd = new Date(`${endYear}-03-31`);

        const filtered = transactions.filter(txn => {
            if (!txn.sellDate) return false;
            const sellD = new Date(txn.sellDate);
            return sellD >= fyStart && sellD <= fyEnd;
        });

        let ltcg = 0;
        let stcg = 0;
        filtered.forEach(txn => {
            if (txn.tax_type === 'LTCG') ltcg += parseFloat(txn.gain || 0);
            if (txn.tax_type === 'STCG') stcg += parseFloat(txn.gain || 0);
        });

        return { 
            filteredTransactions: filtered, 
            totals: { ltcg, stcg, total: ltcg + stcg } 
        };
    }, [transactions, selectedYear]);

    // Handle PDF Generation
    const handleDownloadPDF = () => {
        try {
            const doc = new jsPDF('p', 'pt', 'a4');
            const defaultColor = [41, 128, 185]; // Blue Theme
            
            // Helper to strip Rupee symbol because default jsPDF fonts don't support it well
            const pdfCurrency = (val) => formatCurrency(val).replace('₹', 'Rs. ');

            // Document Header
            doc.setFontSize(22);
            doc.setTextColor(defaultColor[0], defaultColor[1], defaultColor[2]);
            doc.text('WealthWise Tax Statement', 40, 50);

            doc.setFontSize(12);
            doc.setTextColor(100);
            doc.text(`Financial Year: ${selectedYear}`, 40, 75);
            
            const generatedDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
            doc.text(`Report Generated: ${generatedDate}`, 40, 95);
            
            // User Information Section
            const userName = user?.name || user?.firstName || 'Valued Client';
            const userId = user?.userId || user?.id || 'N/A';
            
            doc.setFont('helvetica', 'bold');
            doc.text(`Account Details:`, 40, 120);
            doc.setFont('helvetica', 'normal');
            doc.text(`Account Name: ${userName}`, 40, 135);
            doc.text(`Account ID: ${userId}`, 40, 150);

            // Divider Line
            doc.setDrawColor(200);
            doc.setLineWidth(1);
            doc.line(40, 165, 555, 165);

            // Totals Box
            doc.setFontSize(14);
            doc.setTextColor(40);
            doc.setFont('helvetica', 'bold');
            doc.text('Capital Gains Summary', 40, 195);

            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.text(`Long Term Capital Gains (LTCG): `, 40, 220);
            doc.setTextColor(totals.ltcg >= 0 ? 39 : 200, totals.ltcg >= 0 ? 174 : 0, totals.ltcg >= 0 ? 96 : 0);
            doc.text(`${totals.ltcg >= 0 ? '+' : ''}${pdfCurrency(totals.ltcg)}`, 230, 220);

            doc.setTextColor(40);
            doc.text(`Short Term Capital Gains (STCG): `, 40, 240);
            doc.setTextColor(totals.stcg >= 0 ? 39 : 200, totals.stcg >= 0 ? 174 : 0, totals.stcg >= 0 ? 96 : 0);
            doc.text(`${totals.stcg >= 0 ? '+' : ''}${pdfCurrency(totals.stcg)}`, 230, 240);

            doc.setTextColor(40);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`Total Estimated Gains: `, 40, 265);
            const netGains = totals.ltcg + totals.stcg;
            doc.setTextColor(netGains >= 0 ? 39 : 200, netGains >= 0 ? 174 : 0, netGains >= 0 ? 96 : 0);
            doc.text(`${netGains >= 0 ? '+' : ''}${pdfCurrency(netGains)}`, 230, 265);

            // Table Data
            const tableColumn = ["Fund Name", "Buy Date", "Simulated Sell", "Units", "Gain/Loss", "Type"];
            const tableRows = [];

            filteredTransactions.forEach(txn => {
                const ticketData = [
                    txn.fundName,
                    formatDate(txn.buyDate),
                    formatDate(txn.sellDate),
                    txn.units.toFixed(2),
                    `${txn.gain >= 0 ? '+' : ''}${pdfCurrency(txn.gain)}`,
                    txn.tax_type
                ];
                tableRows.push(ticketData);
            });

            // AutoTable styles
            autoTable(doc, {
                startY: 295,
                head: [tableColumn],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: defaultColor, textColor: 255, fontStyle: 'bold' },
                bodyStyles: { textColor: 50 },
                alternateRowStyles: { fillColor: [245, 247, 250] },
                margin: { top: 260, left: 40, right: 40 },
                styles: { fontSize: 9 },
                didParseCell: function(data) {
                    // Color gains green/red
                    if (data.section === 'body' && data.column.index === 4) {
                        const rawVal = data.cell.raw || '';
                        if (rawVal.includes('+')) {
                            data.cell.styles.textColor = [39, 174, 96]; // Green
                            data.cell.styles.fontStyle = 'bold';
                        } else if (rawVal.includes('-')) {
                            data.cell.styles.textColor = [231, 76, 60]; // Red
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                    // Color type pill text
                    if (data.section === 'body' && data.column.index === 5) {
                        const rawType = data.cell.raw;
                        if (rawType === 'LTCG') {
                            data.cell.styles.textColor = [155, 89, 182]; // Purple
                            data.cell.styles.fontStyle = 'bold';
                        } else {
                            data.cell.styles.textColor = [230, 126, 34]; // Orange
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            });

            const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 30 : 500;
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.setFont('helvetica', 'italic');
            doc.text("Generated by WealthWise Analytics • This is for informational purposes only.", 40, finalY);

            doc.save(`WealthWise_Tax_Statement_${selectedYear}.pdf`);
        } catch (err) {
            console.error("Failed to generate PDF:", err);
            alert("Failed to generate PDF. Check console for details.");
        }
    };

    return (
        <div className="ww-tax-container">
            {/* Page Header */}
            <div className="ww-tax-header">
                <div className="ww-title-section">
                    <h2>Tax Summary & Reports</h2>
                    <p>Review your portfolio's realized capital gains and simulated tax liabilities.</p>
                </div>
                <div className="ww-action-section">
                    <button className="ww-btn-outline" onClick={handleDownloadPDF}>
                        <FiDownload /> Download Tax Statement
                    </button>
                </div>
            </div>

            {/* Top Controls & Summary Cards */}
            <div className="ww-tax-summary-grid">

                {/* Financial Year Selector Card */}
                <div className="ww-tax-card ww-fy-card">
                    <div className="ww-card-top-icon">
                        <FiCalendar className="ww-icon-blue" />
                    </div>
                    <span className="ww-card-label">FINANCIAL YEAR</span>
                    <div className="ww-select-wrapper">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="ww-fy-select"
                        >
                            <option value="2026-2027">FY 2026 - 2027</option>
                            <option value="2025-2026">FY 2025 - 2026</option>
                            <option value="2024-2025">FY 2024 - 2025</option>
                            <option value="2023-2024">FY 2023 - 2024</option>
                            <option value="2022-2023">FY 2022 - 2023</option>
                        </select>
                    </div>
                    <p className="ww-card-help"><FiInfo /> Assesment Year: {parseInt(selectedYear.substring(0, 4)) + 1}-{parseInt(selectedYear.substring(5, 9)) + 1}</p>
                </div>

                {/* LTCG Summary Card */}
                <div className="ww-tax-card border-top-purple">
                    <div className="ww-card-header-flex">
                        <span className="ww-card-label">LONG TERM CAPITAL GAINS (LTCG)</span>
                        <div className="ww-badge-small purple">Equity &gt; 1 Year</div>
                    </div>
                    <h3 className={totals.ltcg >= 0 ? 'ww-text-green' : 'ww-text-red'}>
                        {totals.ltcg >= 0 ? '+' : ''}{formatCurrency(totals.ltcg)}
                    </h3>
                    <p className="ww-card-subtext">Taxable at 10% exceeding ₹1 Lakh threshold.</p>
                </div>

                {/* STCG Summary Card */}
                <div className="ww-tax-card border-top-orange">
                    <div className="ww-card-header-flex">
                        <span className="ww-card-label">SHORT TERM CAPITAL GAINS (STCG)</span>
                        <div className="ww-badge-small orange">Equity &lt; 1 Year</div>
                    </div>
                    <h3 className={totals.stcg >= 0 ? 'ww-text-green' : 'ww-text-red'}>
                        {totals.stcg >= 0 ? '+' : ''}{formatCurrency(totals.stcg)}
                    </h3>
                    <p className="ww-card-subtext">Taxable at flat 15% rate.</p>
                </div>

            </div>

            {/* Transactions Table Section */}
            <div className="ww-tax-table-card">
                <div className="ww-table-header-flex">
                    <h3 className="ww-table-title"><FiFileText /> Transaction History</h3>
                    <div className="ww-table-filters">
                        <button className="ww-icon-btn" title="Filter Records"><FiFilter /></button>
                    </div>
                </div>

                {filteredTransactions.length === 0 ? (
                    <div className="ww-empty-state">No investments found matching the selected financial year. Switch years to view your estimated gains!</div>
                ) : (
                    <div className="ww-table-responsive">
                        <table className="ww-data-table">
                            <thead>
                                <tr>
                                    <th>Fund Name</th>
                                    <th>Buy Date</th>
                                    <th>Simulated Sell Date</th>
                                    <th>Units Sold</th>
                                    <th>Est. Realized Gain</th>
                                    <th>Tax Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map((txn, index) => {
                                    const isPositive = txn.gain >= 0;
                                    return (
                                        <tr key={txn.id || index}>
                                            <td className="ww-td-primary">{txn.fundName}</td>
                                            <td className="ww-td-muted">{formatDate(txn.buyDate)}</td>
                                            <td className="ww-td-muted">{formatDate(txn.sellDate)}</td>
                                            <td className="ww-td-bold">{(txn.units || 0).toFixed(2)}</td>
                                            <td className={isPositive ? 'ww-text-green ww-td-bold' : 'ww-text-red ww-td-bold'}>
                                                <div className="ww-gain-cell">
                                                    {isPositive ? <FiTrendingUp /> : <FiTrendingDown />}
                                                    {isPositive ? '+' : ''}{formatCurrency(txn.gain)}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`ww-type-pill ${txn.tax_type === 'LTCG' ? 'pill-ltcg' : 'pill-stcg'}`}>
                                                    {txn.tax_type}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}