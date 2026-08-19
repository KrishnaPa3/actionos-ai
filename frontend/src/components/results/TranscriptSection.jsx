import "./TranscriptSection.css";

export default function TranscriptSection({ transcript }) {

    return (

        <div className="transcriptSection">

            <h2 className="transcriptTitle">
                Meeting Dialogue
            </h2>

            <pre className="transcriptBody">

                {transcript || "No meeting dialogue available."}

            </pre>

        </div>

    );

}