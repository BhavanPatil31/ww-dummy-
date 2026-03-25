import { useState, useEffect } from "react";
import { 
  FiUser, FiMail, FiPhone, FiMapPin, FiCamera, 
  FiTrash2, FiSave, FiEdit2, FiCheckCircle, FiAlertTriangle, 
  FiGlobe, FiTarget, FiInfo, FiX, FiShield, FiClock
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
                residentialAddress: profile.residentialAddress || ""
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
                        userId: uid,
                        name: finalName,
                        email: editForm.email,
                        phone: editForm.mobileNumber,
                        password: "dummy_pass_123"
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
                        gender: editForm.gender,
                        taxId: editForm.taxId,
                        taxCountry: editForm.taxCountry,
                        residentialAddress: editForm.residentialAddress
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="profile_v3_wrapper">
            <AnimatePresence>
                {message.text && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`toast_v2 ${message.type}`}>
                        {message.type === 'success' ? <FiCheckCircle /> : <FiAlertTriangle />}
                        <span>{message.text}</span>
                    </motion.div>
                )}
            </AnimatePresence>



            {/* Identity Hero */}
            <div className="profile_v3_hero">
                <div className="v3_hero_avatar_box">
                    <label className="v3_avatar_ring" title="Click to upload">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" />
                        ) : (
                            <div className="v3_initials">{getInitials()}</div>
                        )}
                        <input type="file" hidden accept="image/*" onChange={handleAvatarUpload} />
                    </label>
                    {avatarUrl && (
                        <button className="v3_avatar_delete" onClick={handleAvatarDelete}><FiTrash2 /></button>
                    )}
                </div>
                <div className="v3_hero_info">
                    <h1 className="v3_display_name">{profile?.name || user?.name || "Investor Profile"}</h1>
                    <p className="v3_badge_subtitle">Active WealthWise Investor</p>
                </div>

                {!isEditing && (
                    <button className="v3_action_edit" onClick={() => setIsEditing(true)}>
                        <FiEdit2 /> Edit Profile
                    </button>
                )}
            </div>

            {/* Main Content: Info Cards or Edit Form */}
            <div className="profile_v3_content">
                {isEditing ? (
                    <div className="v3_edit_form_container">
                        <div className="v3_form_grid">
                            <div className="v3_input_card">
                                <label>FIRST NAME</label>
                                <input type="text" value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName: e.target.value})} />
                            </div>
                            <div className="v3_input_card">
                                <label>LAST NAME</label>
                                <input type="text" value={editForm.lastName} onChange={e => setEditForm({...editForm, lastName: e.target.value})} />
                            </div>
                            <div className="v3_input_card">
                                <label>EMAIL ADDRESS</label>
                                <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                            </div>
                            <div className="v3_input_card">
                                <label>PHONE NUMBER</label>
                                <input type="text" value={editForm.mobileNumber} onChange={e => setEditForm({...editForm, mobileNumber: e.target.value})} />
                            </div>
                            <div className="v3_input_card full">
                                <label>GENDER</label>
                                <div className="v3_gender_selection">
                                    {['Male', 'Female', 'Other'].map(g => (
                                        <button 
                                            key={g} 
                                            className={editForm.gender === g ? "active" : ""} 
                                            onClick={() => setEditForm({...editForm, gender: g})}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="v3_input_card full">
                                <label>RESIDENTIAL ADDRESS</label>
                                <textarea rows="3" value={editForm.residentialAddress} onChange={e => setEditForm({...editForm, residentialAddress: e.target.value})} />
                            </div>
                        </div>
                        <div className="v3_form_actions">
                            <button className="btn_discard" onClick={() => setIsEditing(false)}>Cancel</button>
                            <button className="btn_save" onClick={saveChanges} disabled={loading}>{loading ? "Saving..." : "Apply Changes"}</button>
                        </div>
                    </div>
                ) : (
                    <div className="v3_info_grid">
                        <div className="v3_info_card">
                            <label><FiMail /> EMAIL ADDRESS</label>
                            <span className="v3_value">{editForm.email}</span>
                        </div>
                        <div className="v3_info_card">
                            <label><FiPhone /> PHONE NUMBER</label>
                            <span className="v3_value">{editForm.mobileNumber || "--"}</span>
                        </div>
                        <div className="v3_info_card">
                            <label><FiTarget /> ACCOUNT STATUS</label>
                            <span className="v3_value status_active">Active</span>
                        </div>
                        <div className="v3_info_card">
                            <label><FiClock /> ACTIVE SINCE</label>
                            <span className="v3_value">18 March 2026</span>
                        </div>
                        <div className="v3_info_card full">
                            <label><FiMapPin /> PRIMARY RESIDENCE</label>
                            <span className="v3_value">{editForm.residentialAddress || "Not Provided"}</span>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}