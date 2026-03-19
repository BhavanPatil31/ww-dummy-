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
    });

    useEffect(() => {
        const uid = user?.userId || user?.id;
        if (uid) fetchProfileByUserId(uid);
    }, [user]);

    // ✅ Prefill from profile OR from user object if profile is missing
    useEffect(() => {
        if (profile) {
            setEditForm(prev => ({
                ...prev,
                name: profile.name || "",
                email: profile.email || "",
                phone: profile.phone || "",
            }));
        } else if (user) {
            setEditForm(prev => ({
                ...prev,
                name: user.name || "",
                email: user.email || "",
            }));
        }
    }, [profile, user]);

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
        setLoading(true);
        const uid = user?.userId || user?.id;

        try {
            // ─── CREATE PROFILE IF MISSING ───
            if (!profile) {
                const res = await fetch(API_BASE, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId: uid,
                        name: editForm.name.trim(),
                        email: editForm.email.trim(),
                        phone: editForm.phone.trim(),
                        password: editForm.newPassword || "dummy_pass_123" // password is required by backend DTO
                    }),
                });

                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(text || "Failed to create profile");
                }
                const newProfile = await res.json();
                setProfile(newProfile);
                if (onProfileUpdate) onProfileUpdate(newProfile);
                showMessage("Profile created successfully!", "success");
                setLoading(false);
                return;
            }
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
            
            // ✅ Refresh profile data from server
            const finalRes = await fetch(`${API_BASE}/user/${uid}`);
            if (finalRes.ok) {
                const finalProfile = await finalRes.json();
                setProfile(finalProfile);
                // ✅ Update main app state with latest name/email
                if (onProfileUpdate) onProfileUpdate(finalProfile);
            }

            // Clear password fields after save
            setEditForm(prev => ({
                ...prev,
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            }));

        } catch (err) {
            console.error("Save error:", err);
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
            const uid = user?.userId || user?.id;
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

    // ✅ Tabs for embedded view
    const tabs = [
        { key: "view",   label: "View" },
        { key: "edit",   label: "Edit Profile" },
        { key: "delete", label: "Delete Account" },
    ];

    return (
        <div className="profile-container-embedded">
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

                {/* TABS */}
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

                    {/* VIEW TAB */}
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
                                <div className="profile-empty-text">No profile yet. Use Edit Profile tab.</div>
                            )}
                        </div>
                    )}

                    {/* EDIT TAB */}
                    {activeTab === "edit" && (
                        <div>
                            <h3>Edit Profile</h3>
                            <p className="profile-sub-text">Only fill the fields you want to change. Others will remain as they are.</p>

                            <div className="edit-section-title">Personal Information</div>
                            
                            <div className="profile-form-group">
                                <label>Full Name</label>
                                <input
                                    type="text"
                                    className="profile-input"
                                    placeholder="Enter your name"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                />
                            </div>

                            <div className="profile-form-group">
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    className="profile-input"
                                    placeholder="Enter your email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                />
                            </div>

                            <div className="profile-form-group">
                                <label>Phone Number</label>
                                <input
                                    type="text"
                                    className="profile-input"
                                    placeholder="Enter your phone number"
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                />
                            </div>
                            <button
                                className="profile-save-btn"
                                onClick={saveAllChanges}
                                disabled={loading}
                            >
                                {loading ? "Saving..." : (profile ? "Save Changes" : "Create Profile")}
                            </button>
                        </div>
                    )}

                    {/* DELETE TAB */}
                    {activeTab === "delete" && (
                        <div>
                            <h3 className="delete-title">Delete Account</h3>
                            <div className="delete-warning">
                                <p className="delete-warning-title">Caution — This action is permanent!</p>
                                <p className="delete-warning-text">Logging out will not delete your account. If you proceed:</p>
                                <ul className="delete-warning-list">
                                    <li>Your profile and settings will be permanently removed.</li>
                                    <li>You will lose all your investments and portfolio history.</li>
                                    <li>This account cannot be recovered.</li>
                                </ul>
                                <p className="delete-warning-text">Please type <strong>DELETE</strong> below to confirm.</p>
                            </div>

                            <div className="profile-form-group">
                                <input
                                    type="text"
                                    className="profile-input delete-input"
                                    placeholder='Type "DELETE" to confirm'
                                    value={deleteConfirm}
                                    onChange={(e) => setDeleteConfirm(e.target.value)}
                                />
                            </div>

                            <button
                                className="delete-btn"
                                onClick={deleteAccount}
                                disabled={loading || deleteConfirm !== "DELETE"}
                            >
                                {loading ? "Deleting..." : "Delete My Account Permanently"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}