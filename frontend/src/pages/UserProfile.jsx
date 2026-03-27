import { useState, useEffect } from "react";
import {
    FiUser, FiMail, FiPhone, FiMapPin, FiCamera,
    FiTrash2, FiSave, FiEdit2, FiCheckCircle, FiAlertTriangle,
    FiGlobe, FiTarget, FiInfo, FiX, FiShield, FiClock, FiBriefcase, FiCalendar
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import "../styles/UserProfile.css";

const API_BASE = "http://localhost:8088/api/profiles";

export default function UserProfile({ user, onBack, onLogout, onProfileUpdate }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [isEditing, setIsEditing] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(null);

    const [editForm, setEditForm] = useState({
        firstName: "", lastName: "", email: "",
        mobileNumber: "", gender: "", taxId: "",
        taxCountry: "", residentialAddress: "",
        occupation: "", dob: "", bio: ""
    });

    useEffect(() => {
        const uid = user?.userId || user?.id;
        if (uid) {
            fetchProfileByUserId(uid);
            const savedAvatar = localStorage.getItem(`avatar_${uid}`);
            if (savedAvatar) setAvatarUrl(savedAvatar);
        }
    }, [user]);

    useEffect(() => {
        if (profile) {
            const nameParts = (profile.name || "").split(" ");
            const fName = nameParts[0] || "";
            const lName = nameParts.slice(1).join(" ") || "";
            setEditForm({
                firstName: fName,
                lastName: lName,
                email: profile.email || "",
                mobileNumber: profile.phone || "",
                gender: profile.gender || "Male",
                taxId: profile.taxId || "",
                taxCountry: profile.taxCountry || "",
                residentialAddress: profile.residentialAddress || "",
                occupation: profile.occupation || "",
                dob: profile.dob || "",
                bio: profile.bio || ""
            });
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

    const handleAvatarUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result;
                setAvatarUrl(result);
                localStorage.setItem(`avatar_${user?.userId || user?.id}`, result);
                showMessage("Avatar updated!", "success");
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAvatarDelete = (e) => {
        e.stopPropagation();
        setAvatarUrl(null);
        localStorage.removeItem(`avatar_${user?.userId || user?.id}`);
        showMessage("Avatar removed", "info");
    };

    const saveChanges = async () => {
        setLoading(true);
        const uid = user?.userId || user?.id;
        const finalName = `${editForm.firstName} ${editForm.lastName}`.trim();

        try {
            if (!profile) {
                const res = await fetch(API_BASE, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId: uid, name: finalName, email: editForm.email,
                        phone: editForm.mobileNumber, password: "dummy_pass_123"
                    }),
                });
                if (!res.ok) throw new Error("Failed to create profile");
                const newProfile = await res.json();
                setProfile(newProfile);
            } else {
                await fetch(`${API_BASE}/${profile.profileId}/details`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        gender: editForm.gender, taxId: editForm.taxId,
                        taxCountry: editForm.taxCountry, residentialAddress: editForm.residentialAddress,
                        occupation: editForm.occupation, dob: editForm.dob, bio: editForm.bio
                    }),
                });
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
        const name = profile?.name || user?.name || "User";
        const parts = name.split(" ").filter(p => p);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0][0].toUpperCase();
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="profile_premium_wrapper">

            <AnimatePresence>
                {message.text && (
                    <motion.div initial={{ opacity: 0, y: -20, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: -20, x: "-50%" }} className={`premium_toast ${message.type}`}>
                        {message.type === 'success' ? <FiCheckCircle /> : <FiAlertTriangle />}
                        <span>{message.text}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cover & Hero Section */}
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
                            <button className="premium_avatar_delete" onClick={handleAvatarDelete}><FiTrash2 /></button>
                        )}
                    </div>

                    <div className="premium_hero_details">
                        <h1 className="premium_display_name">{profile?.name || user?.name || "Investor Profile"}</h1>
                        <p className="premium_subtitle">{editForm.occupation || "Active User"}</p>
                        <div className="premium_badges">
                            {profile ? (
                                <span className="badge_status verified"><FiShield /> Verified Account</span>
                            ) : (
                                <span className="badge_status unverified"><FiAlertTriangle /> Unverified</span>
                            )}
                        </div>
                    </div>

                    {!isEditing && (
                        <button className="premium_btn_edit" onClick={() => setIsEditing(true)}>
                            <FiEdit2 /> Edit Profile
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area - Single Column for all fields */}
            <div className="premium_body_layout">
                {isEditing ? (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="premium_edit_form">
                        <div className="premium_glass_card">
                            <h3 className="section_title"><FiUser /> Personal Details</h3>
                            <div className="form_grid_2">
                                <div className="premium_input_group">
                                    <label>First Name</label>
                                    <input type="text" value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} />
                                </div>
                                <div className="premium_input_group">
                                    <label>Last Name</label>
                                    <input type="text" value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} />
                                </div>
                                <div className="premium_input_group">
                                    <label>Date of Birth</label>
                                    <input type="date" value={editForm.dob} onChange={e => setEditForm({ ...editForm, dob: e.target.value })} />
                                </div>
                                <div className="premium_input_group">
                                    <label>Occupation</label>
                                    <input type="text" value={editForm.occupation} onChange={e => setEditForm({ ...editForm, occupation: e.target.value })} placeholder="e.g. Software Engineer" />
                                </div>
                                <div className="premium_input_group full_width">
                                    <label>Bio</label>
                                    <textarea rows="3" value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} placeholder="Tell us about yourself..."></textarea>
                                </div>
                                <div className="premium_input_group full_width">
                                    <label>Gender</label>
                                    <div className="premium_radio_group">
                                        {['Male', 'Female', 'Other'].map(g => (
                                            <button key={g} className={editForm.gender === g ? "active" : ""} onClick={() => setEditForm({ ...editForm, gender: g })}>{g}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="premium_glass_card mt-4">
                            <h3 className="section_title"><FiMail /> Contact & Location</h3>
                            <div className="form_grid_2">
                                <div className="premium_input_group">
                                    <label>Email Address</label>
                                    <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                                </div>
                                <div className="premium_input_group">
                                    <label>Phone Number</label>
                                    <input type="text" value={editForm.mobileNumber} onChange={e => setEditForm({ ...editForm, mobileNumber: e.target.value })} />
                                </div>
                                <div className="premium_input_group full_width">
                                    <label>Residential Address</label>
                                    <textarea rows="2" value={editForm.residentialAddress} onChange={e => setEditForm({ ...editForm, residentialAddress: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="premium_glass_card mt-4">
                            <h3 className="section_title"><FiShield /> Legal & Tax</h3>
                            <div className="form_grid_2">
                                <div className="premium_input_group">
                                    <label>Tax ID</label>
                                    <input type="text" value={editForm.taxId} onChange={e => setEditForm({ ...editForm, taxId: e.target.value })} />
                                </div>
                                <div className="premium_input_group">
                                    <label>Tax Country</label>
                                    <input type="text" value={editForm.taxCountry} onChange={e => setEditForm({ ...editForm, taxCountry: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="premium_form_actions">
                            <button className="btn_premium_cancel" onClick={() => setIsEditing(false)}>Cancel</button>
                            <button className="btn_premium_save" onClick={saveChanges} disabled={loading}>
                                {loading ? "Saving..." : <><FiSave /> Save Changes</>}
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    /* Read-Only View showing ALL fields */
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="premium_view_layout">

                        {editForm.bio && (
                            <div className="premium_glass_card mb-4">
                                <h3 className="section_title"><FiInfo /> About Me</h3>
                                <p className="read_only_text">{editForm.bio}</p>
                            </div>
                        )}

                        <div className="premium_glass_card mb-4">
                            <h3 className="section_title"><FiUser /> Personal Details</h3>
                            <div className="read_only_grid">
                                <div className="read_only_item">
                                    <label>Full Name</label>
                                    <span>{editForm.firstName} {editForm.lastName}</span>
                                </div>
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
                            </div>
                        </div>

                        <div className="premium_glass_card mb-4">
                            <h3 className="section_title"><FiMail /> Contact & Location</h3>
                            <div className="read_only_grid">
                                <div className="read_only_item">
                                    <label>Email Address</label>
                                    <span>{editForm.email || "--"}</span>
                                </div>
                                <div className="read_only_item">
                                    <label>Phone Number</label>
                                    <span>{editForm.mobileNumber || "--"}</span>
                                </div>
                                <div className="read_only_item full_width">
                                    <label>Residential Address</label>
                                    <span>{editForm.residentialAddress || "--"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="premium_glass_card mb-4">
                            <h3 className="section_title"><FiShield /> Legal & Tax</h3>
                            <div className="read_only_grid">
                                <div className="read_only_item">
                                    <label>Tax ID</label>
                                    <span>{editForm.taxId || "--"}</span>
                                </div>
                                <div className="read_only_item">
                                    <label>Tax Country</label>
                                    <span>{editForm.taxCountry || "--"}</span>
                                </div>
                            </div>
                        </div>

                    </motion.div>
                )}
            </div>
        </motion.div>
    );
}