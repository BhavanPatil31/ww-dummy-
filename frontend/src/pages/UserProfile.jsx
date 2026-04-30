import { useState, useEffect } from "react";
import {
    FiUser, FiCamera,
    FiTrash2, FiSave, FiEdit2, FiCheckCircle, FiAlertTriangle,
    FiShield, FiBriefcase, FiLock
} from "react-icons/fi";
import { motion as Motion, AnimatePresence } from "framer-motion";
import InfoHint from "../components/InfoHint";
import "../styles/UserProfile.css";

const API_BASE = "http://localhost:8088/api/profiles";

const emptyEditForm = {
    firstName: "",
    lastName: "",
    email: "",
    mobileNumber: "",
    gender: "",
    taxId: "",
    taxCountry: "",
    residentialAddress: "",
    occupation: "",
    dob: "",
    bio: "",
};

const normalizeName = (name = "") => name.trim().replace(/\s+/g, " ");

const buildProfileName = (firstName, lastName) => normalizeName(`${firstName || ""} ${lastName || ""}`);

const getFillRatio = (form) => {
    const fields = [
        form.firstName,
        form.lastName,
        form.email,
        form.mobileNumber,
        form.occupation,
        form.dob,
        form.gender,
        form.bio,
        form.residentialAddress,
        form.taxCountry,
        form.taxId,
    ];
    const filled = fields.filter((value) => normalizeName(String(value || "")) !== "").length;
    return Math.round((filled / fields.length) * 100);
};

export default function UserProfile({ user }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [isEditing, setIsEditing] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [editForm, setEditForm] = useState(emptyEditForm);

    const uid = user?.userId || user?.id;
    const profileFill = getFillRatio(editForm);
    const displayName = profile?.name || user?.name || "Investor Profile";

    useEffect(() => {
        if (!uid) return;
        fetchProfileByUserId(uid);
        const savedAvatar = localStorage.getItem(`avatar_${uid}`);
        if (savedAvatar) setAvatarUrl(savedAvatar);
    }, [uid]);

    useEffect(() => {
        if (profile) {
            const nameParts = normalizeName(profile.name).split(" ").filter(Boolean);
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || "";
            setEditForm({
                ...emptyEditForm,
                firstName,
                lastName,
                email: profile.email || "",
                mobileNumber: profile.phone || "",
                gender: profile.gender || "",
                taxId: profile.taxId || "",
                taxCountry: profile.taxCountry || "",
                residentialAddress: profile.residentialAddress || "",
                occupation: profile.occupation || "",
                dob: profile.dob || "",
                bio: profile.bio || "",
            });
        } else if (user) {
            const nameParts = normalizeName(user.name).split(" ").filter(Boolean);
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || "";
            setEditForm((prev) => ({
                ...prev,
                ...emptyEditForm,
                firstName,
                lastName,
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
            if (res.ok) {
                setProfile(await res.json());
            }
        } catch {
            console.log("No profile yet");
        }
    };

    const handleAvatarUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result;
            setAvatarUrl(result);
            localStorage.setItem(`avatar_${uid}`, result);
            showMessage("Avatar updated!", "success");
        };
        reader.readAsDataURL(file);
    };

    const handleAvatarDelete = (e) => {
        e.stopPropagation();
        setAvatarUrl(null);
        if (uid) {
            localStorage.removeItem(`avatar_${uid}`);
        }
        showMessage("Avatar removed", "info");
    };

    const updateField = (field, value) => {
        setEditForm((prev) => ({ ...prev, [field]: value }));
    };

    const submitJson = async (url, method, body) => {
        const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || "Failed to save profile");
        }

        return response.json().catch(() => null);
    };

    const saveChanges = async () => {
        setLoading(true);

        const finalName = buildProfileName(editForm.firstName, editForm.lastName);
        const trimmedEmail = normalizeName(editForm.email);
        const trimmedPhone = normalizeName(editForm.mobileNumber);

        if (!finalName || !trimmedEmail || !trimmedPhone) {
            showMessage("Full name, email, and phone are required.", "error");
            setLoading(false);
            return;
        }

        try {
            if (!profile) {
                const payload = {
                    userId: uid,
                    name: finalName,
                    email: trimmedEmail,
                    phone: trimmedPhone,
                    password: "dummy_pass_123",
                    gender: editForm.gender || null,
                    taxId: normalizeName(editForm.taxId) || null,
                    taxCountry: normalizeName(editForm.taxCountry) || null,
                    residentialAddress: normalizeName(editForm.residentialAddress) || null,
                    occupation: normalizeName(editForm.occupation) || null,
                    dob: editForm.dob || null,
                    bio: normalizeName(editForm.bio) || null,
                };

                const res = await fetch(API_BASE, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    const errText = await res.text();
                    throw new Error(errText || "Failed to create profile");
                }

                setProfile(await res.json());
            } else {
                const currentName = normalizeName(profile.name || "");
                const currentEmail = normalizeName(profile.email || "");
                const currentPhone = normalizeName(profile.phone || "");

                const requests = [];

                if (finalName !== currentName) {
                    requests.push(
                        submitJson(`${API_BASE}/${profile.profileId}/name`, "PATCH", {
                            name: finalName,
                        })
                    );
                }

                if (trimmedEmail !== currentEmail) {
                    requests.push(
                        submitJson(`${API_BASE}/${profile.profileId}/email`, "PATCH", {
                            newEmail: trimmedEmail,
                        })
                    );
                }

                if (trimmedPhone !== currentPhone) {
                    requests.push(
                        submitJson(`${API_BASE}/${profile.profileId}/phone`, "PATCH", {
                            phone: trimmedPhone,
                        })
                    );
                }

                requests.push(
                    submitJson(`${API_BASE}/${profile.profileId}/details`, "PATCH", {
                        gender: editForm.gender || null,
                        taxId: normalizeName(editForm.taxId) || null,
                        taxCountry: normalizeName(editForm.taxCountry) || null,
                        residentialAddress: normalizeName(editForm.residentialAddress) || null,
                        occupation: normalizeName(editForm.occupation) || null,
                        dob: editForm.dob || null,
                        bio: normalizeName(editForm.bio) || null,
                    })
                );

                await Promise.all(requests);
            }

            showMessage("Profile updated successfully!", "success");
            setIsEditing(false);
            fetchProfileByUserId(uid);
        } catch (err) {
            showMessage(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const getInitials = () => {
        const name = displayName;
        const parts = normalizeName(name).split(" ").filter(Boolean);
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return (parts[0]?.[0] || "U").toUpperCase();
    };

    return (
        <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="profile_premium_wrapper">
            <AnimatePresence>
                {message.text && (
                    <Motion.div
                        initial={{ opacity: 0, y: -20, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, y: -20, x: "-50%" }}
                        className={`premium_toast ${message.type}`}
                    >
                        {message.type === "success" ? <FiCheckCircle /> : <FiAlertTriangle />}
                        <span>{message.text}</span>
                    </Motion.div>
                )}
            </AnimatePresence>

            <div className="premium_hero_section">
                <div className="premium_cover_photo">
                    <div className="cover_overlay"></div>
                </div>

                <div className="premium_hero_content">
                    <div className="premium_avatar_container">
                        <label className="premium_avatar_ring" title="Click to upload">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" />
                            ) : (
                                <div className="premium_initials">{getInitials()}</div>
                            )}
                            <div className="avatar_upload_overlay"><FiCamera /></div>
                            <input type="file" hidden accept="image/*" onChange={handleAvatarUpload} />
                        </label>
                        {avatarUrl && (
                            <button className="premium_avatar_delete" onClick={handleAvatarDelete}>
                                <FiTrash2 />
                            </button>
                        )}
                    </div>

                    <div className="premium_hero_details">
                        <div className="profile_hero_kicker">
                            <span className="profile_kicker">Private Wealth Profile</span>
                            <span className="profile_surface_tag">Secure record</span>
                        </div>
                        <h1 className="premium_display_name">{displayName}</h1>
                        <p className="premium_subtitle">
                            {editForm.occupation || "Executive overview of your financial identity, contact details, and compliance profile."}
                        </p>
                        <div className="premium_badges">
                            {profile ? (
                                <span className="badge_status verified"><FiShield /> Verified Account</span>
                            ) : (
                                <span className="badge_status unverified"><FiAlertTriangle /> Profile not created yet</span>
                            )}
                            <span className="badge_status subtle">{profileFill}% complete</span>
                        </div>
                        <div className="profile_progress_block">
                            <div className="profile_progress_header">
                                <span>Profile completeness</span>
                                <strong>{profileFill}%</strong>
                            </div>
                            <div className="profile_progress_bar">
                                <span style={{ width: `${profileFill}%` }} />
                            </div>
                        </div>
                    </div>

                    {!isEditing && (
                        <button className="premium_btn_edit" onClick={() => setIsEditing(true)}>
                            <FiEdit2 /> Edit Profile
                        </button>
                    )}
                </div>
            </div>

            <div className="premium_body_layout">
                {isEditing ? (
                    <Motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="premium_edit_form">
                        <div className="premium_glass_card">
                            <div className="section_heading_row">
                                <h3 className="section_title">
                                    <FiUser /> Account & Identity
                                    <InfoHint text="These details identify your account and should stay aligned with your login information." />
                                </h3>
                                <span className="section_note">Required for account access</span>
                            </div>
                            <div className="section_blurb">
                                Keep your name, email, and phone current so your financial record stays accurate and professional.
                            </div>
                            <div className="form_grid_2">
                                <div className="premium_input_group">
                                    <label>First Name <span className="field_required">Required</span> <InfoHint text="Enter your given name." /></label>
                                    <input type="text" value={editForm.firstName} onChange={(e) => updateField("firstName", e.target.value)} />
                                </div>
                                <div className="premium_input_group">
                                    <label>Last Name <span className="field_required">Required</span> <InfoHint text="Enter your family name." /></label>
                                    <input type="text" value={editForm.lastName} onChange={(e) => updateField("lastName", e.target.value)} />
                                </div>
                                <div className="premium_input_group">
                                    <label>Email Address <span className="field_required">Required</span> <InfoHint text="This is your primary account email." /></label>
                                    <input type="email" value={editForm.email} onChange={(e) => updateField("email", e.target.value)} />
                                </div>
                                <div className="premium_input_group">
                                    <label>Phone Number <span className="field_required">Required</span> <InfoHint text="Used for notifications and future security checks." /></label>
                                    <input type="text" value={editForm.mobileNumber} onChange={(e) => updateField("mobileNumber", e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="premium_glass_card mt-4">
                            <div className="section_heading_row">
                                <h3 className="section_title">
                                    <FiBriefcase /> Personal & Preferences
                                    <InfoHint text="Optional details that help personalize your experience." />
                                </h3>
                                <span className="section_note">Optional, but useful</span>
                            </div>
                            <div className="section_blurb">
                                These details help shape insights, service tone, and planning context.
                            </div>
                            <div className="form_grid_2">
                                <div className="premium_input_group">
                                    <label>Date of Birth <InfoHint text="Useful for profile completeness and future planning features." /></label>
                                    <input type="date" value={editForm.dob} onChange={(e) => updateField("dob", e.target.value)} />
                                </div>
                                <div className="premium_input_group">
                                    <label>Occupation <InfoHint text="Optional, helps tailor recommendations." /></label>
                                    <input
                                        type="text"
                                        value={editForm.occupation}
                                        onChange={(e) => updateField("occupation", e.target.value)}
                                        placeholder="e.g. Software Engineer"
                                    />
                                </div>
                                <div className="premium_input_group full_width">
                                    <label>Gender <InfoHint text="Optional demographic information for your profile." /></label>
                                    <div className="premium_radio_group compact">
                                        {['Male', 'Female', 'Other', 'Prefer not to say'].map((gender) => (
                                            <button
                                                key={gender}
                                                type="button"
                                                className={editForm.gender === gender ? "active" : ""}
                                                onClick={() => updateField("gender", gender)}
                                            >
                                                {gender}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="premium_input_group full_width">
                                    <label>Bio <InfoHint text="A short intro shown in your profile summary." /></label>
                                    <textarea
                                        rows="3"
                                        value={editForm.bio}
                                        onChange={(e) => updateField("bio", e.target.value)}
                                        placeholder="Tell us a little about yourself..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="premium_glass_card mt-4">
                            <div className="section_heading_row">
                                <h3 className="section_title">
                                    <FiLock /> Financial Identity & Tax
                                    <InfoHint text="Sensitive compliance details used for financial and tax-related records." />
                                </h3>
                                <span className="section_note">Secure / compliance data</span>
                            </div>
                            <div className="section_blurb">
                                Keep address and tax information accurate. These fields are part of your financial and compliance record.
                            </div>
                            <div className="form_grid_2">
                                <div className="premium_input_group full_width">
                                    <label>Residential Address <InfoHint text="Current residence used for contact and compliance records." /></label>
                                    <textarea
                                        rows="2"
                                        value={editForm.residentialAddress}
                                        onChange={(e) => updateField("residentialAddress", e.target.value)}
                                        placeholder="Enter your current address"
                                    />
                                </div>
                                <div className="premium_input_group">
                                    <label>Tax Country <InfoHint text="Country where your tax identification applies." /></label>
                                    <input
                                        type="text"
                                        value={editForm.taxCountry}
                                        onChange={(e) => updateField("taxCountry", e.target.value)}
                                        placeholder="e.g. India"
                                    />
                                </div>
                                <div className="premium_input_group">
                                    <label>Tax ID <InfoHint text="PAN, TIN, or equivalent tax identifier if applicable." /></label>
                                    <input
                                        type="text"
                                        value={editForm.taxId}
                                        onChange={(e) => updateField("taxId", e.target.value)}
                                        placeholder="Optional tax identifier"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="premium_form_actions">
                            <button type="button" className="btn_premium_cancel" onClick={() => setIsEditing(false)}>
                                Cancel
                            </button>
                            <button type="button" className="btn_premium_save" onClick={saveChanges} disabled={loading}>
                                {loading ? "Saving..." : <><FiSave /> Save Changes</>}
                            </button>
                        </div>
                    </Motion.div>
                ) : (
                    <Motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="premium_view_layout">
                        <div className="premium_glass_card mb-4">
                            <div className="section_heading_row">
                                <h3 className="section_title">Profile Snapshot</h3>
                                <span className="section_note">Quick overview</span>
                            </div>
                            <div className="section_blurb">
                                A concise view of your identity, completion status, and financial record health.
                            </div>
                            <div className="profile_summary_grid">
                                <div className="profile_summary_card">
                                    <span className="summary_label">Account Name</span>
                                    <strong>{displayName}</strong>
                                </div>
                                <div className="profile_summary_card">
                                    <span className="summary_label">Email</span>
                                    <strong>{editForm.email || "--"}</strong>
                                </div>
                                <div className="profile_summary_card">
                                    <span className="summary_label">Status</span>
                                    <strong>{profile ? "Verified" : "Unverified"}</strong>
                                </div>
                                <div className="profile_summary_card">
                                    <span className="summary_label">Profile completeness</span>
                                    <strong>{profileFill}%</strong>
                                </div>
                            </div>
                        </div>

                        {editForm.bio && (
                            <div className="premium_glass_card mb-4">
                                <div className="section_heading_row">
                                    <h3 className="section_title">About Me</h3>
                                    <span className="section_note">Personal summary</span>
                                </div>
                                <div className="section_blurb">
                                    A short profile summary for relationship and advisory context.
                                </div>
                                <p className="read_only_text">{editForm.bio}</p>
                            </div>
                        )}

                        <div className="premium_glass_card mb-4">
                            <div className="section_heading_row">
                                <h3 className="section_title"><FiUser /> Account & Identity</h3>
                                <span className="section_note">Core account details</span>
                            </div>
                            <div className="section_blurb">
                                These fields establish who you are within the platform.
                            </div>
                            <div className="read_only_grid">
                                <div className="read_only_item">
                                    <label>Full Name</label>
                                    <span>{buildProfileName(editForm.firstName, editForm.lastName) || "--"}</span>
                                </div>
                                <div className="read_only_item">
                                    <label>Email Address</label>
                                    <span>{editForm.email || "--"}</span>
                                </div>
                                <div className="read_only_item">
                                    <label>Phone Number</label>
                                    <span>{editForm.mobileNumber || "--"}</span>
                                </div>
                                <div className="read_only_item">
                                    <label>Avatar</label>
                                    <span>{avatarUrl ? "Custom avatar uploaded" : "Using initials"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="premium_glass_card mb-4">
                            <div className="section_heading_row">
                                <h3 className="section_title"><FiBriefcase /> Personal & Preferences</h3>
                                <span className="section_note">Optional profile details</span>
                            </div>
                            <div className="section_blurb">
                                Optional details that refine your profile and recommendations.
                            </div>
                            <div className="read_only_grid">
                                <div className="read_only_item">
                                    <label>Occupation</label>
                                    <span>{editForm.occupation || "--"}</span>
                                </div>
                                <div className="read_only_item">
                                    <label>Date of Birth</label>
                                    <span>{editForm.dob || "--"}</span>
                                </div>
                                <div className="read_only_item">
                                    <label>Gender</label>
                                    <span>{editForm.gender || "--"}</span>
                                </div>
                                <div className="read_only_item">
                                    <label>Bio</label>
                                    <span>{editForm.bio || "--"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="premium_glass_card mb-4">
                            <div className="section_heading_row">
                                <h3 className="section_title"><FiLock /> Financial Identity & Tax</h3>
                                <span className="section_note">Compliance details</span>
                            </div>
                            <div className="section_blurb">
                                These details support financial documentation and compliance workflows.
                            </div>
                            <div className="read_only_grid">
                                <div className="read_only_item full_width">
                                    <label>Residential Address</label>
                                    <span>{editForm.residentialAddress || "--"}</span>
                                </div>
                                <div className="read_only_item">
                                    <label>Tax Country</label>
                                    <span>{editForm.taxCountry || "--"}</span>
                                </div>
                                <div className="read_only_item">
                                    <label>Tax ID</label>
                                    <span>{editForm.taxId || "--"}</span>
                                </div>
                            </div>
                        </div>
                    </Motion.div>
                )}
            </div>
        </Motion.div>
    );
}
