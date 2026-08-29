import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import WaveSurfer from "wavesurfer.js";

import Card from "./components/ui/Card";
import Button from "./components/ui/Button";
import PageHeader from "./components/ui/PageHeader";
import { apiFetch } from "./lib/api";

import {
  CircleDot,
  Square,
  Upload,
  Play,
  FileText,
} from "./components/ui/icons";

import "./VoiceRecorder.css";

function VoiceRecorder() {

  const navigate = useNavigate();

  const [recording, setRecording] = useState(false);

  const [audioURL, setAudioURL] = useState(null);

  const [seconds, setSeconds] = useState(0);

  const [uploadStatus, setUploadStatus] = useState("");

  const [transcript, setTranscript] = useState("");

  const [extraction, setExtraction] = useState(null);

  const mediaRecorderRef = useRef(null);

  const audioChunksRef = useRef([]);

  const timerRef = useRef(null);

  const waveformRef = useRef(null);

  const wavesurferRef = useRef(null);

  // =====================================
  // Upload Audio
  // =====================================

  const warmAudioModels = () => {

    // Do not wait here: model loading happens while the user records or the
    // upload begins. The upload endpoint reuses the same backend singletons.
    apiFetch("/warm-audio-models", {
      method: "POST",
    }).catch((error) => {

      // The upload still performs lazy initialization if warm-up fails.
      console.warn("Audio model warm-up failed:", error);

    });

  };

  const uploadAudio = async (audioFile, filename) => {

    sessionStorage.removeItem("actionos_results");

    const formData = new FormData();

    formData.append("file", audioFile, filename);

    try {

      setUploadStatus("Uploading audio...");

      const response = await apiFetch(
        "/upload-audio",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      console.log("Backend Response:", data);

      sessionStorage.setItem(
        "current_session",
        data.id
      );

      if (!response.ok) {

        throw new Error(
          data.detail || "Upload failed."
        );

      }

      setTranscript(
        data.transcript || ""
      );

      setExtraction(
        data.extraction || null
      );

      sessionStorage.setItem(
        "actionos_results",

        JSON.stringify({

          transcript: data.transcript,

          extraction: data.extraction,

          audioUrl: data.audio_url,

        })

      );

      setUploadStatus(
        "Upload & extraction completed successfully."
      );

      // The upload pipeline creates default reminders for newly extracted
      // tasks. Refresh the navigation bell immediately instead of waiting
      // for its polling interval.
      window.dispatchEvent(new Event("remindersUpdated"));

      sessionStorage.setItem(
        "current_session",
        data.id
      );

     
    } catch (error) {

      console.error(error);

      setUploadStatus(
        `Upload failed: ${error.message}`
      );

    }

  };

  // =====================================
  // Recording
  // =====================================

  const startRecording = async () => {

    sessionStorage.removeItem(
      "actionos_results"
    );

    warmAudioModels();

    try {

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      const mediaRecorder =
        new MediaRecorder(stream);

      mediaRecorderRef.current =
        mediaRecorder;

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (
        event
      ) => {

        audioChunksRef.current.push(
          event.data
        );

      };

      mediaRecorder.onstop = async () => {

        const audioBlob = new Blob(
          audioChunksRef.current,
          {
            type: "audio/webm",
          }
        );

        const url =
          URL.createObjectURL(audioBlob);

        setAudioURL(url);

        await uploadAudio(
          audioBlob,
          `recording-${Date.now()}.webm`
        );

      };

      mediaRecorder.start();

      setRecording(true);

      setSeconds(0);

      setUploadStatus("");

      setTranscript("");

      setExtraction(null);

      timerRef.current = setInterval(() => {

        setSeconds((prev) => prev + 1);

      }, 1000);

    } catch (error) {

      console.error(error);

      alert("Microphone access denied.");

    }

  };

  const stopRecording = () => {

    mediaRecorderRef.current?.stop();

    clearInterval(timerRef.current);

    setRecording(false);

  };

  // =====================================
  // Waveform
  // =====================================

  useEffect(() => {

    if (!audioURL || !waveformRef.current)
      return;

    if (wavesurferRef.current) {

      wavesurferRef.current.destroy();

    }

    wavesurferRef.current =
      WaveSurfer.create({

        container: waveformRef.current,

        waveColor: "#4F8CFF",

        progressColor: "#7CFFB2",

        cursorColor: "#FFFFFF",

        height: 90,

        barWidth: 3,

        barGap: 2,

        barRadius: 4,

      });

    wavesurferRef.current.load(
      audioURL
    );

    return () => {

      if (wavesurferRef.current) {

        wavesurferRef.current.destroy();

      }

    };

  }, [audioURL]);
    return (

    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{
        maxWidth: "none",
        margin: "0",
        padding: "20px 0 64px",
      }}
    >

      <PageHeader
        icon={<CircleDot size={30} />}
        title="Record a meeting"
      />

      <Card>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
          }}
        >

          <motion.div
            animate={
              recording
                ? { scale: [1, 1.05, 1], opacity: [1, 0.7, 1] }
                : {}
            }
            transition={
              recording
                ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                : {}
            }
            style={{
              fontSize: "56px",
              fontFamily: "var(--body)",
              fontWeight: 700,
            }}
          >

            {String(Math.floor(seconds / 60)).padStart(2, "0")}
            :
            {String(seconds % 60).padStart(2, "0")}

          </motion.div>

          {!recording ? (

            <Button
              size="lg"
              variant="primary"
              icon={<CircleDot size={20} />}
              onClick={startRecording}
            >
              Start Recording
            </Button>

          ) : (

            <Button
              size="lg"
              variant="danger"
              icon={<Square size={20} />}
              onClick={stopRecording}
            >
              Stop Recording
            </Button>

          )}

          <p
            style={{
              fontFamily: "var(--body)",
              margin: 0,
            }}
          >
            {recording ? "🔴 Recording..." : "Ready to Record"}
          </p>

          {uploadStatus && (

            <p
              style={{
                fontFamily: "var(--body)",
                textAlign: "center",
                margin: 0,
              }}
            >
              {uploadStatus}
            </p>

          )}

        </div>

      </Card>

      <Card
        style={{
          marginTop: "24px",
        }}
      >

        <PageHeader
          icon={<Upload size={22} />}
          title="Upload a recording"
          subtitle="Already have an audio file? Upload it here."
        />

        <Button
          variant="secondary"
          icon={<Upload size={18} />}
        >

          <label
            style={{
              cursor: "pointer",
            }}
          >

            Choose Audio File

            <input
              type="file"
              accept="audio/*"
              style={{
                display: "none",
              }}
              onChange={async (e) => {

                const file = e.target.files[0];

                if (!file) return;

                warmAudioModels();

                setAudioURL(
                  URL.createObjectURL(file)
                );

                setTranscript("");

                setExtraction(null);

                await uploadAudio(
                  file,
                  file.name
                );

              }}
            />

          </label>

        </Button>

      </Card>

      <AnimatePresence>
        {audioURL && (
          <motion.div
            key="playback"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card style={{ marginTop: "24px" }}>
              <PageHeader
                icon={<Play size={22} />}
                title="Playback"
                subtitle="Review your recording."
              />
              <div
                ref={waveformRef}
                style={{ width: "100%", marginBottom: "20px" }}
              />
              <Button
                variant="primary"
                icon={<Play size={18} />}
                onClick={() => wavesurferRef.current?.playPause()}
              >
                Play / Pause
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {transcript && (
        <Card style={{ marginTop: "24px" }}>
          <PageHeader
            icon={<FileText size={22} />}
            title="Transcript"
            subtitle="Generated from your recording."
          />
          <p
            style={{
              fontFamily: "var(--body)",
              lineHeight: 1.8,
              whiteSpace: "pre-wrap",
            }}
          >
            {transcript}
          </p>
        </Card>
      )}

      {extraction && (
        <Card style={{ marginTop: "24px" }}>
          <PageHeader
            icon={<FileText size={22} />}
            title="Recap ready"
            subtitle="Your meeting has been processed."
          />
          <div
            style={{
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <Button
              variant="primary"
              icon={<FileText size={18} />}
              onClick={() =>
                navigate(
                  `/results/${sessionStorage.getItem("current_session")}`
                )
              }
            >
              View Results
            </Button>
            <Button
              variant="secondary"
              icon={<CircleDot size={18} />}
              onClick={startRecording}
            >
              Record Again
            </Button>
          </div>
        </Card>
      )}

    </motion.div>
  );
}

export default VoiceRecorder;
