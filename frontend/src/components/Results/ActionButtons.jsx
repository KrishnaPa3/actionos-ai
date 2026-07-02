import Button from "../ui/Button";

import {
    Pencil,
    BadgeCheck,
    Trash2,
    RotateCcw
} from "../ui/icons";

export default function ActionButtons({

    onEdit,
    onConfirm,
    onDelete,
    onRestore,

    showEdit = true,
    showConfirm = true,
    showDelete = true,
    showRestore = false,

    compact = false

}) {

    return (

        <div
            style={{
                display: "flex",
                gap: "8px",
                alignItems: "center"
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

            {showConfirm && (

                <Button
                    size="sm"
                    variant="success"
                    icon={<BadgeCheck size={16} />}
                    onClick={onConfirm}
                    title="Complete"
                >
                    {!compact && "Complete"}
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