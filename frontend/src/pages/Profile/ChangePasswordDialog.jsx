import { useState } from "react";
import { motion } from "motion/react";
import { supabase } from "../../lib/supabase";
import {
  X,
  Lock,
  LoaderCircle,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
} from "../../components/ui/icons";
import "./ChangePasswordDialog.css";

function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

function getStrengthLabel(score) {
  if (score <= 1) return { label: "Weak", color: "#EF4444" };
  if (score <= 2) return { label: "Fair", color: "#F59E0B" };
  if (score <= 3) return { label: "Good", color: "#3B82F6" };
  if (score <= 4) return { label: "Strong", color: "#22C55E" };
  return { label: "Very Strong", color: "#22C55E" };
}

export default function ChangePasswordDialog({ currentEmail, onSave, onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const strength = getPasswordStrength(newPassword);
  const strengthInfo = getStrengthLabel(strength);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate current password
    if (!currentPassword) {
      setError("Current password is required");
      return;
    }

    // Validate new password
    if (!newPassword) {
      setError("New password is required");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    // Validate confirm password
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSaving(true);
    try {
      // Step 1: Reauthenticate with current password
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: currentPassword,
      });

      if (reauthError) {
        setError("Current password is incorrect.");
        return;
      }

      // Step 2: Update password directly via Supabase Auth (no backend call needed)
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message || "Failed to update password");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onClose();
      onSave(newPassword);
    } catch (err) {
      setError(err.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  const StrengthIcon = strength >= 3 ? ShieldCheck : ShieldAlert;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <motion.div
        className="dialog-content"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-header">
          <div className="dialog-header-icon" style={{ background: "rgba(239, 68, 68, 0.12)", color: "#EF4444" }}>
            <Lock size={20} />
          </div>
          <h3 className="dialog-title">Change Password</h3>
          <button className="dialog-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p className="dialog-description">
          Verify your identity first, then choose a strong new password.
        </p>

        <form className="dialog-form" onSubmit={handleSubmit}>
          {/* Current Password */}
          <label className="dialog-label">Current Password</label>
          <div className="dialog-input-wrapper">
            <input
              className="dialog-input"
              type={showCurrentPassword ? "text" : "password"}
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoFocus
              disabled={saving}
            />
            <button
              type="button"
              className="dialog-input-toggle"
              onClick={() => setShowCurrentPassword((prev) => !prev)}
              tabIndex={-1}
            >
              {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* New Password */}
          <label className="dialog-label">New Password</label>
          <div className="dialog-input-wrapper">
            <input
              className="dialog-input"
              type={showNewPassword ? "text" : "password"}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={saving}
            />
            <button
              type="button"
              className="dialog-input-toggle"
              onClick={() => setShowNewPassword((prev) => !prev)}
              tabIndex={-1}
            >
              {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {newPassword && (
            <div className="password-strength">
              <div
                className="password-strength-bar"
                style={{
                  width: `${(strength / 6) * 100}%`,
                  background: strengthInfo.color,
                }}
              />
              <span
                className="password-strength-label"
                style={{ color: strengthInfo.color }}
              >
                Password Strength: {strengthInfo.label}
              </span>
            </div>
          )}

          {/* Confirm New Password */}
          <label className="dialog-label">Confirm New Password</label>
          <div className="dialog-input-wrapper">
            <input
              className="dialog-input"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={saving}
            />
            <button
              type="button"
              className="dialog-input-toggle"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <p className="dialog-error">{error}</p>}

          <div className="dialog-actions">
            <button
              type="button"
              className="dialog-btn dialog-btn-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="dialog-btn dialog-btn-primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <LoaderCircle size={16} className="spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
