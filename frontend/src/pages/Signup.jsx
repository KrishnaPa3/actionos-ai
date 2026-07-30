import { useState } from "react";
import { motion } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";

import "./Auth.css";

function Signup() {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSignup = async (e) => {
        e.preventDefault();
        setError("");

        if (!username || !fullName || !email || !password || !confirmPassword) {
            setError("Please fill in all required fields.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
               emailRedirectTo: `${import.meta.env.VITE_SITE_URL || window.location.origin}/auth/callback`,
                data: {
                    username,
                    full_name: fullName,
                },
            },
        });

        setLoading(false);

        if (error) {
            setError(error.message);
            return;
        }

        // If email confirmation is disabled, the session will be set immediately.
        // Navigate to dashboard. Otherwise, redirect to login with a success message.
        if (data.session) {
            navigate("/");
        } else {
            navigate("/login", {
                state: {
                    message: "We've sent a verification email to your inbox. Please verify your email before signing in.",
                },
            });
        }
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
                        onSubmit={handleSignup}
                    >
                        <h2>Create Account</h2>

                        <p className="auth-subtitle">
                            Start organizing your meetings with AI.
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

                        <label>Username *</label>

                        <input
                            className="auth-input"
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) =>
                                setUsername(e.target.value)
                            }
                        />

                        <label>Full Name *</label>

                        <input
                            className="auth-input"
                            type="text"
                            placeholder="Full Name"
                            value={fullName}
                            onChange={(e) =>
                                setFullName(e.target.value)
                            }
                        />

                        <label>Email *</label>

                        <input
                            className="auth-input"
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) =>
                                setEmail(e.target.value)
                            }
                        />

                        <label>Password *</label>

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

                        <label>Confirm Password *</label>

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
                                    setConfirmPassword(
                                        e.target.value
                                    )
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
                            disabled={loading}
                        >
                            {loading
                                ? "Creating Account..."
                                : "Create Account"}
                        </button>

                        <p className="auth-footer">
                            Already have an account?{" "}
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

export default Signup;

