import Button from "../ui/Button";

import {
    Pencil,
    BadgeCheck,
    Trash2,
    RotateCcw,
    ExternalLink
} from "../ui/icons";

export default function ActionButtons({

    onEdit,
    onConfirm,
    onDelete,
    onRestore,
    onOpenMeeting,

    onAccept,
    onReject,

    completed = false,

    showEdit = true,
    showConfirm = true,
    showDelete = true,
    showRestore = false,
    showOpenMeeting = false,

    showAccept = false,
    showReject = false,

    compact = false

}) {

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

            {/* Only show Complete if a handler exists */}

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

        </div>

    );

}