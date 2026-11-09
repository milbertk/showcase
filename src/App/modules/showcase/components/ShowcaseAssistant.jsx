import { useCallback, useEffect, useRef, useState } from "react";
import {
  FaFacebookMessenger,
  FaMicrophone,
  FaPaperPlane,
  FaRobot,
  FaStop,
  FaTrash,
  FaWhatsapp,
  FaXmark,
} from "react-icons/fa6";
import ShowcaseAssistantService from "../services/ShowcaseAssistantService";
import VoiceLanguageSelect, { useVoiceLanguage } from "./VoiceLanguageSelect";
import "./ShowcaseAssistant.scss";

// =====================================================================
//  Aleph — shopping assistant of the public showcase.
//  The backend answers with text + "actions"; this component asks the page
//  (onAction) to run them: add to cart, open booking, open cart, sign in.
//  Orders and booking requests are ALWAYS confirmed by the visitor.
// =====================================================================

const assistantService = new ShowcaseAssistantService();

const VISITOR_STORAGE_KEY = "showcaseAssistantVisitorId";
const MAX_STORED_MESSAGES = 40;
// Dictation keeps listening through pauses; it is sent after this much
// silence, or right away when the visitor presses Send or the stop button.
const VOICE_SILENCE_MS = 10000;
const MAX_VOICE_RESTARTS = 30;

const SpeechRecognition =
  typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

function readJSON(storage, key, fallback) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode): the chat still works in memory.
  }
}

// A random id per browser, so the backend can apply per-visitor limits.
function getVisitorId() {
  try {
    let id = localStorage.getItem(VISITOR_STORAGE_KEY);
    if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID().replace(/-/g, "")
          : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(VISITOR_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

function nextId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function joinSpeech(left, right) {
  const a = String(left || "").trim();
  const b = String(right || "").trim();
  return a && b ? `${a} ${b}` : a || b;
}


/**
 * Props:
 *  - t, locale
 *  - companyId, companyName
 *  - cart: [{ productId, quantity }]
 *  - onAction(action) -> optional { note, contact: { productName, whatsappUrl, messengerUrl } }
 */
export default function ShowcaseAssistant({ t, locale = "en-US", companyId, companyName, cart, onAction }) {
  const storageKey = `showcaseAssistant:${companyId || ""}`;
  const text = (key, options) => t(`showcaseAssistant.${key}`, options);
  // Dictation language, chosen in the "Select language" list; default
  // English (2026-10-25).
  const [voiceLanguage, setVoiceLanguage] = useVoiceLanguage();

  const [open, setOpen] = useState(false);
  const [state, setState] = useState(() => {
    const stored = readJSON(sessionStorage, storageKey, null);
    return {
      conversationId: stored?.conversationId || "",
      messages: Array.isArray(stored?.messages) ? stored.messages : [],
    };
  });
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const requestRef = useRef(null);
  const dictationRef = useRef(null);
  const visitorIdRef = useRef(null);
  if (visitorIdRef.current === null) visitorIdRef.current = getVisitorId();

  useEffect(() => {
    writeJSON(sessionStorage, storageKey, {
      conversationId: state.conversationId,
      messages: state.messages.slice(-MAX_STORED_MESSAGES),
    });
  }, [state, storageKey]);

  useEffect(() => {
    listRef.current?.scrollTo?.({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [state.messages, thinking, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Stop the dictation and pending requests when the component goes away.
  useEffect(
    () => () => {
      const session = dictationRef.current;
      if (session) {
        session.done = true;
        clearTimeout(session.timer);
        session.recognition?.abort();
      }
      requestRef.current?.abort();
    },
    [],
  );

  const addMessage = (message) =>
    setState((current) => ({ ...current, messages: [...current.messages, { id: nextId(), ...message }] }));

  const sendQuestion = useCallback(
    async (rawQuestion) => {
      const question = String(rawQuestion || "").trim();
      if (!question || thinking || !companyId) return;

      setDraft("");
      setThinking(true);
      addMessage({ role: "user", text: question });

      const controller = new AbortController();
      requestRef.current = controller;

      const ask = (conversationId) =>
        assistantService.ask(
          {
            companyId,
            conversationId,
            message: question,
            visitorId: visitorIdRef.current,
            companyName,
            language: locale,
            cart,
          },
          controller.signal,
        );

      try {
        let result;
        try {
          result = await ask(state.conversationId);
        } catch (error) {
          // Conversation expired or belongs to another visitor: start a new one.
          if (error?.status !== 404 || !state.conversationId || error?.message !== "conversation not found") throw error;
          result = await ask("");
        }

        // Run the actions on the page, in order.
        const notes = [];
        const contacts = [];
        (Array.isArray(result?.actions) ? result.actions : []).forEach((action) => {
          const outcome = onAction?.(action);
          if (outcome?.note) notes.push(outcome.note);
          if (outcome?.contact) contacts.push(outcome.contact);
        });

        // Few questions left today: tell the visitor before the limit.
        const remaining = Number(result?.remainingToday);
        if (Number.isFinite(remaining) && remaining <= 3) {
          notes.push(remaining === 0 ? text("lastQuestion") : text("remaining", { count: remaining }));
        }

        setState((current) => ({
          conversationId: result?.conversationId || current.conversationId,
          messages: [
            ...current.messages,
            { id: nextId(), role: "assistant", text: result?.reply || "", notes, contacts },
          ],
        }));
      } catch (error) {
        if (error?.name === "AbortError") return;
        console.error("Showcase assistant error:", error);
        const key =
          error?.status === 429 ? "limit"
            : error?.status === 404 || error?.status === 403 ? "unavailable"
              : "error";
        addMessage({ role: "assistant", text: text(key), isError: true });
      } finally {
        if (requestRef.current === controller) {
          requestRef.current = null;
          setThinking(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart, companyId, companyName, locale, onAction, state.conversationId, thinking],
  );

  // ---- Voice dictation (same behavior as the management app) ----
  const sendQuestionRef = useRef(sendQuestion);
  useEffect(() => {
    sendQuestionRef.current = sendQuestion;
  }, [sendQuestion]);

  const stopDictation = useCallback((shouldSend) => {
    const session = dictationRef.current;
    if (!session) return;
    dictationRef.current = null;
    session.done = true;
    clearTimeout(session.timer);
    try {
      session.recognition?.abort();
    } catch {
      // Already stopped.
    }
    setListening(false);
    const spoken = joinSpeech(session.finalText, session.interim);
    if (shouldSend && spoken) sendQuestionRef.current(spoken);
  }, []);

  const startDictation = () => {
    const session = { recognition: null, finalText: "", interim: "", timer: null, restarts: 0, done: false };
    const armSilenceTimer = () => {
      clearTimeout(session.timer);
      session.timer = setTimeout(() => stopDictation(true), VOICE_SILENCE_MS);
    };

    const startRecognition = () => {
      const recognition = new SpeechRecognition();
      recognition.lang = voiceLanguage;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        if (session.done) return;
        let interim = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = event.results[index][0].transcript;
          if (event.results[index].isFinal) session.finalText = joinSpeech(session.finalText, transcript);
          else interim = joinSpeech(interim, transcript);
        }
        session.interim = interim;
        setDraft(joinSpeech(session.finalText, session.interim));
        armSilenceTimer();
      };
      recognition.onerror = (event) => {
        if (["not-allowed", "service-not-allowed", "audio-capture"].includes(event.error)) {
          setVoiceError(text("voiceError"));
          stopDictation(false);
        } else if (!["aborted", "no-speech"].includes(event.error)) {
          setVoiceError(text("voiceError"));
        }
      };
      recognition.onend = () => {
        if (session.done) return;
        session.finalText = joinSpeech(session.finalText, session.interim);
        session.interim = "";
        session.restarts += 1;
        if (session.restarts > MAX_VOICE_RESTARTS) {
          stopDictation(true);
          return;
        }
        try {
          startRecognition();
        } catch {
          stopDictation(true);
        }
      };
      session.recognition = recognition;
      recognition.start();
    };

    dictationRef.current = session;
    setDraft("");
    setListening(true);
    armSilenceTimer();
    try {
      startRecognition();
    } catch {
      setVoiceError(text("voiceError"));
      stopDictation(false);
    }
  };

  const toggleListening = () => {
    setVoiceError("");
    if (listening) {
      stopDictation(true);
      return;
    }
    if (!SpeechRecognition) {
      setVoiceError(text("voiceUnsupported"));
      return;
    }
    startDictation();
  };

  const submit = (event) => {
    event.preventDefault();
    if (dictationRef.current) stopDictation(false);
    sendQuestion(draft);
  };

  const clearConversation = () => {
    stopDictation(false);
    requestRef.current?.abort();
    requestRef.current = null;
    setThinking(false);
    setState({ conversationId: "", messages: [] });
    inputRef.current?.focus();
  };

  if (!companyId) return null;

  if (!open) {
    return (
      <button
        type="button"
        className="showcase-assistant-launcher"
        onClick={() => setOpen(true)}
        aria-label={text("open")}
        title={text("open")}
      >
        <FaRobot />
        <span>{text("launcher")}</span>
      </button>
    );
  }

  const suggestions = ["suggestionProducts", "suggestionBooking", "suggestionCart"];

  return (
    <section className="showcase-assistant" aria-label={text("title")}>
      <header className="showcase-assistant__header">
        <div className="showcase-assistant__identity">
          <span className="showcase-assistant__avatar"><FaRobot /></span>
          <div>
            <strong>{text("title")}</strong>
            <small>{text("subtitle", { company: companyName || "" })}</small>
          </div>
        </div>
        <div className="showcase-assistant__header-actions">
          <button type="button" onClick={clearConversation} title={text("clear")} aria-label={text("clear")}>
            <FaTrash />
          </button>
          <button type="button" onClick={() => setOpen(false)} title={text("close")} aria-label={text("close")}>
            <FaXmark />
          </button>
        </div>
      </header>

      <div className="showcase-assistant__messages" ref={listRef}>
        {state.messages.length === 0 && (
          <div className="showcase-assistant__welcome">
            <p>{text("welcome", { company: companyName || "" })}</p>
            <div className="showcase-assistant__suggestions">
              {suggestions.map((key) => (
                <button key={key} type="button" onClick={() => sendQuestion(text(key))} disabled={thinking}>
                  {text(key)}
                </button>
              ))}
            </div>
          </div>
        )}

        {state.messages.map((message) => (
          <article
            key={message.id}
            className={`showcase-assistant__message is-${message.role}${message.isError ? " is-error" : ""}`}
          >
            {message.text && <p>{message.text}</p>}
            {(message.notes || []).map((note, index) => (
              <span key={`note-${index}`} className="showcase-assistant__note">{note}</span>
            ))}
            {(message.contacts || []).map((contact, index) => (
              <div key={`contact-${index}`} className="showcase-assistant__contact">
                <span>{contact.productName}</span>
                {contact.whatsappUrl && (
                  <a href={contact.whatsappUrl} target="_blank" rel="noreferrer" className="is-whatsapp">
                    <FaWhatsapp /> WhatsApp
                  </a>
                )}
                {contact.messengerUrl && (
                  <a href={contact.messengerUrl} target="_blank" rel="noreferrer" className="is-messenger">
                    <FaFacebookMessenger /> Messenger
                  </a>
                )}
              </div>
            ))}
          </article>
        ))}

        {thinking && (
          <article className="showcase-assistant__message is-assistant is-thinking">
            <p>{text("thinking")}</p>
          </article>
        )}
      </div>

      {voiceError && <div className="showcase-assistant__voice-error" role="alert">{voiceError}</div>}

      <div className="showcase-assistant__voice-language">
        <VoiceLanguageSelect
          value={voiceLanguage}
          onChange={setVoiceLanguage}
          label={text("selectLanguage", { defaultValue: "Select language" })}
          disabled={listening}
        />
      </div>

      <form className="showcase-assistant__composer" onSubmit={submit}>
        <button
          type="button"
          className={`showcase-assistant__mic${listening ? " is-listening" : ""}`}
          onClick={toggleListening}
          title={text(listening ? "stopDictation" : "dictate")}
          aria-label={text(listening ? "stopDictation" : "dictate")}
          aria-pressed={listening}
        >
          {listening ? <FaStop /> : <FaMicrophone />}
        </button>
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={text(listening ? "listening" : "placeholder")}
          maxLength={500}
          aria-label={text("placeholder")}
        />
        <button
          type="submit"
          className="showcase-assistant__send"
          disabled={!draft.trim() || thinking}
          title={text("send")}
          aria-label={text("send")}
        >
          <FaPaperPlane />
        </button>
      </form>
      <p className="showcase-assistant__disclaimer">{text("disclaimer")}</p>
    </section>
  );
}
