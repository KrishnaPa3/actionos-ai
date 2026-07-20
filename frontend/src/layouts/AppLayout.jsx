import { Outlet } from "react-router-dom";

import Navbar from "../components/Navbar";
import ProtectedRoute from "../auth/ProtectedRoute";

function AppLayout() {
    return (
        <ProtectedRoute>
            <Navbar />
            <main>
                <Outlet />
            </main>
        </ProtectedRoute>
    );
}

export default AppLayout;