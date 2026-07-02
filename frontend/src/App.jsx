import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import VoiceRecorder from "./VoiceRecorder";
import ResultsPage from "./pages/ResultsPage";
import Dashboard from "./pages/Dashboard";
import SessionsPage from "./pages/SessionsPage";
function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<VoiceRecorder />} />
        <Route path="/results/:sessionId" element={<ResultsPage />}/>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sessions" element={<SessionsPage />} />      </Routes>
    </BrowserRouter>
  );
}

export default App;