import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";

import "./Auth.css";

function ResetPassword() {
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [sessionError, setSessionError] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Process the recovery session from the email link
    useEffect(() => {
        const handleRecoverySession = async () => {
            // Parse the URL hash for access_token (Supabase sends tokens in the hash)
            const hashParams = new URLSearchParams(
                window.location.hash.substring(1)
            );
            const accessToken = hashParams.get("access_token");
            const refreshToken = hashParams.get("refresh_token");
            const type = hashParams.get("type");

            // If we have tokens in the hash, set the session manually
            if (accessToken && refreshToken && type === "recovery") {
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });

                if (error) {
                    console.error("[SET SESSION ERROR]", error);
                    setSessionError(
                        "Invalid or expired reset link. Please request a new one."
                    );
                    return;
                }

                // Clean up the URL
                window.history.replaceState(
                    {},
                    document.title,
                    "/reset-password"
                );

                setSessionReady(true);
                return;
            }

            // If no hash tokens, try getting existing session
            const { data, error } = await supabase.auth.getSession();

            if (error) {
                console.error("[GET SESSION ERROR]", error);
                setSessionError(
                    "Unable to verify your session. Please request a new reset link."
                );
                return;
            }

            // Check if the session is a recovery session
            if (data?.session) {
                setSessionReady(true);
            } else {
                setSessionError(
                    "No active reset session found. Please request a new password reset link."
                );
            }
        };

        handleRecoverySession();
    }, []);

    const getFriendlyError = (error) => {
        if (!error) return "";

        const code = error?.code || "";
        const message = error?.message || "";

        // Same password
        if (
            message.toLowerCase().includes("same password") ||
            message.toLowerCase().includes("new password should be different")
        ) {
            return "Your new password must be different from your current password.";
        }

        // Weak password
        if (
            message.toLowerCase().includes("weak") ||
            message.toLowerCase().includes("not strong enough") ||
            code === "weak_password"
        ) {
            return "Password is too weak. Please use at least 8 characters with a mix of letters, numbers, and symbols.";
        }

        // Rate limiting
        if (
            message.toLowerCase().includes("rate limit") ||
            message.toLowerCase().includes("too many requests") ||
            code === "over_request_rate_limit"
        ) {
            return "Too many attempts. Please wait a moment before trying again.";
        }

        // Network error
        if (
            message.toLowerCase().includes("network") ||
            message.toLowerCase().includes("fetch") ||
            message.toLowerCase().includes("failed to fetch")
        ) {
            return "Unable to connect. Please check your internet connection and try again.";
        }

        // Session expired
        if (
            message.toLowerCase().includes("session") ||
            message.toLowerCase().includes("expired") ||
            message.toLowerCase().includes("not authenticated")
        ) {
            return "Your session has expired. Please request a new password reset link.";
        }

        // Default fallback
        return message || "An unexpected error occurred. Please try again.";
    };

    const handleReset = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!newPassword || !confirmPassword) {
            setError("Please fill in all fields.");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        setLoading(false);

        if (error) {
            console.error("[RESET PASSWORD ERROR]", error);
            setError(getFriendlyError(error));
            return;
        }

        setSuccess("Password updated successfully! Redirecting to login...");

        // Redirect to login after 2 seconds
        setTimeout(() => {
            navigate("/login", {
                state: {
                    message: "Password reset successful. You can now sign in with your new password.",
                },
            });
        }, 2000);
    };

    // Show session error if the recovery link is invalid
    if (sessionError) {
        return (
            <div className="auth-page">
                <div className="auth-container">
                    <motion.div
                      className="auth-left"
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    >
                        <div
                            style={{
                                width: "100%",
                                textAlign: "center",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <h1
                                style={{
                                    fontSize: "72px",
                                    marginBottom: "20px",
                                }}
                            >
                                ActionOS
                            </h1>

                            <p
                                style={{
                                    maxWidth: "420px",
                                    lineHeight: 1.7,
                                    opacity: 0.8,
                                    fontSize: "18px",
                                }}
                            >
                                AI-powered meeting intelligence that turns
                                conversations into actions.
                            </p>
                        </div>
                    </motion.div>

                    <motion.div
                      className="auth-right"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                    >
                        <div className="auth-card">
                            <h2>Invalid Link</h2>

                            <p className="auth-subtitle">
                                This password reset link is invalid or has expired.
                            </p>

                            <motion.div
                              className="auth-error"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                                {sessionError}
                            </motion.div>

                            <button
                                className="auth-button"
                                onClick={() => navigate("/forgot-password")}
                            >
                                Request New Reset Link
                            </button>

                            <p className="auth-footer">
                                <Link to="/login">
                                    Back to Sign In
                                </Link>
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    }

    // Show loading state while session is being verified
    if (!sessionReady) {
        return (
            <div className="auth-page">
                <div className="auth-container">
                    <motion.div
                      className="auth-left"
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    >
                        <div
                            style={{
                                width: "100%",
                                textAlign: "center",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <h1
                                style={{
                                    fontSize: "72px",
                                    marginBottom: "20px",
                                }}
                            >
                                ActionOS
                            </h1>

                            <p
                                style={{
                                    maxWidth: "420px",
                                    lineHeight: 1.7,
                                    opacity: 0.8,
                                    fontSize: "18px",
                                }}
                            >
                                AI-powered meeting intelligence that turns
                                conversations into actions.
                            </p>
                        </div>
                    </motion.div>

                    <motion.div
                      className="auth-right"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                    >
                        <div className="auth-card">
                            <h2>Verifying...</h2>

                            <p className="auth-subtitle">
                                Verifying your reset link...
                            </p>

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "center",
                                    padding: "40px 0",
                                }}
                            >
                                <motion.div
                                    animate={{
                                        scale: [1, 1.1, 1],
                                        opacity: [0.7, 1, 0.7],
                                    }}
                                    transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                    }}
                                    style={{
                                        width: 40,
                                        height: 40,
                                        border: "3px solid rgba(79,140,255,0.2)",
                                        borderTopColor: "#4F8CFF",
                                        borderRadius: "50%",
                                    }}
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                {/* Left */}
                <motion.div
                  className="auth-left"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                    <div
                        style={{
                            width: "100%",
                            textAlign: "center",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <h1
                            style={{
                                fontSize: "72px",
                                marginBottom: "20px",
                            }}
                        >
                            ActionOS
                        </h1>

                        <p
                            style={{
                                maxWidth: "420px",
                                lineHeight: 1.7,
                                opacity: 0.8,
                                fontSize: "18px",
                            }}
                        >
                            AI-powered meeting intelligence that turns
                            conversations into actions.
                        </p>
                    </div>
                </motion.div>

                {/* Right */}
                <motion.div
                  className="auth-right"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                >
                    <form
                        className="auth-card"
                        onSubmit={handleReset}
                    >
                        <h2>Set New Password</h2>

                        <p className="auth-subtitle">
                            Enter your new password below.
                        </p>

                        {error && (
                            <motion.div
                              className="auth-error"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                                {error}
                            </motion.div>
                        )}

                        {success && (
                            <motion.div
                              className="auth-success"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                                {success}
                            </motion.div>
                        )}

                        <label>New Password</label>

                        <div
                            style={{
                                position: "relative",
                            }}
                        >
                            <input
                                className="auth-input"
                                style={{
                                    paddingRight: "55px",
                                }}
                                type={
                                    showPassword
                                        ? "text"
                                        : "password"
                                }
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) =>
                                    setNewPassword(e.target.value)
                                }
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    setShowPassword(
                                        !showPassword
                                    )
                                }
                                style={{
                                    position: "absolute",
                                    right: "16px",
                                    top: "50%",
                                    transform:
                                        "translateY(-50%)",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "#AAB4C8",
                                }}
                            >
                                {showPassword ? (
                                    <EyeOff size={20} />
                                ) : (
                                    <Eye size={20} />
                                )}
                            </button>
                        </div>

                        <label>Confirm Password</label>

                        <div
                            style={{
                                position: "relative",
                            }}
                        >
                            <input
                                className="auth-input"
                                style={{
                                    paddingRight: "55px",
                                }}
                                type={
                                    showConfirmPassword
                                        ? "text"
                                        : "password"
                                }
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(e.target.value)
                                }
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    setShowConfirmPassword(
                                        !showConfirmPassword
                                    )
                                }
                                style={{
                                    position: "absolute",
                                    right: "16px",
                                    top: "50%",
                                    transform:
                                        "translateY(-50%)",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "#AAB4C8",
                                }}
                            >
                                {showConfirmPassword ? (
                                    <EyeOff size={20} />
                                ) : (
                                    <Eye size={20} />
                                )}
                            </button>
                        </div>

                        <button
                            className="auth-button"
                            type="submit"
                            disabled={loading || !!success}
                        >
                            {loading
                                ? "Updating Password..."
                                : "Update Password"}
                        </button>

                        <p className="auth-footer">
                            <Link to="/login">
                                Back to Sign In
                            </Link>
                        </p>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}

export default ResetPassword;

