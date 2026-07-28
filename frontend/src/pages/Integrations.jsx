import { useEffect, useState, useCallback } from "react";
import "./Integrations.css";
import notionLogo from "../assets/integrations/notion-darkmode.svg";
import googleCalendarLogo from "../assets/integrations/google-calendar.svg";
import { apiFetch } from "../lib/api";

export default function Integrations() {
  // ── Notion state ──────────────────────────────────────────────────
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const [databases, setDatabases] = useState([]);
  const [loadingDatabases, setLoadingDatabases] = useState(false);

  const [selectedDbId, setSelectedDbId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Google Calendar state ─────────────────────────────────────────
  const [googleStatus, setGoogleStatus] = useState({
    connected: false,
    workspace_name: null,
    loading: true,
  });

  // ── Notion handlers ───────────────────────────────────────────────

  const loadStatus = useCallback(async () => {
    try {
      const response = await apiFetch("/integrations/notion/status");
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      console.error(err);
      setStatus({ connected: false, workspace_name: null, provider: "notion" });
    }
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await loadStatus();
      setLoading(false);
    }
    load();
  }, [loadStatus]);

  const isConnected = status?.connected === true;
  const workspaceName = status?.workspace_name;
  const selectedDatabase = status?.selected_database;

  async function handleConnect() {
    try {
      const response = await apiFetch("/oauth/notion/login");
      const data = await response.json();
      if (data.authorization_url) {
        window.open(data.authorization_url, "_blank", "width=600,height=800");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to initiate Notion connection.");
    }
  }

  async function handleDisconnect() {
    if (!window.confirm("Disconnect Notion integration?")) return;
    try {
      const response = await apiFetch("/integrations/notion/disconnect", { method: "POST" });
      const data = await response.json();
      if (data.success) {
        setStatus({ connected: false, workspace_name: null, provider: "notion", selected_database: null });
        setDatabases([]);
        setSelectedDbId("");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to disconnect.");
    }
  }

  async function loadDatabases() {
    setLoadingDatabases(true);
    setError("");
    try {
      const response = await apiFetch("/integrations/notion/databases");
      const data = await response.json();
      setDatabases(data);
      // Pre-select the currently saved database if present
      if (selectedDatabase?.id) {
        const match = data.find((db) => db.id === selectedDatabase.id);
        if (match) setSelectedDbId(match.id);
      } else if (data.length > 0) {
        setSelectedDbId(data[0].id);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load databases. Please try again.");
    } finally {
      setLoadingDatabases(false);
    }
  }

  async function handleSaveDatabase() {
    if (!selectedDbId) return;
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch("/integrations/notion/database", {
        method: "POST",
        body: JSON.stringify({ database_id: selectedDbId }),
      });
      const data = await response.json();
      if (data.success) {
        await loadStatus();
      } else {
        setError("Failed to save database selection.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to save database selection. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeDatabase() {
    setDatabases([]);
    setSelectedDbId("");
    await loadDatabases();
  }

  // Load databases when connected and status is known
  useEffect(() => {
    if (isConnected && databases.length === 0 && !loadingDatabases) {
      loadDatabases();
    }
  }, [isConnected]);

  // ── Google Calendar handlers ──────────────────────────────────────

  const googleIsConnected = googleStatus.connected === true;

  const loadGoogleStatus = useCallback(async () => {
    try {
      const response = await apiFetch("/integrations/google/status");
      if (!response.ok) {
        throw new Error(`Google status request failed: ${response.status}`);
      }
      const data = await response.json();
      setGoogleStatus({
        connected: data.connected === true,
        workspace_name: data.workspace_name || null,
        loading: false,
      });
    } catch (err) {
      console.error("Google status error:", err);
      setGoogleStatus({
        connected: false,
        workspace_name: null,
        loading: false,
      });
    }
  }, []);

  useEffect(() => {
    loadGoogleStatus();
  }, [loadGoogleStatus]);

  // Reload Google status when returning from OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "connected") {
      loadGoogleStatus();
      // Clean up the URL without a full page reload
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState(null, "", cleanUrl);
    }
  }, [loadGoogleStatus]);

  async function handleGoogleConnect() {
    try {
      const response = await apiFetch("/oauth/google/login");
      if (!response.ok) {
        throw new Error(`Google login request failed: ${response.status}`);
      }
      const data = await response.json();
      if (data.authorization_url) {
        // Redirect the full page to Google's OAuth consent screen
        window.location.href = data.authorization_url;
      } else {
        alert("Failed to get Google authorization URL.");
      }
    } catch (err) {
      console.error("Google connect error:", err);
      alert("Failed to initiate Google Calendar connection. Please try again.");
    }
  }

  async function handleGoogleDisconnect() {
    if (!window.confirm("Disconnect Google Calendar integration?")) return;
    try {
      const response = await apiFetch("/integrations/google/disconnect", { method: "POST" });
      if (!response.ok) {
        throw new Error(`Google disconnect request failed: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setGoogleStatus({
          connected: false,
          workspace_name: null,
          loading: false,
        });
      }
    } catch (err) {
      console.error("Google disconnect error:", err);
      alert("Failed to disconnect Google Calendar. Please try again.");
    }
  }

  return (
    <div className="integrationsPage">
      <div className="integrationsHeader">
        <h1>Integrations</h1>
        <p>Connect ActionOS with the tools you already use.</p>
      </div>
      <div className="integrationGrid">
        {/* ── Notion Card ────────────────────────────────────────────── */}
        <div className="integrationCard">
          <div className="integrationTop">
            <div className="integrationInfo">
              <div className="integrationLogo">
                <img src={notionLogo} alt="Notion" className="integrationLogoImage" />
              </div>
              <div>
                <h2>Notion</h2>
                <p className="integrationDescription">Sync confirmed tasks to Notion via OAuth 2.0.</p>
              </div>
            </div>
            <span className={isConnected ? "status connected" : "status disconnected"}>
              {isConnected ? "Connected" + (workspaceName ? " (" + workspaceName + ")" : "") : "Not Connected"}
            </span>
          </div>
          {loading ? (
            <div className="integrationLoading">Loading...</div>
          ) : (
            <>
              <div className="integrationRow"><label>Status</label><p>{isConnected ? "Connected" : "Not connected"}</p></div>
              <div className="integrationRow"><label>Auth</label><p>OAuth 2.0</p></div>

              {isConnected && (
                <div className="integrationRow">
                  <label>Database</label>
                  {selectedDatabase ? (
                    <div className="databaseSelected">
                      <span className="databaseName">{selectedDatabase.name}</span>
                      <button className="integrationButton changeDb" onClick={handleChangeDatabase}>
                        <span>Change Database</span>
                      </button>
                    </div>
                  ) : (
                    <div className="databaseSelector">
                      {loadingDatabases ? (
                        <span className="databaseLoading">Loading databases...</span>
                      ) : databases.length > 0 ? (
                        <>
                          <select
                            className="databaseSelect"
                            value={selectedDbId}
                            onChange={(e) => setSelectedDbId(e.target.value)}
                          >
                            <option value="">Select a Notion Database</option>
                            {databases.map((db) => (
                              <option key={db.id} value={db.id}>
                                {db.title}
                              </option>
                            ))}
                          </select>
                          <button
                            className="integrationButton save"
                            onClick={handleSaveDatabase}
                            disabled={!selectedDbId || saving}
                          >
                            <span>{saving ? "Saving..." : "Save"}</span>
                          </button>
                        </>
                      ) : (
                        <span className="databaseLoading">No databases found.</span>
                      )}
                      {error && <span className="databaseError">{error}</span>}
                    </div>
                  )}
                </div>
              )}

              <div className="integrationFooter">
                {isConnected ? (
                  <button className="integrationButton disconnect" onClick={handleDisconnect}><span>Disconnect</span></button>
                ) : (
                  <button className="integrationButton connect" onClick={handleConnect}><span>Connect to Notion</span></button>
                )}
                <span className="comingSoon">More coming soon</span>
              </div>
            </>
          )}
        </div>

        {/* ── Google Calendar Card ──────────────────────────────────── */}
        <div className="integrationCard">
          <div className="integrationTop">
            <div className="integrationInfo">
              <div className="integrationLogo">
                <img src={googleCalendarLogo} alt="Google Calendar" className="integrationLogoImage" />
              </div>
              <div>
                <h2>Google Calendar</h2>
                <p className="integrationDescription">Sync tasks to your Google Calendar via OAuth 2.0.</p>
              </div>
            </div>
            <span className={googleIsConnected ? "status connected" : "status disconnected"}>
              {googleIsConnected
                ? "Connected" + (googleStatus.workspace_name ? " (" + googleStatus.workspace_name + ")" : "")
                : "Not Connected"}
            </span>
          </div>
          {googleStatus.loading ? (
            <div className="integrationLoading">Loading...</div>
          ) : (
            <>
              <div className="integrationRow">
                <label>Status</label>
                <p>{googleIsConnected ? "Connected" : "Not connected"}</p>
              </div>
              {googleIsConnected && googleStatus.workspace_name && (
                <div className="integrationRow">
                  <label>Account</label>
                  <p>{googleStatus.workspace_name}</p>
                </div>
              )}
              <div className="integrationRow">
                <label>Auth</label>
                <p>OAuth 2.0</p>
              </div>

              <div className="integrationFooter">
                {googleIsConnected ? (
                  <button className="integrationButton disconnect" onClick={handleGoogleDisconnect}>
                    <span>Disconnect</span>
                  </button>
                ) : (
                  <button className="integrationButton connect" onClick={handleGoogleConnect}>
                    <span>Connect to Google Calendar</span>
                  </button>
                )}
                <span className="comingSoon">More coming soon</span>
              </div>
            </>
          )}
        </div>

        {/* ── Slack Card (placeholder) ─────────────────────────────── */}
        <div className="integrationCard disabled">
          <div className="integrationTop">
            <div className="integrationInfo">
              <div className="integrationLogo"><span>S</span></div>
              <div><h2>Slack</h2><p>Coming soon</p></div>
            </div>
            <span className="status disconnected">Unavailable</span>
          </div>
        </div>
      </div>
    </div>
  );
}
