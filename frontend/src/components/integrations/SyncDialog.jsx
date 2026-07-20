import "./SyncDialog.css";

import Button from "../ui/Button";
import notionLogo from "../../assets/integrations/notion-darkmode.svg";import {
    X,
    RefreshCw,
    CheckCircle2,
    Lock
} from "../ui/icons";

export default function SyncDialog({

    open,
    onClose,
    onSync,
    syncing = false

}) {

    if (!open) return null;

    return (

        <div
            className="syncOverlay"
            onClick={onClose}
        >

            <div
                className="syncDialog"
                onClick={(e) => e.stopPropagation()}
            >

                <div className="syncHeader">

                    <div>

                        <h2>Sync Task</h2>

                        <p>
                            Export this task to your connected services.
                        </p>

                    </div>

                    <button
                        className="syncClose"
                        onClick={onClose}
                    >
                        <X size={18} />
                    </button>

                </div>

                <div className="syncBody">

                    <div className="integrationCard enabled">

                        <div className="integrationInfo">

                            <div className="integrationIcon">
    <img
        src={notionLogo}
        alt="Notion"
    />
</div>

                            <div>

                                <h3>Notion</h3>

                                <p>
                                    Create a task in your connected Notion database.
                                </p>

                            </div>

                        </div>

                        <CheckCircle2
                            size={20}
                            className="integrationEnabled"
                        />

                    </div>

                    <div className="integrationCard disabled">

                        <div className="integrationInfo">

                            <div className="integrationIcon">
                                G
                            </div>

                            <div>

                                <h3>Google Tasks</h3>

                                <p>
                                    Coming soon
                                </p>

                            </div>

                        </div>

                        <Lock
                            size={18}
                            className="integrationLocked"
                        />

                    </div>

                    <div className="integrationCard disabled">

                        <div className="integrationInfo">

                            <div className="integrationIcon">
                                S
                            </div>

                            <div>

                                <h3>Slack</h3>

                                <p>
                                    Coming soon
                                </p>

                            </div>

                        </div>

                        <Lock
                            size={18}
                            className="integrationLocked"
                        />

                    </div>

                </div>

                <div className="syncFooter">

                    <Button
                        variant="outline"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="primary"
                        icon={<RefreshCw size={16} />}
                        onClick={onSync}
                        disabled={syncing}
                    >
                        {syncing ? "Syncing..." : "Sync"}
                    </Button>

                </div>

            </div>

        </div>

    );

}