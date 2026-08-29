import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Loading from "../components/ui/Loading";

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <Loading label="Checking you in" />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default ProtectedRoute;
