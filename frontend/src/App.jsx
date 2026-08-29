import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "motion/react";
import AuthCallback from "./pages/AuthCallback";
import { useAuth } from "./auth/AuthContext";

import AppLayout from "./layouts/AppLayout";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import Dashboard from "./pages/Dashboard";
import VoiceRecorder from "./VoiceRecorder";
import ResultsPage from "./pages/ResultsPage";
import SessionsPage from "./pages/SessionsPage";
import TaskList from "./pages/TaskList";
import Integrations from "./pages/Integrations";
import Profile from "./pages/Profile";

import ProtectedRoute from "./auth/ProtectedRoute";


function LoadingScreen() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#0B1120",
        gap: "24px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "7px", height: "58px" }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.span
            key={i}
            animate={{ scaleY: [0.28, 1, 0.28] }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.12,
            }}
            style={{
              display: "block",
              width: "6px",
              height: "58px",
              borderRadius: "999px",
              background: "linear-gradient(180deg, #7FB0FF, #3B82F6)",
              transformOrigin: "center",
            }}
          />
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        style={{
          color: "#9CA3AF",
          fontFamily: "var(--body)",
          fontSize: "15px",
          letterSpacing: "2px",
        }}
      >
        LOADING
      </motion.p>
    </div>
  );
}

function App() {
    const { user, loading } = useAuth();

    useEffect(() => {
        console.log("Current User:", user);
    }, [user]);

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <BrowserRouter>
            <Routes>

                {/* Public Routes */}

                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route
                    path="/auth/callback"
                    element={<AuthCallback />}
                />
                <Route
                    path="/forgot-password"
                    element={<ForgotPassword />}
                />
                <Route
                    path="/reset-password"
                    element={<ResetPassword />}
                />

                {/* Protected Application */}

                <Route
                    element={
                        <ProtectedRoute>
                            <AppLayout />
                        </ProtectedRoute>
                    }
                >

                    {/* Dashboard */}

                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />

                    {/* Record */}

                    <Route path="/record" element={<VoiceRecorder />} />

                    {/* Results */}

                    <Route
                        path="/results"
                        element={<ResultsPage />}
                    />
                    <Route
                        path="/results/:sessionId"
                        element={<ResultsPage />}
                    />

                    {/* Tasks */}

                    <Route
                        path="/tasks"
                        element={<TaskList />}
                    />

                    {/* Meetings */}

                    <Route
                        path="/sessions"
                        element={<SessionsPage />}
                    />

                    {/* Integrations */}

                    <Route
                        path="/integrations"
                        element={<Integrations />}
                    />

                    {/* Profile */}

                    <Route
                        path="/profile"
                        element={<Profile />}
                    />

                </Route>

            </Routes>
        </BrowserRouter>
    );
}

export default App;
