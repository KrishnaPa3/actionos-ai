import Button from "../ui/Button";

import {
    Pencil,
    BadgeCheck,
    Trash2,
    RotateCcw,
    ExternalLink
} from "../ui/icons";

export default function DecisionButtons({

    onAgree,
    onDisagree,
    onEdit,
    onDelete,
    onOpenMeeting,

    showAgree = true,
    showDisagree = true,
    showEdit = true,
    showDelete = true,
    showOpenMeeting = false

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

            {showAgree && (

                <Button
                    size="sm"
                    variant="success"
                    icon={<BadgeCheck size={16} />}
                    onClick={onAgree}
                >
                    Agree
                </Button>

            )}

            {showDisagree && (

                <Button
                    size="sm"
                    variant="danger"
                    icon={<RotateCcw size={16} />}
                    onClick={onDisagree}
                >
                    Disagree
                </Button>

            )}

            {showEdit && (

                <Button
                    size="sm"
                    variant="outline"
                    icon={<Pencil size={16} />}
                    onClick={onEdit}
                >
                    Edit
                </Button>

            )}

            {showDelete && (

                <Button
                    size="sm"
                    variant="danger"
                    icon={<Trash2 size={16} />}
                    onClick={onDelete}
                >
                    Delete
                </Button>

            )}

            {showOpenMeeting && (

                <Button
                    size="sm"
                    variant="outline"
                    icon={<ExternalLink size={16} />}
                    onClick={onOpenMeeting}
                >
                    Open Meeting
                </Button>

            )}

        </div>

    );

}