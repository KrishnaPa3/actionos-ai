import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../lib/api";
import { supabase } from "../lib/supabase";
import { COLORS } from "../components/ui/colors";

import ChangePasswordDialog from "./Profile/ChangePasswordDialog";

import {
  User,
  Mail,
  Lock,
  Copy,
  Check,
  Calendar,
  Clock,
  ShieldCheck,
  Pencil,
  X,
  Save,
  LoaderCircle,
} from "../components/ui/icons";

import "./Profile.css";

/* ─── Toast Component ─── */

function Toast({ message, type, onClose }) {
  const bgColor =
    type === "success" ? COLORS.success : type === "error" ? COLORS.danger : COLORS.warning;

  return (
    <motion.div
      className="profile-toast"
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{ borderLeft: `4px solid ${bgColor}` }}
    >
      <span>{message}</span>
      <button className="profile-toast-close" onClick={onClose}>
        <X size={16} />
      </button>
    </motion.div>
  );
}

/* ─── Inline Editor ─── */

function InlineEditor({ label, value, onSave, validate, type = "text", placeholder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (validate) {
      const err = validate(trimmed);
      if (err) {
        setError(err);
        return;
      }
    }
    setSaving(true);
    setError("");
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch (e) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
    setError("");
  };

  return (
    <div className="profile-editor">
      <label className="profile-field-label">{label}</label>

      {editing ? (
        <div className="profile-editor-edit">
          <input
            className="profile-input"
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            autoFocus
            disabled={saving}
          />
          {error && <span className="profile-field-error">{error}</span>}
          <div className="profile-editor-actions">
            <button
              className="profile-btn profile-btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <LoaderCircle size={16} className="spin" /> : <Save size={16} />}
              Save
            </button>
            <button
              className="profile-btn profile-btn-ghost"
              onClick={handleCancel}
              disabled={saving}
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="profile-editor-display">
          <span className="profile-field-value">
            {value || <span className="profile-placeholder">Not set</span>}
          </span>
          <button className="profile-btn-icon" onClick={() => setEditing(true)} title={`Edit ${label}`}>
            <Pencil size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Info Row ─── */

function InfoRow({ icon, label, value, copyable }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="profile-info-row">
      <div className="profile-info-icon">{icon}</div>
      <div className="profile-info-content">
        <span className="profile-info-label">{label}</span>
        <span className="profile-info-value">
          {value || <span className="profile-placeholder">—</span>}
        </span>
      </div>
      {copyable && value && (
        <button className="profile-btn-icon" onClick={handleCopy} title="Copy">
          {copied ? <Check size={16} color={COLORS.success} /> : <Copy size={16} />}
        </button>
      )}
    </div>
  );
}

/* ─── Card Wrapper ─── */

function ProfileCard({ title, children, delay = 0 }) {
  return (
    <motion.div
      className="profile-card-section"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay }}
    >
      {title && <h3 className="profile-card-title">{title}</h3>}
      {children}
    </motion.div>
  );
}

/* ─── Skeleton ─── */

function ProfileSkeleton() {
  return (
    <div className="profile-skeleton">
      <div className="profile-skeleton-avatar" />
      <div className="profile-skeleton-line w-60" />
      <div className="profile-skeleton-line w-40" />
      <div className="profile-skeleton-card">
        <div className="profile-skeleton-line w-full" />
        <div className="profile-skeleton-line w-3/4" />
        <div className="profile-skeleton-line w-1/2" />
      </div>
      <div className="profile-skeleton-card">
        <div className="profile-skeleton-line w-full" />
        <div className="profile-skeleton-line w-3/4" />
      </div>
    </div>
  );
}

/* ─── Main Profile Page ─── */

function Profile() {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      setError(null);
      const res = await apiFetch("/profile");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to load profile");
      }
      const data = await res.json();
      setProfile(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleUsernameSave = async (username) => {
    const res = await apiFetch("/profile", {
      method: "PATCH",
      body: JSON.stringify({ username }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to update username");
    }
    setProfile((prev) => ({ ...prev, username }));
    addToast("Username updated successfully");
  };

  const handleFullNameSave = async (full_name) => {
    const res = await apiFetch("/profile", {
      method: "PATCH",
      body: JSON.stringify({ full_name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to update full name");
    }
    setProfile((prev) => ({ ...prev, full_name }));
    addToast("Full name updated successfully");
  };

  const handlePasswordChange = async (password) => {
    // The ChangePasswordDialog already calls supabase.auth.updateUser({ password })
    // and performs reauthentication. We just need to show confirmation and close.
    addToast("Password updated successfully");
    setShowPasswordDialog(false);
  };

  const validateUsername = (val) => {
    if (!val || val.length < 1) return "Username cannot be empty";
    if (val.length > 50) return "Username must be under 50 characters";
    return null;
  };

  /* ─── Render ─── */

  if (loading) {
    return (
      <div className="profile-page">
        <ProfileSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <div className="profile-error-state">
          <p>Failed to load profile</p>
          <button className="profile-btn profile-btn-primary" onClick={fetchProfile}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const avatarLetter = (profile?.username || profile?.email || "U")[0].toUpperCase();
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  const lastLogin = profile?.last_sign_in
    ? new Date(profile.last_sign_in).toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const provider = profile?.provider
    ? profile.provider.charAt(0).toUpperCase() + profile.provider.slice(1)
    : "Email";

  return (
    <div className="profile-page">
      {/* Toasts */}
      <div className="profile-toast-container">
        <AnimatePresence>
          {toasts.map((t) => (
            <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
          ))}
        </AnimatePresence>
      </div>

      <div className="profile-container">
        {/* Header Section */}
        <motion.div
          className="profile-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="profile-avatar-img"
            />
          ) : (
            <div className="profile-avatar-placeholder">{avatarLetter}</div>
          )}

          <div className="profile-header-info">
            <h1 className="profile-name">
              {profile?.full_name || profile?.username || "User"}
            </h1>
            <p className="profile-email-display">{profile?.email}</p>
          </div>
        </motion.div>

        {/* Account Details Card */}
        <ProfileCard title="Account Details" delay={0.1}>
          <InlineEditor
            label="Username"
            value={profile?.username || ""}
            onSave={handleUsernameSave}
            validate={validateUsername}
            placeholder="Enter username"
          />

          <InlineEditor
            label="Full Name"
            value={profile?.full_name || ""}
            onSave={handleFullNameSave}
            placeholder="Enter full name"
          />

          <div className="profile-card-divider" />

          <InfoRow
            icon={<Mail size={18} />}
            label="Email"
            value={profile?.email}
          />

          <InfoRow
            icon={<Lock size={18} />}
            label="Password"
            value="••••••••••••••"
          />

          <div className="profile-card-actions">
            <button
              className="profile-btn profile-btn-secondary"
              onClick={() => setShowPasswordDialog(true)}
            >
              <Lock size={16} />
              Change Password
            </button>
          </div>
        </ProfileCard>

        {/* Security Card */}
        <ProfileCard title="Security & Info" delay={0.2}>
          <InfoRow
            icon={<ShieldCheck size={18} />}
            label="Authentication Provider"
            value={provider}
          />

          <InfoRow
            icon={<Calendar size={18} />}
            label="Member Since"
            value={memberSince}
          />

          <InfoRow
            icon={<Clock size={18} />}
            label="Last Sign In"
            value={lastLogin}
          />

          <div className="profile-card-divider" />

          <InfoRow
            icon={<User size={18} />}
            label="User ID"
            value={profile?.id}
            copyable
          />
        </ProfileCard>
      </div>

      {/* Dialogs */}
      {showPasswordDialog && (
        <ChangePasswordDialog
          currentEmail={profile?.email || ""}
          onSave={handlePasswordChange}
          onClose={() => setShowPasswordDialog(false)}
        />
      )}
    </div>
  );
}

export default Profile;

