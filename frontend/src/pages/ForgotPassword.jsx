import { useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

import "./Auth.css";

function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [sent, setSent] = useState(false);

    const getFriendlyError = (error) => {
        if (!error) return "";

        const code = error?.code || "";
        const message = error?.message || "";

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

        // Invalid email
        if (
            message.toLowerCase().includes("invalid") &&
            message.toLowerCase().includes("email")
        ) {
            return "Please enter a valid email address.";
        }

        // Default fallback
        return message || "An unexpected error occurred. Please try again.";
    };

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleReset = async (e) => {
        e.preventDefault();
        setError("");

        if (!email) {
            setError("Please enter your email address.");
            return;
        }

        if (!validateEmail(email)) {
            setError("Please enter a valid email address.");
            return;
        }

        setLoading(true);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: "http://localhost:5173/reset-password",
        });

        setLoading(false);

        if (error) {
            console.error("[FORGOT PASSWORD ERROR]", error);
            setError(getFriendlyError(error));
            return;
        }

        setSent(true);
    };

    // If email was sent, show success message
    if (sent) {
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
                        <div className="auth-card">
                            <h2>Check Your Email</h2>

                            <p className="auth-subtitle">
                                If an account exists with that email, we've sent a password reset link.
                            </p>

                            <motion.div
                              className="auth-success"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                                If an account exists with that email, we've sent a password reset link.
                            </motion.div>

                            <button
                                className="auth-button"
                                onClick={() => {
                                    setSent(false);
                                    setEmail("");
                                }}
                            >
                                Send Another Link
                            </button>

                            <p className="auth-footer">
                                Remember your password?{" "}
                                <Link to="/login">
                                    Sign In
                                </Link>
                            </p>
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
                        <h2>Reset Password</h2>

                        <p className="auth-subtitle">
                            Enter your email and we'll send you a reset link.
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

                        <label>Email</label>

                        <input
                            className="auth-input"
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) =>
                                setEmail(e.target.value)
                            }
                        />

                        <button
                            className="auth-button"
                            type="submit"
                            disabled={loading}
                        >
                            {loading
                                ? "Sending Link..."
                                : "Send Reset Link"}
                        </button>

                        <p className="auth-footer">
                            Remember your password?{" "}
                            <Link to="/login">
                                Sign In
                            </Link>
                        </p>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}

export default ForgotPassword;

