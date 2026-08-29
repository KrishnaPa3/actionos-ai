export default function DeleteItemModal({
    open,
    item,
    itemType = "Item",
    onCancel,
    onConfirm,
}) {

    if (!open) return null;

    return (

        <div style={overlayStyle}>

            <div style={modalStyle}>

                <h2 style={titleStyle}>
                    Delete {itemType}
                </h2>

                <p style={textStyle}>
                    Are you sure you want to delete
                    <br />
                    <strong>{item?.title}</strong>?
                </p>

                <div style={buttonRow}>

                    <button
                        onClick={onCancel}
                        style={cancelStyle}
                    >
                        Cancel
                    </button>

                    <button
                        onClick={onConfirm}
                        style={deleteStyle}
                    >
                        Delete
                    </button>

                </div>

            </div>

        </div>

    );

}

const overlayStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
};

const modalStyle = {
    width: "430px",
    background: "#1f2937",
    border: "1px solid #374151",
    borderRadius: "16px",
    padding: "28px",
    textAlign: "center",
    boxShadow: "0 20px 40px rgba(0,0,0,.45)",
    fontFamily: "var(--body)",
};

const titleStyle = {
    color: "#f9fafb",
    marginBottom: "16px",
    fontSize: "28px",
};

const textStyle = {
    color: "#d1d5db",
    lineHeight: 1.6,
    marginBottom: "28px",
    fontSize: "17px",
};

const buttonRow = {
    display: "flex",
    justifyContent: "center",
    gap: "16px",
};

const cancelStyle = {
    background: "#4b5563",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 22px",
    cursor: "pointer",
    fontFamily: "var(--body)",
    fontSize: "17px",
};

const deleteStyle = {
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 22px",
    cursor: "pointer",
    fontFamily: "var(--body)",
    fontSize: "17px",
};