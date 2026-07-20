import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

import "./Integrations.css";
import notionLogo from "../assets/integrations/notion-darkmode.svg";

const API = "http://localhost:8000";

export default function Integrations() {
    const [status, setStatus] = useState(null);
    const [database, setDatabase] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const [statusRes, databaseRes] = await Promise.all([
                    fetch(`${API}/notion/status`),
                    fetch(`${API}/notion/database`)
                ]);

                setStatus(await statusRes.json());
                setDatabase(await databaseRes.json());
            } catch (err) {
                console.error(err);

                setStatus({
                    connected: false
                });
            } finally {
                setLoading(false);
            }
        }

        load();
    }, []);

    return (
        <div className="integrationsPage">

            <div className="integrationsHeader">

                <h1>Integrations</h1>

                <p>
                    Connect ActionOS with the tools you already use and keep
                    meetings, decisions and confirmed tasks synchronized
                    across your workflow.
                </p>

            </div>

            <div className="integrationGrid">

                <div className="integrationCard">

                    <div className="integrationTop">

                        <div className="integrationInfo">

                            <div className="integrationLogo">
                                <img
                                    src={notionLogo}
                                    alt="Notion"
                                    className="integrationLogoImage"
                                />
                            </div>

                            <div>

                                <h2>Notion</h2>

                                <p className="integrationDescription">
                                    Sync confirmed ActionOS tasks directly into
                                    your Notion database for seamless task
                                    management.
                                </p>

                            </div>

                        </div>

                        <span
                            className={
                                status?.connected
                                    ? "status connected"
                                    : "status disconnected"
                            }
                        >
                            {status?.connected
                                ? "Connected"
                                : "Disconnected"}
                        </span>

                    </div>

                    {loading ? (

                        <div className="integrationLoading">
                            Loading integration...
                        </div>

                    ) : (

                        <>
                            <div className="integrationRow">

                                <label>Database</label>

                                <p>
                                    {database?.title || "Unavailable"}
                                </p>

                            </div>

                            <div className="integrationRow">

                                <label>Sync Mode</label>

                                <p>
                                    Automatic on task confirmation
                                </p>

                            </div>

                            <div className="integrationRow">

                                <label>Status</label>

                                <p>
                                    {status?.connected
                                        ? "Ready to sync confirmed tasks."
                                        : "Connection unavailable."}
                                </p>

                            </div>

                            <div className="integrationFooter">

                                <button
                                    className="integrationButton"
                                    disabled
                                >
                                    <ExternalLink size={16} />

                                    <span>
                                        Open Database
                                    </span>

                                </button>

                                <span className="comingSoon">
                                    More integrations coming soon
                                </span>

                            </div>

                        </>
                    )}

                </div>

            </div>

        </div>
    );
}