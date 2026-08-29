import { useState } from "react";
import Button from "../ui/Button";

import notionLogo from "../../assets/integrations/notion-darkmode.svg";
import googleCalendarLogo from "../../assets/integrations/google-calendar.svg";
import slackLogo from "../../assets/integrations/slack-logo.svg";
import {
    Pencil,
    BadgeCheck,
    Trash2,
    RotateCcw,
    ExternalLink,
    Blocks,
    CheckCircle2,
    ChevronDown,
    LoaderCircle,
} from "../ui/icons";

export default function ActionButtons({

    onEdit,
    onConfirm,
    onDelete,
    onRestore,
    onOpenMeeting,
    onAccept,
    onReject,
    onSync,

    completed = false,

    showEdit = true,
    showConfirm = true,
    showDelete = true,
    showRestore = false,
    showOpenMeeting = false,

    showAccept = false,
    showReject = false,

    showSync = false,
    syncing = false,

    // Notion sync state
    notionSynced = false,
    notionPageUrl = null,

    // Google Calendar sync state
    googleSynced = false,
    googleEventUrl = null,

    // Slack sync state
    slackSynced = false,
    slackMessageTs = null,

    compact = false

}) {

    const [syncMenuOpen, setSyncMenuOpen] = useState(false);

    const isSyncingAny = syncing;

    const dropdownItemStyle = {
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "8px 12px",
        border: "none",
        background: "transparent",
        color: "#E2E8F0",
        cursor: "pointer",
        borderRadius: 6,
        fontSize: 15,
        fontFamily: "inherit",
        transition: "background .15s",
    };

    const iconStyle = { width: 18, height: 18, display: "block" };

    return (

        <div
            style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                flexWrap: "wrap"
            }}
        >

            {showEdit && (

                <Button
                    size="sm"
                    variant="outline"
                    icon={<Pencil size={16} />}
                    onClick={onEdit}
                    title="Edit"
                >
                    {!compact && "Edit"}
                </Button>

            )}

            {showConfirm && onConfirm && (

                <Button
                    size="sm"
                    variant={completed ? "secondary" : "success"}
                    icon={
                        completed
                            ? <RotateCcw size={16} />
                            : <BadgeCheck size={16} />
                    }
                    onClick={onConfirm}
                    title={completed ? "Mark Pending" : "Complete"}
                >
                    {!compact && (
                        completed
                            ? "Mark Pending"
                            : "Complete"
                    )}
                </Button>

            )}

            {showAccept && (

                <Button
                    size="sm"
                    variant="success"
                    icon={<BadgeCheck size={16} />}
                    onClick={onAccept}
                    title="Agree"
                >
                    {!compact && "Agree"}
                </Button>

            )}

            {showReject && (

                <Button
                    size="sm"
                    variant="danger"
                    icon={<RotateCcw size={16} />}
                    onClick={onReject}
                    title="Disagree"
                >
                    {!compact && "Disagree"}
                </Button>

            )}

            {showDelete && (

                <Button
                    size="sm"
                    variant="danger"
                    icon={<Trash2 size={16} />}
                    onClick={onDelete}
                    title="Delete"
                >
                    {!compact && "Delete"}
                </Button>

            )}

            {showOpenMeeting && (

                <Button
                    size="sm"
                    variant="outline"
                    icon={<ExternalLink size={16} />}
                    onClick={onOpenMeeting}
                    title="Open Meeting"
                >
                    {!compact && "Meeting"}
                </Button>

            )}

            {showRestore && (

                <Button
                    size="sm"
                    variant="secondary"
                    icon={<RotateCcw size={16} />}
                    onClick={onRestore}
                    title="Restore"
                >
                    {!compact && "Restore"}
                </Button>

            )}

            {/* Sync Dropdown Button */}
            {showSync && (
                <div style={{ position: "relative" }}>
                    <Button
                        size="sm"
                        variant={notionSynced || googleSynced ? "secondary" : "outline"}
                        icon={isSyncingAny ? <LoaderCircle size={16} /> : <Blocks size={16} />}
                        onClick={() => setSyncMenuOpen(!syncMenuOpen)}
                        disabled={isSyncingAny}
                        title="Sync"
                    >
                        {!compact && (isSyncingAny ? "Syncing..." : "Sync")}
                        {!compact && !isSyncingAny && <ChevronDown size={14} style={{ marginLeft: 4 }} />}
                    </Button>

                    {syncMenuOpen && (
                        <>
                            <div
                                style={{
                                    position: "fixed",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    zIndex: 99,
                                }}
                                onClick={() => setSyncMenuOpen(false)}
                            />
                            <div
                                style={{
                                    position: "absolute",
                                    top: "100%",
                                    right: 0,
                                    marginTop: 4,
                                    background: "#1E293B",
                                    border: "1px solid #334155",
                                    borderRadius: 8,
                                    padding: 4,
                                    minWidth: 220,
                                    zIndex: 100,
                                    boxShadow: "0 10px 30px rgba(0,0,0,.3)",
                                }}
                            >
                                {/* Notion */}
                                {notionSynced ? (
                                    <button
                                        onClick={() => {
                                            setSyncMenuOpen(false);
                                            if (notionPageUrl) {
                                                window.open(notionPageUrl, "_blank", "noopener,noreferrer");
                                            }
                                        }}
                                        style={dropdownItemStyle}
                                        onMouseEnter={(e) => e.currentTarget.style.background = "#334155"}
                                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                    >
                                        <img src={notionLogo} alt="Notion" style={iconStyle} />
                                        <span style={{ flex: 1 }}>Open in Notion</span>
                                        <ExternalLink size={14} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setSyncMenuOpen(false);
                                            onSync?.("notion");
                                        }}
                                        style={dropdownItemStyle}
                                        onMouseEnter={(e) => e.currentTarget.style.background = "#334155"}
                                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                    >
                                        <img src={notionLogo} alt="Notion" style={iconStyle} />
                                        <span>Sync to Notion</span>
                                    </button>
                                )}

                                {/* Google Calendar */}
                                {googleSynced ? (
                                    <button
                                        onClick={() => {
                                            setSyncMenuOpen(false);
                                            if (googleEventUrl) {
                                                window.open(googleEventUrl, "_blank", "noopener,noreferrer");
                                            }
                                        }}
                                        style={dropdownItemStyle}
                                        onMouseEnter={(e) => e.currentTarget.style.background = "#334155"}
                                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                    >
                                        <img src={googleCalendarLogo} alt="Google Calendar" style={iconStyle} />
                                        <span style={{ flex: 1 }}>Open in Google Calendar</span>
                                        <ExternalLink size={14} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setSyncMenuOpen(false);
                                            onSync?.("google");
                                        }}
                                        style={dropdownItemStyle}
                                        onMouseEnter={(e) => e.currentTarget.style.background = "#334155"}
                                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                    >
                                        <img src={googleCalendarLogo} alt="Google Calendar" style={iconStyle} />
                                        <span>Sync to Google Calendar</span>
                                    </button>
                                )}

                                {/* Slack */}
                                {slackSynced ? (
                                    <button
                                        disabled
                                        style={{
                                            ...dropdownItemStyle,
                                            opacity: 0.65,
                                            cursor: "default",
                                        }}
                                    >
                                        <img src={slackLogo} alt="Slack" style={iconStyle} />
                                        <span>Already sent to Slack</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setSyncMenuOpen(false);
                                            onSync?.("slack");
                                        }}
                                        style={dropdownItemStyle}
                                        onMouseEnter={(e) => e.currentTarget.style.background = "#334155"}
                                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                    >
                                        <img src={slackLogo} alt="Slack" style={iconStyle} />
                                        <span>Send to Slack</span>
                                    </button>
                                )}

                                <div
                                    style={{
                                        padding: "8px 12px",
                                        color: "#64748B",
                                        fontSize: 13,
                                        borderTop: "1px solid #334155",
                                        marginTop: 4,
                                        paddingTop: 8,
                                    }}
                                >
                                    More apps coming soon
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

        </div>

    );

}

