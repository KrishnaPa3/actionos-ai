import { COLORS } from "./colors";

export default function EmptyState({

    title,

    description

}) {

    return (

        <div
            style={{
                textAlign: "center",
                padding: "60px 20px"
            }}
        >

            <h2
                style={{
                    color: COLORS.text
                }}
            >

                {title}

            </h2>

            <p
                style={{
                    color: COLORS.textSecondary
                }}
            >

                {description}

            </p>

        </div>

    );

}