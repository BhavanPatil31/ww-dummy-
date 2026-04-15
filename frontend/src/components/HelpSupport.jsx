import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiBook, FiMessageSquare, FiLifeBuoy, FiHelpCircle, 
    FiCheckCircle, FiChevronDown, FiChevronUp, FiArrowLeft, FiPlusCircle, FiSend
} from 'react-icons/fi';
import axios from 'axios';

export default function HelpSupport({ user }) {
    const [helpView, setHelpView] = useState('menu');
    const [expandedFaq, setExpandedFaq] = useState(null);
    const [tickets, setTickets] = useState(JSON.parse(localStorage.getItem('support_tickets') || '[]'));
    
    // Forms state
    const [ticketForm, setTicketForm] = useState({ title: '', email: '', type: 'Technical Issue', description: '', priority: 'Medium' });
    const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Help Center state
    const [activeGuide, setActiveGuide] = useState(null);

    // Save tickets to local storage
    useEffect(() => {
        localStorage.setItem('support_tickets', JSON.stringify(tickets));
    }, [tickets]);

    const handleTicketSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('jwt_token');
            const headers = { Authorization: `Bearer ${token}` };
            await axios.post('http://localhost:8088/api/feedback/ticket', ticketForm, { headers });
            
            const newTicket = {
                id: 'TKT-' + Math.floor(Math.random() * 10000),
                ...ticketForm,
                status: 'Open',
                date: new Date().toLocaleDateString()
            };
            setTickets([newTicket, ...tickets]);
            setTicketForm({ title: '', email: '', type: 'Technical Issue', description: '', priority: 'Medium' });
            alert("Ticket successfully submitted! An email is sent to support. Ticket ID: " + newTicket.id);
            setHelpView('trackRequests');
        } catch (error) {
            alert("Failed to submit ticket. Please try again later.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleContactSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            setContactForm({ name: '', email: '', message: '' });
            alert("Message sent successfully! Our team will get back to you shortly.");
            setHelpView('menu');
        }, 800);
    };

    const faqs = [
        { 
            q: "How do I add a new investment to my portfolio?", 
            a: "To add an investment, navigate to the Dashboard and click the 'Add Investment' button. You can choose between Mutual Funds, SIPs, or Stocks. Fill in the required details like fund name, investment date, and amount. Once submitted, our system will calculate the units based on the NAV/Price of that day and add it to your holdings immediately." 
        },
        { 
            q: "How can I track the performance of my investments?", 
            a: "You can track your performance by visiting the 'Portfolio' section. Here, we provide a comprehensive breakdown of your total invested amount versus the current market value. We calculate your absolute returns and XIRR to give you a clear picture of how your money is growing over time, complemented by interactive growth charts." 
        },
        { 
            q: "What is a SIP and how does it benefit me?", 
            a: "A Systematic Investment Plan (SIP) is a method where you invest a fixed amount regularly into a chosen fund. This approach utilizes 'Rupee Cost Averaging', helping you buy more units when prices are low and fewer when prices are high, effectively reducing the average cost per unit and building long-term wealth." 
        },
        { 
            q: "How is my portfolio's 'Current Value' calculated?", 
            a: "The current value is calculated in real-time based on the latest Net Asset Value (NAV) for mutual funds or the current market price for stocks. We multiply your total units held by the latest available price. Note that mutual fund NAVs are typically updated by fund houses at the end of each business day." 
        },
        { 
            q: "What should I do if my investment data is not updating correctly?", 
            a: "If you notice a delay in updates, try refreshing your browser or clearing your cache. Data updates rely on external API feeds which may occasionally have slight delays. If the issue persists for more than 24 hours, please reach out to our technical support team via the 'Raise Ticket' option with your transaction details." 
        }
    ];

    const guides = [
        { 
            id: '1', 
            title: 'How to add a new investment?', 
            content: 'To start growing your portfolio, navigate to the "Add Investment" screen from your main dashboard. Select the type of asset (Mutual Fund, SIP, or Stocks). For Mutual Funds, search for the scheme name; we fetch the latest NAV automatically. Enter the date of purchase and the amount. Review the details carefully before clicking "Confirm". Once added, the investment will immediately reflect in your portfolio summary and dashboard charts.' 
        },
        { 
            id: '2', 
            title: 'How to track and analyze investments?', 
            content: 'Tracking is made easy with our dedicated "Portfolio" tab. You will see cards representing each of your active investments. Click on any specific investment to see its detailed transaction history, average purchase price, and percentage growth. Our analytics engine also provides a performance summary across different asset classes, helping you understand where your capital is most productive.' 
        },
        { 
            id: '3', 
            title: 'How to understand portfolio performance metrics?', 
            content: 'We use two primary metrics: Absolute Return and XIRR. Absolute Return is the simple percentage increase or decrease in your investment. XIRR (Extended Internal Rate of Return) is used specifically for SIPs as it accounts for the timing of multiple cash flows. A positive green indicator signifies profit, while red indicates a loss. These metrics help you evaluate the true efficiency of your investment strategy.' 
        },
        { 
            id: '4', 
            title: 'How to safely edit or delete old investments?', 
            content: 'If you made a mistake during entry, go to the "Portfolio" screen and locate the investment in the list. Click on the options menu next to the entry. Choose "Edit" to update the amount, date, or price. If you wish to remove it entirely, select "Delete". Note that deleting an investment will permanently remove its historical data from your performance charts, so ensure you have a backup if needed.' 
        },
        {
            id: '5',
            title: 'How to export my investment data?',
            content: 'For your convenience, WealthWise allows you to export your entire investment history. Visit the "Settings" page and navigate to the "Privacy & Data" tab. There you will find a "Download My Data" button. Clicking this will generate a secure CSV file containing all your transactions, which can be utilized for tax filings, external audits, or personal record-keeping.'
        }
    ];

    const transition = {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 },
        transition: { duration: 0.2 }
    };

    const BackButton = () => (
        <button onClick={() => { setHelpView('menu'); setActiveGuide(null); }} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
            <FiArrowLeft /> Back to Menu
        </button>
    );

    return (
        <div className="help-support-container">
            <AnimatePresence mode="wait">
                {helpView === 'menu' && (
                    <motion.div key="menu" {...transition}>
                        <div className="settings-section-header">
                            <h2>Help & Support</h2>
                            <p>Find answers, contact support, and track your requests.</p>
                        </div>
                        <div className="settings-advanced-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
                            {[
                                { id: 'faqs', title: 'FAQs', icon: <FiBook />, desc: 'Browse our frequently asked questions.' },
                                { id: 'contact', title: 'Contact Us', icon: <FiMessageSquare />, desc: 'Get in touch with our support team.' },
                                { id: 'raiseTicket', title: 'Raise Ticket', icon: <FiLifeBuoy />, desc: 'Submit a new support ticket.' },
                                { id: 'helpCenter', title: 'Help Center', icon: <FiHelpCircle />, desc: 'Detailed guides and documentation.' },
                                { id: 'trackRequests', title: 'Track Requests', icon: <FiCheckCircle />, desc: 'View your previous support tickets.' }
                            ].map((item) => (
                                <div key={item.id} onClick={() => setHelpView(item.id)} className="setting-item" style={{ padding: '1.2rem', background: 'var(--bg-secondary)', borderRadius: '12px', cursor: 'pointer', transition: 'transform 0.2s, borderColor 0.2s', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                                        <span style={{ color: 'var(--primary-color)' }}>{item.icon}</span> {item.title}
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {helpView === 'faqs' && (
                    <motion.div key="faqs" {...transition}>
                        <BackButton />
                        <div className="settings-section-header">
                            <h3>Frequently Asked Questions</h3>
                        </div>
                        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {faqs.map((faq, idx) => (
                                <div key={idx} style={{ background: 'var(--bg-secondary)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                    <div 
                                        onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                                        style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: '500' }}
                                    >
                                        {faq.q}
                                        {expandedFaq === idx ? <FiChevronUp /> : <FiChevronDown />}
                                    </div>
                                    <AnimatePresence>
                                        {expandedFaq === idx && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }} 
                                                animate={{ height: 'auto', opacity: 1 }} 
                                                exit={{ height: 0, opacity: 0 }} 
                                                style={{ padding: '0 1.2rem 1.2rem', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}
                                            >
                                                {faq.a}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {helpView === 'contact' && (
                    <motion.div key="contact" {...transition}>
                        <BackButton />
                        <div className="settings-section-header">
                            <h3>Contact Us</h3>
                            <p>Email: <a href="mailto:shankarrao0420@gmail.com" style={{color:'var(--primary-color)'}}>shankarrao0420@gmail.com</a> | Phone: +91 98765 43210</p>
                        </div>
                        <form className="settings-form" onSubmit={handleContactSubmit} style={{ marginTop: '2rem' }}>
                            <div className="settings-input-group">
                                <label>Name</label>
                                <input required type="text" value={contactForm.name} onChange={(e)=>setContactForm({...contactForm, name:e.target.value})} placeholder="Your Name" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.8rem 1rem', borderRadius: '8px', width: '100%' }} />
                            </div>
                            <div className="settings-input-group">
                                <label>Email</label>
                                <input required type="email" value={contactForm.email} onChange={(e)=>setContactForm({...contactForm, email:e.target.value})} placeholder="Your Email" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.8rem 1rem', borderRadius: '8px', width: '100%' }} />
                            </div>
                            <div className="settings-input-group">
                                <label>Message</label>
                                <textarea required rows="4" value={contactForm.message} onChange={(e)=>setContactForm({...contactForm, message:e.target.value})} placeholder="How can we help you?" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.8rem 1rem', borderRadius: '8px', width: '100%', resize:'vertical' }} />
                            </div>
                            <button className="btn-primary" type="submit" disabled={isSubmitting} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content', marginTop: '1rem' }}>
                                {isSubmitting ? <span className="loader-spinner"></span> : <FiSend />} Send Message
                            </button>
                        </form>
                    </motion.div>
                )}

                {helpView === 'raiseTicket' && (
                    <motion.div key="raiseTicket" {...transition}>
                        <BackButton />
                        <div className="settings-section-header">
                            <h3>Raise a Support Ticket</h3>
                        </div>
                        <form className="settings-form" onSubmit={handleTicketSubmit} style={{ marginTop: '2rem' }}>
                            <div style={{display:'flex', gap:'1rem', flexWrap:'wrap', marginBottom:'1rem'}}>
                                <div className="settings-input-group" style={{flex:1, minWidth:'200px'}}>
                                    <label>Name</label>
                                    <input required type="text" value={ticketForm.title} onChange={(e)=>setTicketForm({...ticketForm, title:e.target.value})} placeholder="Full Name" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.8rem 1rem', borderRadius: '8px', width: '100%' }} />
                                </div>
                                <div className="settings-input-group" style={{flex:1, minWidth:'200px'}}>
                                    <label>Email</label>
                                    <input required type="email" value={ticketForm.email} onChange={(e)=>setTicketForm({...ticketForm, email:e.target.value})} placeholder="Email Address" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.8rem 1rem', borderRadius: '8px', width: '100%' }} />
                                </div>
                            </div>
                            <div style={{display:'flex', gap:'1rem', flexWrap:'wrap', marginBottom:'1rem'}}>
                                <div className="settings-input-group" style={{flex:1, minWidth:'200px'}}>
                                    <label>Issue Type</label>
                                    <select value={ticketForm.type} onChange={(e)=>setTicketForm({...ticketForm, type:e.target.value})} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.8rem 1rem', borderRadius: '8px', width: '100%' }}>
                                        <option value="Technical Issue">Technical Issue</option>
                                        <option value="Payment Issue">Payment Issue</option>
                                        <option value="Account Issue">Account Issue</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="settings-input-group" style={{flex:1, minWidth:'200px'}}>
                                    <label>Priority</label>
                                    <select value={ticketForm.priority} onChange={(e)=>setTicketForm({...ticketForm, priority:e.target.value})} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.8rem 1rem', borderRadius: '8px', width: '100%' }}>
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>
                            </div>
                            <div className="settings-input-group">
                                <label>Description</label>
                                <textarea required rows="5" value={ticketForm.description} onChange={(e)=>setTicketForm({...ticketForm, description:e.target.value})} placeholder="Describe your issue in detail..." style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.8rem 1rem', borderRadius: '8px', width: '100%', resize:'vertical' }} />
                            </div>
                            <button className="btn-primary" type="submit" disabled={isSubmitting} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content', marginTop: '1rem' }}>
                                {isSubmitting ? <span className="loader-spinner"></span> : <FiPlusCircle />} Submit Ticket
                            </button>
                        </form>
                    </motion.div>
                )}

                {helpView === 'helpCenter' && (
                    <motion.div key="helpCenter" {...transition}>
                        <BackButton />
                        <div className="settings-section-header">
                            <h3>Help Center Guides</h3>
                        </div>
                        {activeGuide ? (
                            <div style={{ marginTop: '2rem', background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <h2 style={{ marginBottom: '1rem' }}>{activeGuide.title}</h2>
                                <p style={{ lineHeight: '1.6', color: 'var(--text-secondary)' }}>{activeGuide.content}</p>
                                <button onClick={() => setActiveGuide(null)} className="btn-secondary" style={{ marginTop: '2rem', padding: '0.5rem 1rem' }}>Back to Guides</button>
                            </div>
                        ) : (
                            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {guides.map(guide => (
                                    <div key={guide.id} onClick={() => setActiveGuide(guide)} style={{ background: 'var(--bg-secondary)', padding: '1.2rem', borderRadius: '12px', cursor: 'pointer', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h4 style={{ margin: 0, fontWeight: '500' }}>{guide.title}</h4>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {helpView === 'trackRequests' && (
                    <motion.div key="trackRequests" {...transition}>
                        <BackButton />
                        <div className="settings-section-header">
                            <h3>Track Requests</h3>
                        </div>
                        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {tickets.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)' }}>You haven't submitted any tickets yet.</p>
                            ) : (
                                tickets.map(ticket => (
                                    <div key={ticket.id} style={{ background: 'var(--bg-secondary)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                        <div>
                                            <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {ticket.id} <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', background: 'var(--bg-primary)', borderRadius: '12px', color: 'var(--text-secondary)' }}>{ticket.type}</span>
                                            </h4>
                                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{ticket.title} - {ticket.date}</p>
                                        </div>
                                        <span style={{ 
                                            padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold',
                                            background: ticket.status === 'Open' ? 'rgba(59,130,246,0.1)' : ticket.status === 'Resolved' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                            color: ticket.status === 'Open' ? '#3b82f6' : ticket.status === 'Resolved' ? '#10b981' : '#f59e0b'
                                        }}>
                                            {ticket.status}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
