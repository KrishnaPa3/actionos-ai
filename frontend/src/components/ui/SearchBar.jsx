import { Search } from "./icons";
import { COLORS } from "./colors";
import { RADIUS } from "./radius";

export default function SearchBar({

    value,

    onChange,

    placeholder = "Search..."

}) {

    return (

        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: RADIUS.md,
                padding: "12px 18px",
                marginBottom: "24px"
            }}
        >

            <Search size={18} />

            <input

                value={value}

                onChange={(e) => onChange(e.target.value)}

                placeholder={placeholder}

                style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    color: COLORS.text,
                    outline: "none",
                    fontSize: "16px"
                }}

            />

        </div>

    );

}