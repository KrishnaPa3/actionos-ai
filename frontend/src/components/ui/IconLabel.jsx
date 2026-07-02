export default function IconLabel({

    icon,

    children

}) {

    return (

        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "8px"
            }}
        >

            {icon}

            {children}

        </div>

    );

}