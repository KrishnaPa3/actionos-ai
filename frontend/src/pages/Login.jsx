import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";

import "./Auth.css";

function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");

        if (!email || !password) {
            setError("Please enter your email and password.");
            return;
        }

        setLoading(true);

        const { error } =
            await supabase.auth.signInWithPassword({
                email,
                password,
            });

        setLoading(false);

        if (error) {
            setError(error.message);
            return;
        }

        navigate("/");
    };

    const handleGoogleLogin = async () => {
        const { error } =
            await supabase.auth.signInWithOAuth({
                provider: "google",
            });

        if (error) {
            setError(error.message);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">

                {/* Left */}

                <div className="auth-left">

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

                </div>

                {/* Right */}

                <div className="auth-right">

                    <form
                        className="auth-card"
                        onSubmit={handleLogin}
                    >

                        <h2>Welcome Back</h2>

                        <p className="auth-subtitle">
                            Sign in to continue to ActionOS.
                        </p>

                        {error && (
                            <div className="auth-error">
                                {error}
                            </div>
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

                        <div className="auth-divider">
                            OR
                        </div>

                        <button
                            type="button"
                            className="google-button"
                            onClick={handleGoogleLogin}
                        >
                            Continue with Google
                        </button>

                        <p className="auth-footer">
                            Don't have an account?{" "}
                            <Link to="/signup">
                                Create Account
                            </Link>
                        </p>

                    </form>

                </div>

            </div>
        </div>
    );
}

export default Login;