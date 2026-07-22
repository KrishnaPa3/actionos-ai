import { useState } from "react";
import { motion } from "motion/react";
import { X, Lock, LoaderCircle, ShieldCheck, ShieldAlert } from "../../components/ui/icons";
import "./ChangePasswordDialog.css";

function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
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

export default function ChangePasswordDialog({ onSave, onClose }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const strength = getPasswordStrength(password);
  const strengthInfo = getStrengthLabel(strength);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!password) {
      setError("Password is required");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSaving(true);
    try {
      await onSave(password);
      setPassword("");
      setConfirmPassword("");
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
          Choose a strong password to keep your account secure.
        </p>

        <form className="dialog-form" onSubmit={handleSubmit}>
          <label className="dialog-label">New Password</label>
          <input
            className="dialog-input"
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            disabled={saving}
          />

          {password && (
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

          <label className="dialog-label">Confirm New Password</label>
          <input
            className="dialog-input"
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={saving}
          />

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
