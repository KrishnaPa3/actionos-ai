import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function AuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        const handleCallback = async () => {
            // Process the auth callback from Supabase (signup verification only).
            const { error } = await supabase.auth.getSession();

            if (error) {
                console.error("Auth callback error:", error);
                navigate("/login", { replace: true });
                return;
            }

            // Clear the temporary session created by email verification
            await supabase.auth.signOut();

            navigate("/login?verified=true", { replace: true });
        };

        handleCallback();
    }, [navigate]);

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
                fontSize: "18px",
            }}
        >
            Verifying your email…
        </div>
    );
}

export default AuthCallback;
