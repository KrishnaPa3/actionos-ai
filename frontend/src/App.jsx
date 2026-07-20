import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";

import { useAuth } from "./auth/AuthProvider";

import AppLayout from "./layouts/AppLayout";

import Login from "./pages/Login";
import Signup from "./pages/Signup";

import Dashboard from "./pages/Dashboard";
import VoiceRecorder from "./VoiceRecorder";
import ResultsPage from "./pages/ResultsPage";
import SessionsPage from "./pages/SessionsPage";
import TaskList from "./pages/TaskList";
import Integrations from "./pages/Integrations";

function App() {
    const { user, loading } = useAuth();

    useEffect(() => {
        console.log("Current User:", user);
    }, [user]);

    if (loading) {
        return <h1>Loading...</h1>;
    }

    return (
        <BrowserRouter>
            <Routes>

                {/* Public Routes */}

                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                {/* Protected Application */}

                <Route element={<AppLayout />}>

                    {/* Dashboard */}

                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />

                    {/* Record */}

                    <Route path="/record" element={<VoiceRecorder />} />

                    {/* Results */}

                    <Route path="/results" element={<ResultsPage />} />
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

                </Route>

            </Routes>
        </BrowserRouter>
    );
}

export default App;