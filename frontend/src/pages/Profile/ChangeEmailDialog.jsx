import { useState } from "react";
import { motion } from "motion/react";
import { X, Mail, LoaderCircle } from "../../components/ui/icons";
import "./ChangeEmailDialog.css";

export default function ChangeEmailDialog({ currentEmail, onSave, onClose }) {
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (email !== confirmEmail) {
      setError("Emails do not match");
      return;
    }

    if (email === currentEmail) {
      setError("New email is the same as current email");
      return;
    }

    setSaving(true);
    try {
      await onSave(email.trim());
    } catch (err) {
      setError(err.message || "Failed to update email");
    } finally {
      setSaving(false);
    }
  };

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
          <div className="dialog-header-icon">
            <Mail size={20} />
          </div>
          <h3 className="dialog-title">Change Email</h3>
          <button className="dialog-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p className="dialog-description">
          A confirmation email will be sent to your new address. Click the link in the email to confirm the change.
        </p>

        <form className="dialog-form" onSubmit={handleSubmit}>
          <label className="dialog-label">Current Email</label>
          <input
            className="dialog-input"
            type="email"
            value={currentEmail}
            disabled
          />

          <label className="dialog-label">New Email</label>
          <input
            className="dialog-input"
            type="email"
            placeholder="Enter new email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            disabled={saving}
          />

          <label className="dialog-label">Confirm New Email</label>
          <input
            className="dialog-input"
            type="email"
            placeholder="Confirm new email address"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
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
                "Update Email"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

