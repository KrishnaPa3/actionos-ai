import { useEffect, useState } from "react";

export default function EditItemModal({
    open,
    title,
    item,
    fields,
    onCancel,
    onSave,
}) {

    const [form, setForm] = useState({});

    useEffect(() => {

        if (item) {

            setForm(item);

        }

    }, [item]);

    if (!open) return null;

    function handleChange(name, value) {

        setForm(prev => ({

            ...prev,

            [name]: value

        }));

    }

    return (

        <div style={overlayStyle}>

            <div style={modalStyle}>

                <h2 style={titleStyle}>
                    {title}
                </h2>

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                        marginTop: "24px"
                    }}
                >

                    {fields.map(field => (

                        <div key={field.name}>

                            <label
                                style={labelStyle}
                            >
                                {field.label}
                            </label>

                            {field.type === "textarea" ? (

                                <textarea

                                    value={form[field.name] || ""}

                                    onChange={(e) =>
                                        handleChange(
                                            field.name,
                                            e.target.value
                                        )
                                    }

                                    style={textareaStyle}

                                />

                            ) : (

                                <input

                                    type={field.type || "text"}

                                    value={form[field.name] || ""}

                                    onChange={(e) =>
                                        handleChange(
                                            field.name,
                                            field.type === "number"
                                                ? Number(e.target.value)
                                                : e.target.value
                                        )
                                    }

                                    style={inputStyle}

                                />

                            )}

                        </div>

                    ))}

                </div>

                <div style={buttonRow}>

                    <button
                        style={cancelStyle}
                        onClick={onCancel}
                    >
                        Cancel
                    </button>

                    <button
                        style={saveStyle}
                        onClick={() => onSave(form)}
                    >
                        Save
                    </button>

                </div>

            </div>

        </div>

    );

}

const overlayStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
};

const modalStyle = {
    width: "520px",
    background: "#1f2937",
    borderRadius: "18px",
    border: "1px solid #374151",
    padding: "28px",
    fontFamily: "var(--body)",
};

const titleStyle = {
    color: "#fff",
    margin: 0,
    marginBottom: "10px",
};

const labelStyle = {
    display: "block",
    marginBottom: "6px",
    color: "#d1d5db",
};

const inputStyle = {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #4b5563",
    background: "#111827",
    color: "#fff",
    fontFamily: "var(--body)",
};

const textareaStyle = {
    ...inputStyle,
    minHeight: "90px",
    resize: "vertical",
};

const buttonRow = {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "28px",
};

const cancelStyle = {
    padding: "10px 18px",
    background: "#4b5563",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
};

const saveStyle = {
    padding: "10px 18px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
};