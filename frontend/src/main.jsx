import { Component, StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./App.jsx";

import { AuthProvider } from "./auth/AuthContext";

class AppErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, message: "" };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, message: error.message || "Unexpected error." };
    }

    componentDidCatch(error) {
        console.error("Application error:", error);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: "24px", color: "#fff", background: "#0B1120", minHeight: "100vh" }}>
                    <h2>Something went wrong</h2>
                    <p>{this.state.message}</p>
                </div>
            );
        }

        return this.props.children;
    }
}

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <AppErrorBoundary>
            <AuthProvider>
                <App />
            </AuthProvider>
        </AppErrorBoundary>
    </StrictMode>
);