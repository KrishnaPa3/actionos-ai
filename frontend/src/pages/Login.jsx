import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";

import "./Auth.css";

function Login() {
    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(location.state?.message || "");

    // Check URL params for verification success
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get("verified") === "true") {
            setSuccess("Email verified successfully. You can now sign in.");
            // Clean up the URL
            window.history.replaceState({}, document.title, "/login");
        }
    }, [location.search]);

    const getFriendlyError = (error) => {
        if (!error) return "";

        const code = error?.code || "";
        const message = error?.message || "";

        // Email not confirmed
        if (
            message.toLowerCase().includes("email not confirmed") ||
            message.toLowerCase().includes("email_not_confirmed")
        ) {
            return "Please verify your email before signing in. Check your inbox or spam folder.";
        }

        // Invalid credentials
        if (
            message.toLowerCase().includes("invalid login credentials") ||
            message.toLowerCase().includes("invalid credentials") ||
            message.toLowerCase().includes("invalid email or password") ||
            code === "invalid_credentials"
        ) {
            return "Invalid email or password. Please try again.";
        }

        // User already exists (for context, though this is from signup)
        if (
            message.toLowerCase().includes("user already registered") ||
            code === "user_already_exists"
        ) {
            return "An account with this email already exists. Please sign in.";
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

        // Default fallback
        return message || "An unexpected error occurred. Please try again.";
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");

        if (!email || !password) {
            setError("Please enter your email and password.");
            return;
        }

        setLoading(true);

        const { data, error } =
            await supabase.auth.signInWithPassword({
                email,
                password,
            });

        setLoading(false);

        if (error) {
            console.error("[LOGIN ERROR]", error);
            setError(getFriendlyError(error));
            return;
        }

        console.log("[LOGIN SUCCESS]", data);

        navigate("/");
    };

    const handleResendVerification = async () => {
        if (!email) {
            setError("Please enter your email address first.");
            return;
        }

        setResending(true);
        setError("");

        const { error } = await supabase.auth.resend({
            type: "signup",
            email,
            options: {
                emailRedirectTo: `${import.meta.env.VITE_SITE_URL || window.location.origin}/auth/callback`,
            },
        });

        setResending(false);

        if (error) {
            console.error("[RESEND ERROR]", error);
            setError(getFriendlyError(error));
            return;
        }

        setSuccess("Verification email sent. Please check your inbox.");
    };

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
                        onSubmit={handleLogin}
                    >

                        <h2>Welcome Back</h2>

                        <p className="auth-subtitle">
                            Sign in to continue to ActionOS.
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

                        <label>Password</label>

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
                                placeholder="Password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.target.value)
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

                        <div className="auth-options">
                            <Link
                                to="/forgot-password"
                                className="forgot-link"
                            >
                                Forgot Password?
                            </Link>
                        </div>

                        <button
                            className="auth-button"
                            type="submit"
                            disabled={loading}
                        >
                            {loading
                                ? "Signing In..."
                                : "Sign In"}
                        </button>

                        <div className="auth-resend">
                            <span className="auth-resend-text">
                                Didn't receive the verification email?
                            </span>
                            <button
                                type="button"
                                className="auth-resend-button"
                                onClick={handleResendVerification}
                                disabled={resending}
                            >
                                {resending
                                    ? "Sending..."
                                    : "Resend Verification Email"}
                            </button>
                        </div>

                        <p className="auth-footer">
                            Don't have an account?{" "}
                            <Link to="/signup">
                                Create Account
                            </Link>
                        </p>

                    </form>

                </motion.div>

            </div>
        </div>
    );
}

export default Login;
