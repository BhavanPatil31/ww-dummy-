import { useState, useEffect } from "react";
import "../styles/UserProfile.css";

const API_BASE = "http://localhost:8088/api/profiles";

export default function UserProfile({ user, onBack, onLogout, onProfileUpdate }) {

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [activeTab, setActiveTab] = useState("view");
    const [deleteConfirm, setDeleteConfirm] = useState("");

    // ✅ Single edit form for all fields
    const [editForm, setEditForm] = useState({
        name: "",
        email: "",
        phone: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    useEffect(() => {
        if (user && user.userId) fetchProfileByUserId(user.userId);
    }, [user]);

    // ✅ When profile loads, prefill form with current values
    useEffect(() => {
        if (profile) {
            setEditForm(prev => ({
                ...prev,
                name: profile.name || "",
                email: profile.email || "",
                phone: profile.phone || "",
            }));
        }
    }, [profile]);

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: "", type: "" }), 4000);
    };

    const fetchProfileByUserId = async (userId) => {
        try {
            const res = await fetch(`${API_BASE}/user/${userId}`);
            if (res.ok) setProfile(await res.json());
        } catch (err) { console.log("No profile yet"); }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "Unknown";
        return new Date(dateStr).toLocaleDateString("en-IN", {
            day: "numeric", month: "long", year: "numeric"
        });
    };

    // ✅ Save all changes at once
    const saveAllChanges = async () => {
        if (!profile) return showMessage("No profile loaded", "error");
        setLoading(true);

        try {
            // Update name if changed
            if (editForm.name.trim() && editForm.name.trim() !== profile.name) {
                const res = await fetch(`${API_BASE}/${profile.profileId}/name`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: editForm.name.trim() }),
                });
                if (!res.ok) {
                    const text = await res.text();
                    showMessage(text || "Failed to update name", "error");
                    setLoading(false);
                    return;
                }
                const updated = await res.json();
                setProfile(updated);
                if (onProfileUpdate) onProfileUpdate(updated);
            }

            // Update email if changed
            if (editForm.email.trim() && editForm.email.trim() !== profile.email) {
                const res = await fetch(`${API_BASE}/${profile.profileId}/email`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ newEmail: editForm.email.trim() }),
                });
                if (!res.ok) {
                    const text = await res.text();
                    showMessage(text || "Failed to update email", "error");
                    setLoading(false);
                    return;
                }
                const updated = await res.json();
                setProfile(updated);
            }

            // Update phone if changed
            if (editForm.phone.trim() && editForm.phone.trim() !== profile.phone) {
                const res = await fetch(`${API_BASE}/${profile.profileId}/phone`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone: editForm.phone.trim() }),
                });
                if (!res.ok) {
                    const text = await res.text();
                    showMessage(text || "Failed to update phone", "error");
                    setLoading(false);
                    return;
                }
                const updated = await res.json();
                setProfile(updated);
            }

            // Update password only if user filled it
            if (editForm.newPassword) {
                if (editForm.newPassword !== editForm.confirmPassword) {
                    showMessage("Passwords do not match", "error");
                    setLoading(false);
                    return;
                }
                if (editForm.newPassword.length < 6) {
                    showMessage("Password must be at least 6 characters", "error");
                    setLoading(false);
                    return;
                }
                if (!editForm.currentPassword) {
                    showMessage("Enter current password to change password", "error");
                    setLoading(false);
                    return;
                }
                const res = await fetch(`${API_BASE}/${profile.profileId}/password`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        currentPassword: editForm.currentPassword,
                        newPassword: editForm.newPassword,
                        confirmPassword: editForm.confirmPassword,
                    }),
                });
                if (!res.ok) {
                    const text = await res.text();
                    showMessage(text || "Failed to update password", "error");
                    setLoading(false);
                    return;
                }
            }

            showMessage("Profile updated successfully!", "success");
            // Clear password fields after save
            setEditForm(prev => ({
                ...prev,
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            }));

        } catch {
            showMessage("Cannot connect to server", "error");
        }
        setLoading(false);
    };

    const deleteAccount = async () => {
        if (deleteConfirm !== "DELETE") {
            return showMessage("Please type DELETE exactly to confirm", "error");
        }
        setLoading(true);
        try {
            const uid = user?.userId;
            if (profile) {
                await fetch(`${API_BASE}/${profile.profileId}`, { method: "DELETE" });
            }
            const res = await fetch(
                `http://localhost:8088/api/auth/delete/${uid}`,
                { method: "DELETE" }
            );
            if (res.ok) {
                showMessage("Account deleted successfully. Redirecting...", "success");
                setTimeout(() => { onLogout(); }, 2500);
            } else {
                const text = await res.text();
                showMessage(text || "Failed to delete account", "error");
            }
        } catch { showMessage("Cannot connect to server", "error"); }
        setLoading(false);
    };

    // ✅ Only 3 tabs now
    const tabs = [
        { key: "view",   label: "View" },
        { key: "edit",   label: "Edit Profile" },
        { key: "delete", label: "Delete Account" },
    ];

    return (
        <div className="profile-page">

            {/* SIDEBAR */}
            <aside className="profile-sidebar">
                <div className="profile-brand">
                    <h2>WealthWise</h2>
                </div>
                <nav className="profile-nav">
                    <div className="profile-nav-item" onClick={onBack}>
                        Dashboard
                    </div>
                    <div className="profile-nav-item active">
                        My Profile
                    </div>
                </nav>
                <div className="profile-sidebar-bottom">
                    <button className="profile-logout-btn" onClick={onLogout}>
                        Logout
                    </button>
                </div>
            </aside>

            {/* MAIN */}
            <main className="profile-main">

                {/* HEADER */}
                <header className="profile-header">
                    <div className="profile-header-left">
                        <h1>My Profile</h1>
                        <p>Manage your personal details</p>
                    </div>
                    <div className="profile-header-right">
                        <div className="profile-avatar-small">
                            {profile?.name?.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <span className="profile-header-name">
                            {profile?.name || user?.name || "User"}
                        </span>
                    </div>
                </header>

                <div className="profile-content">

                    {/* BANNER */}
                    {message.text && (
                        <div className={`profile-banner ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    {/* PROFILE CARD */}
                    {profile ? (
                        <div className="profile-card">
                            <div className="profile-avatar-large">
                                {profile.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="profile-info-name">{profile.name}</div>
                                <div className="profile-info-email">{profile.email}</div>
                                <div className="profile-info-meta">
                                    {profile.phone || "No phone added"} &nbsp;|&nbsp; Member since {formatDate(profile.createdDate)}
                                </div>
                            </div>
                            <div className="profile-active-badge">Active</div>
                        </div>
                    ) : (
                        <div className="profile-no-profile">
                            {loading ? "Loading..." : "No profile found. Use Edit Profile tab below."}
                        </div>
                    )}

                    {/* TABS — only 3 now */}
                    <div className="profile-tab-bar">
                        {tabs.map(({ key, label }) => (
                            <button
                                key={key}
                                className={`profile-tab ${activeTab === key ? "active" : ""} ${key === "delete" ? "delete-tab" : ""}`}
                                onClick={() => setActiveTab(key)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* TAB CARD */}
                    <div className="profile-tab-card">

                        {/* VIEW */}
                        {activeTab === "view" && (
                            <div>
                                <h3>Profile Details</h3>
                                {profile ? (
                                    <div className="profile-detail-grid">
                                        {[
                                            { label: "Full Name",    value: profile.name },
                                            { label: "Email",        value: profile.email },
                                            { label: "Phone",        value: profile.phone || "Not set" },
                                            { label: "Member Since", value: formatDate(profile.createdDate) },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="profile-detail-row">
                                                <span className="profile-detail-label">{label}</span>
                                                <span className="profile-detail-value">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="profile-empty-text">No profile yet. Use Edit Profile tab.</p>
                                )}
                            </div>
                        )}

                        {/* ✅ EDIT PROFILE — all fields in one tab */}
                        {activeTab === "edit" && (
                            <div>
                                <h3>Edit Profile</h3>
                                <p className="profile-sub-text">
                                    Only fill the fields you want to change. Leave others as they are.
                                </p>

                                {/* Hidden dummy inputs to stop browser autofill */}
                                <input type="text" style={{ display: "none" }} />
                                <input type="password" style={{ display: "none" }} />

                                {/* ─── PERSONAL INFO SECTION ─── */}
                                <div className="edit-section-title">Personal Information</div>

                                <div className="profile-form-group">
                                    <label>Full Name</label>
                                    <input
                                        className="profile-input"
                                        type="text"
                                        placeholder="Enter your full name"
                                        autoComplete="new-password"
                                        name="fullname_field"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    />
                                </div>

                                <div className="profile-form-group">
                                    <label>Email</label>
                                    <input
                                        className="profile-input"
                                        type="text"
                                        placeholder="Enter your email"
                                        autoComplete="new-password"
                                        name="email_field"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    />
                                </div>

                                <div className="profile-form-group">
                                    <label>Phone</label>
                                    <input
                                        className="profile-input"
                                        type="text"
                                        placeholder="Enter your phone number"
                                        autoComplete="new-password"
                                        name="phone_field"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    />
                                </div>

                                {/* ─── PASSWORD SECTION ─── */}
                                <div className="edit-section-title" style={{ marginTop: "28px" }}>
                                    Change Password <span className="edit-section-optional">(optional)</span>
                                </div>

                                <div className="profile-form-group">
                                    <label>Current Password</label>
                                    <input
                                        className="profile-input"
                                        type="password"
                                        placeholder="Enter current password"
                                        autoComplete="new-password"
                                        name="current_pass"
                                        value={editForm.currentPassword}
                                        onChange={(e) => setEditForm({ ...editForm, currentPassword: e.target.value })}
                                    />
                                </div>

                                <div className="profile-form-group">
                                    <label>New Password</label>
                                    <input
                                        className="profile-input"
                                        type="password"
                                        placeholder="Min 6 characters"
                                        autoComplete="new-password"
                                        name="new_pass"
                                        value={editForm.newPassword}
                                        onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                                    />
                                </div>

                                <div className="profile-form-group">
                                    <label>Confirm New Password</label>
                                    <input
                                        className="profile-input"
                                        type="password"
                                        placeholder="Repeat new password"
                                        autoComplete="new-password"
                                        name="confirm_pass"
                                        value={editForm.confirmPassword}
                                        onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                                    />
                                </div>

                                <button
                                    className="profile-save-btn"
                                    onClick={saveAllChanges}
                                    disabled={loading}
                                >
                                    {loading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        )}

                        {/* DELETE ACCOUNT */}
                        {activeTab === "delete" && (
                            <div>
                                <h3 className="delete-title">Delete Account</h3>
                                <div className="delete-warning">
                                    <p className="delete-warning-title">
                                        Warning — This action cannot be undone!
                                    </p>
                                    <p className="delete-warning-text">
                                        Deleting your account will permanently remove:
                                    </p>
                                    <ul className="delete-warning-list">
                                        <li>Your profile information</li>
                                        <li>All your investments and portfolio data</li>
                                        <li>Your transaction history</li>
                                        <li>All account settings and preferences</li>
                                    </ul>
                                    <p className="delete-warning-text">
                                        Once deleted, your data <b style={{ color: "#ef4444" }}>cannot be recovered</b>. If you are sure, type <b style={{ color: "#ef4444" }}>DELETE</b> in the box below.
                                    </p>
                                </div>
                                <div className="profile-form-group">
                                    <label>Type DELETE to confirm</label>
                                    <input
                                        className="profile-input delete-input"
                                        type="text"
                                        placeholder="Type DELETE here"
                                        autoComplete="off"
                                        value={deleteConfirm}
                                        onChange={(e) => setDeleteConfirm(e.target.value)}
                                    />
                                </div>
                                <button
                                    className="delete-btn"
                                    onClick={deleteAccount}
                                    disabled={loading || deleteConfirm !== "DELETE"}
                                >
                                    {loading ? "Deleting Account..." : "Delete My Account Permanently"}
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            </main>
        </div>
    );
}