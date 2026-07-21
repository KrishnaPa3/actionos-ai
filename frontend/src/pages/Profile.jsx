import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthContext";

import "./Profile.css";

function Profile() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [username, setUsername] = useState(
        user?.user_metadata?.username || ""
    );

    const [email, setEmail] = useState(user?.email || "");

    const [editingUsername, setEditingUsername] = useState(false);
    const [editingEmail, setEditingEmail] = useState(false);

    const [loading, setLoading] = useState(false);

    const handleUsernameSave = async () => {
        setLoading(true);

        const { error } = await supabase.auth.updateUser({
            data: {
                username,
            },
        });

        setLoading(false);

        if (error) {
            alert(error.message);
            return;
        }

        setEditingUsername(false);
    };

    const handleEmailSave = async () => {
        setLoading(true);

        const { error } = await supabase.auth.updateUser({
            email,
        });

        setLoading(false);

        if (error) {
            alert(error.message);
            return;
        }

        alert(
            "Verification email sent. Please verify your new email."
        );

        setEditingEmail(false);
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate("/login");
    };

    return (
        <div className="profile-page">

            <div className="profile-card">

                <h1>Profile</h1>

                {/* Username */}

                <div className="profile-section">

                    <label>Username</label>

                    {editingUsername ? (
                        <>
                            <input
                                className="profile-input"
                                value={username}
                                onChange={(e) =>
                                    setUsername(e.target.value)
                                }
                            />

                            <div className="profile-actions">

                                <button
                                    onClick={handleUsernameSave}
                                    disabled={loading}
                                >
                                    Save
                                </button>

                                <button
                                    className="secondary"
                                    onClick={() =>
                                        setEditingUsername(false)
                                    }
                                >
                                    Cancel
                                </button>

                            </div>
                        </>
                    ) : (
                        <div className="profile-row">

                            <span>{username}</span>

                            <button
                                onClick={() =>
                                    setEditingUsername(true)
                                }
                            >
                                Edit
                            </button>

                        </div>
                    )}

                </div>

                {/* Email */}

                <div className="profile-section">

                    <label>Email</label>

                    {editingEmail ? (
                        <>
                            <input
                                className="profile-input"
                                value={email}
                                onChange={(e) =>
                                    setEmail(e.target.value)
                                }
                            />

                            <div className="profile-actions">

                                <button
                                    onClick={handleEmailSave}
                                    disabled={loading}
                                >
                                    Save
                                </button>

                                <button
                                    className="secondary"
                                    onClick={() =>
                                        setEditingEmail(false)
                                    }
                                >
                                    Cancel
                                </button>

                            </div>
                        </>
                    ) : (
                        <div className="profile-row">

                            <span>{email}</span>

                            <button
                                onClick={() =>
                                    setEditingEmail(true)
                                }
                            >
                                Edit
                            </button>

                        </div>
                    )}

                </div>

                {/* Password */}

                <div className="profile-section">

                    <label>Password</label>

                    <div className="profile-row">

                        <span>••••••••••••••</span>

                        <button>
                            Change Password
                        </button>

                    </div>

                </div>

                <hr />

                <button
                    className="signout-button"
                    onClick={handleSignOut}
                >
                    Sign Out
                </button>

            </div>

        </div>
    );
}

export default Profile;