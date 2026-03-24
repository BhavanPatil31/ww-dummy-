import { useState, useEffect } from "react";
import "../styles/UserProfile.css";

const API_BASE = "http://localhost:8088/api/profiles";

export default function UserProfile({ user, onBack, onLogout, onProfileUpdate, theme, setTheme }) {

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [activeTab, setActiveTab] = useState("view");
    const [deleteConfirm, setDeleteConfirm] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(null);

    const [editForm, setEditForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        mobileNumber: "",
        gender: "",
        taxId: "",
        taxCountry: "",
        residentialAddress: ""
    });

    useEffect(() => {
        const uid = user?.userId || user?.id;
        if (uid) {
            fetchProfileByUserId(uid);
            const savedAvatar = localStorage.getItem(`avatar_${uid}`);
            if (savedAvatar) setAvatarUrl(savedAvatar);
        }
    }, [user]);

    const handleAvatarUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAvatarDelete = () => {
        setAvatarUrl(null);
    };

    // ✅ Prefill from profile OR from user object if profile is missing
    useEffect(() => {
        if (profile) {
            const nameParts = (profile.name || "").split(" ");
            const fName = nameParts[0] || "";
            const lName = nameParts.slice(1).join(" ") || "";
            setEditForm(prev => ({
                ...prev,
                firstName: fName,
                lastName: lName,
                email: profile.email || "",
                mobileNumber: profile.phone || "",
                gender: profile.gender || "",
                taxId: profile.taxId || "",
                taxCountry: profile.taxCountry || "",
                residentialAddress: profile.residentialAddress || ""
            }));
        } else if (user) {
            const nameParts = (user.name || "").split(" ");
            const fName = nameParts[0] || "";
            const lName = nameParts.slice(1).join(" ") || "";
            setEditForm(prev => ({
                ...prev,
                firstName: fName,
                lastName: lName,
                email: user.email || "",
                gender: "",
                taxId: "",
                taxCountry: "",
                residentialAddress: ""
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
        const finalName = `${editForm.firstName} ${editForm.lastName}`.trim();

        if (avatarUrl) {
            localStorage.setItem(`avatar_${uid}`, avatarUrl);
        } else {
            localStorage.removeItem(`avatar_${uid}`);
        }

        try {
            // ─── CREATE PROFILE IF MISSING ───
            if (!profile) {
                const res = await fetch(API_BASE, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId: uid,
                        name: finalName,
                        email: editForm.email.trim(),
                        phone: editForm.mobileNumber.trim(),
                        password: "dummy_pass_123" // password is required by backend DTO
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
            if (finalName && finalName !== profile.name) {
                const res = await fetch(`${API_BASE}/${profile.profileId}/name`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: finalName }),
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
            if (editForm.mobileNumber.trim() && editForm.mobileNumber.trim() !== profile.phone) {
                const res = await fetch(`${API_BASE}/${profile.profileId}/phone`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone: editForm.mobileNumber.trim() }),
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

            // ✅ Update details (gender, taxId, taxCountry, residentialAddress)
            const detailsPayload = {
                gender: editForm.gender,
                taxId: editForm.taxId,
                taxCountry: editForm.taxCountry,
                residentialAddress: editForm.residentialAddress
            };
            const detailsRes = await fetch(`${API_BASE}/${profile.profileId}/details`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(detailsPayload),
            });
            if (!detailsRes.ok) {
                 const text = await detailsRes.text();
                 throw new Error(text || "Failed to update detailed information");
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

            setIsEditing(false);

        } catch (err) {
            console.error("Save error:", err);
            showMessage(err.message || "Cannot connect to server", "error");
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

    // Internal sidebar tab state
    const [subTab, setSubTab] = useState("profile");

    return (
        <div className="profile-container-embedded">
            <h2 className="account-settings-title">Account settings</h2>
            <div className="profile-layout-wrapper">
                {/* ─── INNER SIDEBAR ─── */}
                <div className="profile-inner-sidebar">
                    <div className={`profile-inner-sidebar-item ${subTab === 'profile' ? 'active' : ''}`} onClick={() => setSubTab('profile')}>
                        <span className="icon">👤</span> Profile Settings
                    </div>

                </div>

                {/* ─── MAIN FORM AREA ─── */}
                <div className="profile-form-area">
                    {message.text && (
                        <div className={`profile-banner ${message.type}`} style={{ marginBottom: "20px" }}>
                            {message.text}
                        </div>
                    )}

                    {subTab === 'profile' && (
                        <div>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                                <h3 style={{margin: 0, color: 'var(--text-white)'}}>Personal Details</h3>
                                {!isEditing && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        style={{background: '#1d4ed8', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'}}
                                    >
                                        Edit Profile
                                    </button>
                                )}
                            </div>

                            {/* Avatar Section */}
                            <div className="profile-avatar-section" style={{opacity: isEditing ? 1 : 0.7}}>
                                <div className="avatar-wrapper">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}} />
                                    ) : (
                                        (profile?.name || user?.name || "U").charAt(0).toUpperCase()
                                    )}
                                     <label htmlFor="avatar-upload" className="avatar-badge" style={{display: isEditing ? 'flex' : 'none', cursor: 'pointer', zIndex: 10}}>📷</label>
                                     <input id="avatar-upload" type="file" accept="image/*" style={{display: 'none'}} onChange={handleAvatarUpload} disabled={!isEditing} />
                                </div>
                                <div className="avatar-buttons" style={{display: isEditing ? 'flex' : 'none'}}>
                                    <label htmlFor="avatar-upload" className="btn-upload" style={{cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Upload New</label>
                                    <button className="btn-delete-avatar" disabled={!isEditing} onClick={handleAvatarDelete}>Delete avatar</button>
                                </div>
                            </div>

                            {isEditing ? (
                                <div className="form-grid">
                                    <div className="profile-input-group">
                                        <label>First Name <span className="required-asterisk">*</span></label>
                                        <input
                                            type="text"
                                            placeholder="First name"
                                            value={editForm.firstName}
                                            onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                                        />
                                    </div>
                                    <div className="profile-input-group">
                                        <label>Last Name <span className="required-asterisk">*</span></label>
                                        <input
                                            type="text"
                                            placeholder="Last name"
                                            value={editForm.lastName}
                                            onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                                        />
                                    </div>

                                    <div className="profile-input-group">
                                        <label>Email</label>
                                        <input
                                            type="email"
                                            placeholder="examples@gmail.com"
                                            value={editForm.email}
                                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="profile-input-group">
                                        <label>Mobile Number <span className="required-asterisk">*</span></label>
                                        <input
                                            type="text"
                                            placeholder="e.g. +1 234 567 8900"
                                            value={editForm.mobileNumber}
                                            onChange={(e) => setEditForm({ ...editForm, mobileNumber: e.target.value })}
                                        />
                                    </div>

                                    <div className="profile-input-group">
                                        <label>Gender</label>
                                        <div className="gender-options">
                                            <label className="radio-label">
                                                <input
                                                    type="radio"
                                                    name="gender"
                                                    value="Male"
                                                    checked={editForm.gender === "Male"}
                                                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                                                />
                                                Male
                                            </label>
                                            <label className="radio-label">
                                                <input
                                                    type="radio"
                                                    name="gender"
                                                    value="Female"
                                                    checked={editForm.gender === "Female"}
                                                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                                                />
                                                Female
                                            </label>
                                        </div>
                                    </div>

                                    <div className="profile-input-group">
                                        <label>Tax Identification Number</label>
                                        <input
                                            type="text"
                                            placeholder="Tax ID"
                                            value={editForm.taxId}
                                            onChange={(e) => setEditForm({ ...editForm, taxId: e.target.value })}
                                        />
                                    </div>
                                    <div className="profile-input-group">
                                        <label>Tax Identification Country</label>
                                        <input
                                            type="text"
                                            placeholder="Country"
                                            value={editForm.taxCountry}
                                            onChange={(e) => setEditForm({ ...editForm, taxCountry: e.target.value })}
                                        />
                                    </div>

                                    <div className="profile-input-group form-group-full">
                                        <label>Residential Address</label>
                                        <textarea
                                            rows="3"
                                            placeholder="lb street orogun ibadan"
                                            value={editForm.residentialAddress}
                                            onChange={(e) => setEditForm({ ...editForm, residentialAddress: e.target.value })}
                                        ></textarea>
                                    </div>

                                    <div className="profile-input-group form-group-full" style={{ marginTop: '10px' }}>
                                        <button
                                            className="profile-save-btn"
                                            onClick={saveAllChanges}
                                            disabled={loading}
                                            style={{ width: 'max-content', background: '#1d4ed8', color: '#fff' }}
                                        >
                                            {loading ? "Saving..." : "Save Changes"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="profile-detail-grid">
                                    {[
                                        { label: "First Name", value: editForm.firstName || "Not set" },
                                        { label: "Last Name", value: editForm.lastName || "Not set" },
                                        { label: "Email", value: editForm.email || "Not set" },
                                        { label: "Mobile Number", value: editForm.mobileNumber || "Not set" },
                                        { label: "Gender", value: editForm.gender || "Not set" },
                                        { label: "Tax ID", value: editForm.taxId || "Not set" },
                                        { label: "Tax Country", value: editForm.taxCountry || "Not set" },
                                        { label: "Residential Address", value: editForm.residentialAddress || "Not set" }
                                    ].map(({ label, value }) => (
                                        <div key={label} className="profile-detail-row">
                                            <span className="profile-detail-label">{label}</span>
                                            <span className="profile-detail-value" style={{maxWidth: '60%', textAlign: 'right'}}>{value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}


                </div>
            </div>
        </div>
    );
}