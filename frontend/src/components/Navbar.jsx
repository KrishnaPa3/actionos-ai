import { useNavigate, useLocation } from "react-router-dom";

import Button from "./ui/Button";

import {
  Target,
  House,
  LayoutDashboard,
  History,
  FileText,
  ListChecks,
} from "./ui/icons";

import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const openResults = () => {
    navigate("/results");
  };

  return (
    <nav className="navbar">
      {/* Logo */}
      <div
        className="nav-logo"
        onClick={() => navigate("/")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <Target size={28} />

        <span
          style={{
            fontSize: "22px",
            fontWeight: "700",
            letterSpacing: "0.5px",
          }}
        >
          ActionOS
        </span>
      </div>

      {/* Navigation */}
      <div
        className="nav-links"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <Button
          size="sm"
          variant={location.pathname === "/" ? "primary" : "ghost"}
          icon={<House size={18} />}
          onClick={() => navigate("/")}
        >
          Home
        </Button>

        <Button
          size="sm"
          variant={
            location.pathname.startsWith("/results")
              ? "primary"
              : "ghost"
          }
          icon={<FileText size={18} />}
          onClick={openResults}
        >
          Results
        </Button>

        <Button
          size="sm"
          variant={
            location.pathname === "/dashboard"
              ? "primary"
              : "ghost"
          }
          icon={<LayoutDashboard size={18} />}
          onClick={() => navigate("/dashboard")}
        >
          Dashboard
        </Button>

        <Button
          size="sm"
          variant={
            location.pathname === "/tasks"
              ? "primary"
              : "ghost"
          }
          icon={<ListChecks size={18} />}
          onClick={() => navigate("/tasks")}
        >
          Task List
        </Button>

        <Button
          size="sm"
          variant={
            location.pathname === "/sessions"
              ? "primary"
              : "ghost"
          }
          icon={<History size={18} />}
          onClick={() => navigate("/sessions")}
        >
          Sessions
        </Button>
      </div>
    </nav>
  );
}