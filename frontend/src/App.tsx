import {
  Accessibility,
  Bot,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileCheck2,
  Languages,
  MapPin,
  Menu,
  MessageCircle,
  Mic,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { FormEvent, useEffect, useId, useRef, useState } from "react";
import {
  buildAssistantReply,
  createCalendarUrl,
  createMapsUrl,
  findOfficialSources,
  goals,
  journeySteps,
  mythFacts,
  personas,
  readinessChecks,
  starterPrompts,
} from "./data";
import { askCivicGuide } from "./assistantClient";
import { loadJourney, saveJourney } from "./firebaseJourney";
import type { Goal, Language, Message, Persona, UserContext } from "./types";

const initialContext: UserContext = {
  persona: "first-time",
  goal: "register",
  location: "India",
  language: "Hinglish",
  accessibility: false,
};

const firstMessage =
  "Hi, I am CivicGuide AI. I can guide you through registration, documents, election timelines, accessibility help, and voting-day preparation. I stay neutral and I never tell you who to vote for.";

type SelectOption = {
  value: string;
  label: string;
};

type CustomSelectProps = {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
};

function CustomSelect({ label, value, options, onChange }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();
  const activeOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <label className="custom-select-label">
      {label}
      <div className="custom-select" ref={wrapperRef}>
        <button
          className={open ? "select-trigger open" : "select-trigger"}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen(true);
            }
          }}
          onClick={() => setOpen((current) => !current)}
        >
          <span>{activeOption?.label}</span>
          <ChevronDown size={16} />
        </button>

        {open && (
          <div className="select-menu" id={listId} role="listbox" aria-label={label}>
            {options.map((option) => (
              <button
                key={option.value}
                className={option.value === value ? "select-option active" : "select-option"}
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {option.value === value && <Check size={15} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </label>
  );
}

function App() {
  const [context, setContext] = useState<UserContext>(initialContext);
  const [isPersonaExpanded, setIsPersonaExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [sourceQuery, setSourceQuery] = useState("");
  const [saveStatus, setSaveStatus] = useState(() =>
    loadJourney() ? "Saved journey found locally" : "Not saved yet"
  );
  const [isThinking, setIsThinking] = useState(false);
  const submitLockRef = useRef(false);
  const nextMessageId = useRef(2);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      label: "CivicGuide",
      text: firstMessage,
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const calendarUrl = createCalendarUrl(context);
  const mapsUrl = createMapsUrl(context.location);
  const matchedSources = findOfficialSources(sourceQuery || context.goal);
  const progress = Math.round((2 / readinessChecks.length) * 100);
  const conversationTitle = `${goals[context.goal]} for ${personas[context.persona]}`;
  const isFreshThread = messages.length === 1 && messages[0]?.role === "assistant";
  const primaryPrompts = starterPrompts.slice(0, 3);
  const personaOptions = Object.entries(personas).map(([value, label]) => ({ value, label }));
  const goalOptions = Object.entries(goals).map(([value, label]) => ({ value, label }));
  const languageOptions: SelectOption[] = [
    { value: "Hinglish", label: "Hinglish" },
    { value: "English", label: "English" },
    { value: "Hindi", label: "Hindi" },
  ];

  function updateContext<K extends keyof UserContext>(key: K, value: UserContext[K]) {
    setContext((current) => ({ ...current, [key]: value }));
  }

  async function submitQuestion(text: string) {
    const trimmed = text.trim();
    if (!trimmed || submitLockRef.current) return;

    submitLockRef.current = true;

    const userMessage: Message = {
      id: nextMessageId.current,
      role: "user",
      label: "You",
      text: trimmed,
    };
    nextMessageId.current += 1;

    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setIsThinking(true);

    try {
      const answer = await askCivicGuide(trimmed, context);
      const assistantMessage: Message = {
        id: nextMessageId.current,
        role: "assistant",
        label: answer.source === "gemini" ? "CivicGuide Gemini" : "CivicGuide",
        text: answer.text || buildAssistantReply(trimmed, context),
      };
      nextMessageId.current += 1;
      setMessages((current) => [...current, assistantMessage]);
    } finally {
      setIsThinking(false);
      submitLockRef.current = false;
    }
  }

  function askAssistant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuestion(question);
  }

  async function handleSaveJourney() {
    setSaveStatus("Saving...");
    try {
      const target = await saveJourney({
        context,
        readiness: progress,
        savedAt: new Date().toISOString(),
      });
      setSaveStatus(target === "firebase" ? "Saved to Firebase" : "Saved locally");
    } catch {
      setSaveStatus("Saved locally; Firebase write needs project setup");
    }
  }

  function openInfoTab(tab: "journey" | "myths" | "safety") {
    const target = `${window.location.origin}${window.location.pathname}#${tab}`;
    window.open(target, "_blank", "noopener,noreferrer");
  }

  function handleNewThread() {
    nextMessageId.current = 2;
    setMessages([
      {
        id: 1,
        role: "assistant",
        label: "CivicGuide",
        text: firstMessage,
      },
    ]);
    setQuestion("");
  }

  const hashView =
    typeof window !== "undefined"
      ? window.location.hash.replace("#", "")
      : "";

  if (hashView === "journey" || hashView === "myths" || hashView === "safety") {
    return (
      <main className={context.accessibility ? "app standalone high-contrast" : "app standalone"}>
        <a className="skip-link" href="#standalone-main">
          Skip to content
        </a>
        <section className="standalone-view" id="standalone-main" tabIndex={-1}>
          <header className="standalone-header">
            <div className="brand">
              <div className="brand-mark">
                <ShieldCheck size={18} />
              </div>
              <div>
                <strong>CivicGuide</strong>
                <span>Election mentor</span>
              </div>
            </div>
          </header>

          <section className="detail-card standalone-card">
            {hashView === "journey" && (
              <>
                <div className="card-head">
                  <Bot size={18} />
                  <h2>Election Journey</h2>
                </div>
                <ol className="journey-list">
                  {journeySteps.map((step) => (
                    <li className={step.status} key={step.title}>
                      <span>{step.title}</span>
                      <p>{step.detail}</p>
                    </li>
                  ))}
                </ol>
              </>
            )}

            {hashView === "myths" && (
              <>
                <div className="card-head">
                  <Languages size={18} />
                  <h2>Myth vs Fact</h2>
                </div>
                <div className="myth-list">
                  {mythFacts.map((item) => (
                    <article key={item.myth}>
                      <strong>Myth: {item.myth}</strong>
                      <p>Fact: {item.fact}</p>
                    </article>
                  ))}
                </div>
              </>
            )}

            {hashView === "safety" && (
              <>
                <div className="card-head">
                  <ShieldCheck size={18} />
                  <h2>Safety Rule</h2>
                </div>
                <p className="muted">
                  CivicGuide explains election processes only. It does not endorse parties,
                  candidates, or political choices.
                </p>
                <a
                  href="https://www.google.com/search?q=official+election+commission"
                  target="_blank"
                  rel="noreferrer"
                  className="action-link"
                >
                  <ExternalLink size={16} />
                  Verify official sources
                </a>
              </>
            )}
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className={context.accessibility ? "app high-contrast" : "app"}>
      <a className="skip-link" href="#assistant">
        Skip to chat
      </a>
      <aside className="sidebar" aria-label="CivicGuide navigation">
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={18} />
          </div>
          <div>
            <strong>CivicGuide</strong>
            <span>Election mentor</span>
          </div>
        </div>

        <button className="new-chat" type="button" onClick={handleNewThread}>
          <Plus size={16} />
          New Thread
        </button>

        <section className="persona-card">
          <button
            type="button"
            className="persona-header"
            aria-expanded={isPersonaExpanded}
            aria-controls="persona-panel"
            id="persona-toggle"
            style={{ cursor: "pointer", marginBottom: isPersonaExpanded ? "14px" : "0" }}
            onClick={() => setIsPersonaExpanded(!isPersonaExpanded)}
          >
            <div className="persona-icon">
              <Sparkles size={16} />
            </div>
            <div>
              <strong>Assistant</strong>
              <span>Switch user context</span>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", color: "#a4a8b8" }}>
              {isPersonaExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>
          {isPersonaExpanded && (
            <div className="persona-grid" id="persona-panel" role="region" aria-labelledby="persona-toggle">
            <CustomSelect
              label="Persona"
              value={context.persona}
              options={personaOptions}
              onChange={(value) => updateContext("persona", value as Persona)}
            />
            <CustomSelect
              label="Goal"
              value={context.goal}
              options={goalOptions}
              onChange={(value) => updateContext("goal", value as Goal)}
            />
            <label>
              Location
              <input
                value={context.location}
                onChange={(event) => updateContext("location", event.target.value)}
                placeholder="City, state, or country"
                autoComplete="address-level2"
                aria-label="Location for localized guidance"
              />
            </label>
            <CustomSelect
              label="Language"
              value={context.language}
              options={languageOptions}
              onChange={(value) => updateContext("language", value as Language)}
            />
          </div>
          )}
          {isPersonaExpanded && (
            <button
              className="contrast-toggle"
              type="button"
              aria-pressed={context.accessibility}
              onClick={() => updateContext("accessibility", !context.accessibility)}
            >
              <Accessibility size={16} />
              High contrast
            </button>
          )}
        </section>

        <section className="history-list">
          <p className="sidebar-label">Today</p>
          {starterPrompts.slice(0, 3).map((prompt, index) => (
            <button
              className={`history-item ${index === 0 ? "active" : ""}`}
              key={prompt}
              type="button"
              onClick={() => void submitQuestion(prompt)}
            >
              <MessageCircle size={14} />
              <span>{prompt}</span>
            </button>
          ))}
        </section>

        <div className="sidebar-footer">
          <div className="user-badge">R</div>
          <div>
            <strong>rohit</strong>
            <span>free</span>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button" type="button" aria-label="Open menu">
              <Menu size={18} />
            </button>
            <div className="topbar-title">
              <strong>{conversationTitle}</strong>
              <span>Assistant</span>
            </div>
          </div>
          <div className="topbar-right">
            <button className="icon-button" type="button" aria-label="Search">
              <Search size={18} />
            </button>
            <button className="icon-button" type="button" aria-label="Voice input">
              <Mic size={18} />
            </button>
          </div>
        </header>

        <section className="upper-tabs" aria-label="Reference panels">
          <nav className="tab-bar" aria-label="Open reference information in a new browser tab">
            <button
              className="tab"
              type="button"
              onClick={() => openInfoTab("journey")}
            >
              <Bot size={16} />
              Election Journey
            </button>
            <button
              className="tab"
              type="button"
              onClick={() => openInfoTab("myths")}
            >
              <Languages size={16} />
              Myth vs Fact
            </button>
            <button
              className="tab"
              type="button"
              onClick={() => openInfoTab("safety")}
            >
              <ShieldCheck size={16} />
              Safety Rule
            </button>
          </nav>
        </section>

        <section className={isFreshThread ? "content-shell fresh-layout" : "content-shell"}>
          <section className="chat-column">
            <section className="assistant-panel" id="assistant" aria-label="CivicGuide chat">
              <div className={isFreshThread ? "messages fresh" : "messages"} aria-live="polite">
                {isFreshThread ? (
                  <section className="fresh-thread">
                    <div className="fresh-thread-icon">
                      <Sparkles size={18} />
                    </div>
                    <h1>CivicGuide Assistant</h1>
                    <p>Neutral election guidance with a cleaner, step-by-step conversation flow.</p>
                    <div className="fresh-thread-prompts">
                      {primaryPrompts.map((prompt) => (
                        <button key={prompt} type="button" onClick={() => void submitQuestion(prompt)}>
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </section>
                ) : (
                  <>
                    {messages.map((message) => (
                      <article className={`message ${message.role}`} key={message.id}>
                        <div className="message-meta">
                          <div className="message-avatar">
                            {message.role === "assistant" ? <Sparkles size={14} /> : "R"}
                          </div>
                          <span>{message.label}</span>
                        </div>
                        <p>{message.text}</p>
                      </article>
                    ))}
                    {isThinking && (
                      <article className="message assistant">
                        <div className="message-meta">
                          <div className="message-avatar">
                            <Sparkles size={14} />
                          </div>
                          <span>CivicGuide</span>
                        </div>
                        <p>Thinking through the safest and clearest response...</p>
                      </article>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <form className="composer" onSubmit={askAssistant}>
                <div className="composer-shell">
                  <input
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Message CivicGuide..."
                    aria-label="Ask CivicGuide AI"
                  />
                  <div className="composer-actions">
                    <button className="mini-action" type="button">
                      <Search size={16} />
                      Search
                    </button>
                    <button className="send-button" type="submit" aria-label="Send question">
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </form>
            </section>
          </section>

          {!isFreshThread && (
            <aside className="utility-column" aria-label="Readiness and actions">
            <section className="utility-card">
              <div className="card-head">
                <CheckCircle2 size={18} />
                <h2>Readiness</h2>
              </div>
              <div className="progress-bar" aria-label={`${progress}% ready`}>
                <span style={{ width: `${progress}%` }} />
              </div>
              <p className="muted">{progress}% prepared based on the current journey.</p>
              <ul className="check-list">
                {readinessChecks.map((item, index) => (
                  <li className={index < 2 ? "checked" : ""} key={item}>
                    <FileCheck2 size={14} />
                    {item}
                  </li>
                ))}
              </ul>
              <button className="primary-button" type="button" onClick={() => void handleSaveJourney()}>
                <FileCheck2 size={16} />
                Save my journey
              </button>
              <p className="save-status">{saveStatus}</p>
            </section>

            <section className="utility-card">
              <div className="card-head">
                <MapPin size={18} />
                <h2>Google Actions</h2>
              </div>
              <a href={calendarUrl} target="_blank" rel="noreferrer" className="action-link">
                <CalendarPlus size={16} />
                Add readiness reminder
              </a>
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="action-link">
                <MapPin size={16} />
                Search nearby office
              </a>
            </section>

            <section className="utility-card">
              <div className="card-head">
                <ExternalLink size={18} />
                <h2>Official Lookup</h2>
              </div>
              <input
                value={sourceQuery}
                onChange={(event) => setSourceQuery(event.target.value)}
                placeholder="Search forms, status, polling..."
                aria-label="Search official election sources"
              />
              <div className="source-list">
                {matchedSources.map((source) => (
                  <a href={source.url} key={source.url} target="_blank" rel="noreferrer">
                    <strong>{source.title}</strong>
                    <span>{source.description}</span>
                  </a>
                ))}
                </div>
              </section>
            </aside>
          )}
        </section>

      </section>
    </main>
  );
}

export default App;
