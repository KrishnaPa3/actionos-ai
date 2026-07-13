import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import VoiceRecorder from "./VoiceRecorder";
import ResultsPage from "./pages/ResultsPage";
import Dashboard from "./pages/Dashboard";
import SessionsPage from "./pages/SessionsPage";
import TaskList from "./pages/TaskList";

function App() {
    return (
        <BrowserRouter>
            <Navbar />

            <Routes>

                {/* Dashboard (Landing Page) */}
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />

                {/* Record Page */}
                <Route path="/record" element={<VoiceRecorder />} />

                {/* Results */}
                <Route path="/results" element={<ResultsPage />} />
                <Route
                    path="/results/:sessionId"
                    element={<ResultsPage />}
                />

                {/* Tasks */}
                <Route path="/tasks" element={<TaskList />} />

                {/* Meetings */}
                <Route path="/sessions" element={<SessionsPage />} />

            </Routes>
        </BrowserRouter>
    );
}

export default App;