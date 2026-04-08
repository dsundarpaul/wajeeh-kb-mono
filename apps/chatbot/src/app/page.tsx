"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send } from "lucide-react";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Source {
  title: string;
  url: string;
  source_type: "blog" | "video";
  thumbnail_url?: string;
}

type WebSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((ev: WebSpeechResultEvent) => void) | null;
  onerror: ((ev: WebSpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type WebSpeechResultEvent = {
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
};

type WebSpeechErrorEvent = { error: string };

function getSpeechRecognitionCtor(): (new () => WebSpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window &
    typeof globalThis & {
      SpeechRecognition?: new () => WebSpeechRecognition;
      webkitSpeechRecognition?: new () => WebSpeechRecognition;
    };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function ChatWidgetPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);

  const speechSupported =
    typeof window !== "undefined" && !!getSpeechRecognitionCtor();

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 50);
  };

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor || loading) return;

    setSpeechError(null);

    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }

    let rec: WebSpeechRecognition;
    try {
      rec = new Ctor();
    } catch {
      setSpeechError("Speech recognition failed to start");
      return;
    }

    recognitionRef.current = rec;
    rec.lang = navigator.language || "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event: WebSpeechResultEvent) => {
      let text = "";
      const len = event.results.length;
      for (let i = 0; i < len; i++) {
        text += event.results[i][0]?.transcript ?? "";
      }
      const t = text.trim();
      if (!t) return;
      setInput((prev) => {
        const p = prev.trim();
        return p ? `${p} ${t}` : t;
      });
    };

    rec.onerror = (event: WebSpeechErrorEvent) => {
      if (event.error === "aborted") return;
      if (event.error === "no-speech") {
        setSpeechError(null);
        return;
      }
      const human: Record<string, string> = {
        "not-allowed":
          "Microphone blocked — allow microphone for this site.",
        network: "Network error during speech recognition.",
        "service-not-allowed": "Speech service not allowed in this context.",
      };
      setSpeechError(human[event.error] ?? `Voice input: ${event.error}`);
    };

    rec.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };

    try {
      rec.start();
      setListening(true);
    } catch {
      setSpeechError("Could not start microphone");
      recognitionRef.current = null;
      setListening(false);
    }
  }, [loading]);

  const toggleListening = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }, [listening, startListening, stopListening]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (listening) {
      stopListening();
    }

    const userMsg: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setSources([]);
    scrollToBottom();

    try {
      const res = await fetch(`${apiBase}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          chat_history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error("Request failed");

      const data = await res.json();
      const assistantMsg: Message = {
        role: "assistant",
        content: data.answer ?? "Sorry, I couldn't find an answer.",
      };
      setMessages([...updatedMessages, assistantMsg]);
      if (data.sources?.length) {
        setSources(data.sources);
      }
    } catch {
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [input, loading, messages, listening, stopListening]);

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
      <header className="flex items-center gap-3 border-b border-neutral-800 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">
          W
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Wajeeh Assistant</p>
          <p className="text-xs text-neutral-400">
            Ask me anything from our knowledge base
          </p>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
              <Send size={24} className="text-brand" />
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-neutral-400">
              Ask a question and I&apos;ll find the answer from our blog articles
              and videos.
            </p>
            {speechSupported && (
              <p className="mt-3 max-w-xs text-xs text-neutral-500">
                Use the microphone button to dictate your question (Chrome,
                Edge, Safari).
              </p>
            )}
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-brand text-white"
                  : "border border-neutral-800 bg-neutral-900 text-neutral-200"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-brand"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-brand"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-brand"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}

        {sources.length > 0 && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-400">
              Sources
            </p>
            <div className="space-y-1.5">
              {sources.map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg p-2 text-xs transition-colors hover:bg-neutral-800"
                >
                  {src.source_type === "video" && src.thumbnail_url ? (
                    <img
                      src={src.thumbnail_url}
                      alt=""
                      className="h-8 w-12 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-brand/10">
                      <span className="text-xs font-bold text-brand">
                        {src.source_type === "blog" ? "B" : "V"}
                      </span>
                    </div>
                  )}
                  <span className="truncate text-neutral-300">{src.title}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-neutral-800 p-3">
        {speechError && (
          <p className="mb-2 text-center text-xs text-amber-400">{speechError}</p>
        )}
        {listening && (
          <p className="mb-2 text-center text-xs text-brand-light">
            Listening… speak now
          </p>
        )}
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-neutral-500 focus:border-brand/50 focus:ring-1 focus:ring-brand/20"
            placeholder="Ask a question…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          {speechSupported && (
            <button
              type="button"
              onClick={toggleListening}
              disabled={loading}
              title={listening ? "Stop dictation" : "Dictate with microphone"}
              aria-pressed={listening}
              className={`flex shrink-0 items-center justify-center rounded-xl border px-3 py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                listening
                  ? "border-red-500/60 bg-red-500/15 text-red-300 ring-2 ring-red-500/40"
                  : "border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-brand/40 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              {listening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}
          <button
            type="button"
            onClick={send}
            disabled={loading || !input.trim()}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
