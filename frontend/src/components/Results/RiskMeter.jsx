import { useEffect, useState } from "react";

export default function RiskMeter({ score, color }) {

    const [width, setWidth] = useState(0);

    useEffect(() => {

        const timer = setTimeout(() => {

            setWidth(score);

        }, 100);

        return () => clearTimeout(timer);

    }, [score]);

    return (

        <>

            <div
                style={{
                    width: "100%",
                    height: "12px",
                    background: "#32343b",
                    borderRadius: "999px",
                    overflow: "hidden"
                }}
            >

                <div
                    style={{
                        width: `${width}%`,
                        height: "100%",
                        background: color,
                        borderRadius: "999px",

                        transition: "width 800ms ease-out"
                    }}
                />

            </div>

            <div
                style={{
                    marginTop: "8px",
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: "20px"
                }}
            >
                {score}%
            </div>

        </>

    );

}