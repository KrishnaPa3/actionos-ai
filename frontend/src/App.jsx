import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import AuthCallback from "./pages/AuthCallback";
import { useAuth } from "./auth/AuthContext";
import Loading from "./components/ui/Loading";

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



function App() {
    const { user, loading } = useAuth();

    useEffect(() => {
        console.log("Current User:", user);
    }, [user]);

    if (loading) {
        return <Loading label="Starting ActionOS" />;
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
