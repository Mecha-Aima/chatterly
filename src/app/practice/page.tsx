
"use client";
import React, { useState, useRef } from "react";

const LANGUAGES = [
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
];

const SENTENCES: Record<string, string[]> = {
  es: ["Hola, ¿cómo estás?", "Me llamo María", "¿Dónde está el baño?", "Gracias por tu ayuda"],
  fr: ["Bonjour, comment allez-vous?", "Je m'appelle Pierre", "Où sont les toilettes?", "Merci beaucoup"],
  de: ["Hallo, wie geht es Ihnen?", "Ich heiße Hans", "Wo ist die Toilette?", "Vielen Dank"],
  it: ["Ciao, come stai?", "Mi chiamo Marco", "Dov'è il bagno?", "Grazie mille"],
  pt: ["Olá, como está?", "Meu nome é João", "Onde fica o banheiro?", "Muito obrigado"],
};

function getWSUrl() {
  if (typeof window === "undefined") return "";
  return `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/api/stream-audio/websocket`;
}

function similarity(a: string, b: string) {
  // Simple similarity: percent of words in prompt found in transcript
  const aw = a.toLowerCase().replace(/[^\w\sáéíóúüñç]/gi, "").split(/\s+/);
  const bw = b.toLowerCase().replace(/[^\w\sáéíóúüñç]/gi, "").split(/\s+/);
  const match = aw.filter((w) => bw.includes(w)).length;
  return aw.length === 0 ? 0 : match / aw.length;
}

export default function PracticePage() {
  const [language, setLanguage] = useState("es");
  const [prompt, setPrompt] = useState(SENTENCES["es"][0]);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [confidence, setConfidence] = useState<any[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const pickPrompt = (lang: string) => {
    const arr = SENTENCES[lang];
    setPrompt(arr[Math.floor(Math.random() * arr.length)]);
  };

  const speakPrompt = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const utter = new window.SpeechSynthesisUtterance(prompt);
      utter.lang = language;
      window.speechSynthesis.speak(utter);
    }
  };

  const startRecording = async () => {
    setTranscript("");
    setConfidence([]);
    setScore(null);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const ws = new WebSocket(getWSUrl());
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.channel && data.channel.alternatives && data.channel.alternatives[0]) {
          setTranscript(data.channel.alternatives[0].transcript || "");
          setConfidence(data.channel.alternatives[0].words || []);
        }
      } catch {}
    };
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (ws.readyState === 1 && e.data.size > 0) {
        ws.send(e.data);
      }
    };
    recorder.start(250);
    setRecording(true);
  };

  const stopRecording = () => {
    setRecording(false);
    mediaRecorderRef.current?.stop();
    wsRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    // Score after a short delay to allow last transcript to arrive
    setTimeout(() => {
      setScore(similarity(prompt, transcript));
    }, 600);
  };

  return (
    <div style={{ maxWidth: 500, margin: "2rem auto", padding: 24, border: "1px solid #eee", borderRadius: 12 }}>
      <h2>🎤 Language Practice</h2>
      <div style={{ marginBottom: 16 }}>
        <label>
          Target Language:
          <select
            value={language}
            onChange={e => {
              setLanguage(e.target.value);
              pickPrompt(e.target.value);
            }}
            style={{ marginLeft: 8 }}
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div style={{ marginBottom: 16 }}>
        <strong>Prompt:</strong>
        <span style={{ marginLeft: 8, fontSize: 18 }}>{prompt}</span>
        <button onClick={speakPrompt} style={{ marginLeft: 8, background: "#e0e7ff", border: 0, borderRadius: 6, padding: "2px 8px" }} title="Hear prompt">
          🔊
        </button>
        <button onClick={() => pickPrompt(language)} style={{ marginLeft: 8, background: "#f1f5f9", border: 0, borderRadius: 6, padding: "2px 8px" }} title="New prompt">
          🔄
        </button>
      </div>
      <div style={{ margin: "1rem 0" }}>
        {!recording ? (
          <button onClick={startRecording} style={{ padding: 12, background: "#4ade80", color: "#fff", border: 0, borderRadius: 8 }}>
            🎤 Start Recording
          </button>
        ) : (
          <button onClick={stopRecording} style={{ padding: 12, background: "#f87171", color: "#fff", border: 0, borderRadius: 8 }}>
            ⏹️ Stop Recording
          </button>
        )}
      </div>
      <div style={{ minHeight: 40, marginBottom: 12 }}>
        <strong>Your Transcript:</strong>
        <div style={{ fontSize: 18, marginTop: 4 }}>
          {confidence.length > 0
            ? confidence.map((w: any, i: number) => (
                <span
                  key={i}
                  style={{
                    color:
                      w.confidence > 0.85
                        ? "#22c55e"
                        : w.confidence > 0.6
                        ? "#eab308"
                        : "#ef4444",
                  }}
                >
                  {w.word + " "}
                </span>
              ))
            : transcript}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#888" }}>
        <div>High confidence: <span style={{ color: "#22c55e" }}>green</span></div>
        <div>Medium: <span style={{ color: "#eab308" }}>yellow</span></div>
        <div>Low: <span style={{ color: "#ef4444" }}>red</span></div>
      </div>
      {score !== null && (
        <div style={{ marginTop: 16, fontWeight: 500 }}>
          <span>Similarity to prompt: </span>
          <span style={{ color: score > 0.8 ? "#22c55e" : score > 0.5 ? "#eab308" : "#ef4444" }}>
            {(score * 100).toFixed(0)}%
          </span>
          <span style={{ marginLeft: 8, color: '#888', fontSize: 12 }}>(word overlap)</span>
        </div>
      )}
    </div>
  );
}
