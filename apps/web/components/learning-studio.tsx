"use client";

import { useEffect, useRef, useState } from "react";
import { sampleExperience } from "../lib/sample-experience";
import { ExperiencePlayer } from "./experience-player";
import { LearningJourneyPanel } from "./learning-journey-panel";

type View = "discover" | "journey" | "notebook" | "connect";

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

function FractionArt({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={small ? "fraction-art small" : "fraction-art"}
      viewBox="0 0 520 360"
      fill="none"
      role="img"
      aria-label="A playful landscape of whole, half and quarter building blocks"
    >
      <ellipse
        cx="270"
        cy="290"
        rx="200"
        ry="38"
        fill="#173d35"
        opacity=".09"
      />
      <path d="M83 183 258 88 438 183 263 282Z" fill="#dce6cc" />
      <path d="M83 183v18l180 98v-17Z" fill="#b2c4a4" />
      <path d="m263 282 175-99v18l-175 98Z" fill="#c4d3b5" />
      <path d="m142 153 85-46 86 46-85 47Z" fill="#f8d6aa" />
      <path d="m142 153 86 47v48l-86-47Z" fill="#d59666" />
      <path d="m228 200 85-47v48l-85 47Z" fill="#edb985" />
      <path d="m254 125 42-23 42 23-42 24Z" fill="#fbf4df" />
      <path d="m254 125 42 24v57l-42-24Z" fill="#c4cba9" />
      <path d="m296 149 42-24v57l-42 24Z" fill="#e5e7cb" />
      <path d="m305 153 42-23 43 23-43 24Z" fill="#fbf4df" />
      <path d="m305 153 42 24v57l-42-24Z" fill="#c4cba9" />
      <path d="m347 177 43-24v57l-43 24Z" fill="#e5e7cb" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${185 + i * 31} ${221 + i * 1})`}>
          <path d="m0 0 26-14 26 14-26 15Z" fill="#77a89b" />
          <path d="m0 0 26 15v24L0 24Z" fill="#35685a" />
          <path d="m26 15 26-15v24L26 39Z" fill="#528575" />
        </g>
      ))}
      <circle
        cx="126"
        cy="90"
        r="20"
        stroke="#d59666"
        strokeWidth="2"
        strokeDasharray="3 6"
      />
      <path
        d="M398 84v22m-11-11h22M102 253v16m-8-8h16"
        stroke="#5b8471"
        strokeWidth="2"
      />
      <circle cx="396" cy="257" r="5" fill="#edb985" />
      <text
        x="103"
        y="147"
        fill="#517564"
        fontSize="18"
        fontFamily="Georgia, serif"
        transform="rotate(-16 103 147)"
      >
        1
      </text>
      <text
        x="347"
        y="103"
        fill="#517564"
        fontSize="18"
        fontFamily="Georgia, serif"
        transform="rotate(12 347 103)"
      >
        ½
      </text>
      <text
        x="350"
        y="281"
        fill="#517564"
        fontSize="18"
        fontFamily="Georgia, serif"
        transform="rotate(8 350 281)"
      >
        ¼
      </text>
    </svg>
  );
}

export function LearningStudio() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [view, setView] = useState<View>("discover");
  const [objective, setObjective] = useState(
    "How do small pieces make a whole?",
  );
  const [started, setStarted] = useState(false);
  const [journeyQuestion, setJourneyQuestion] = useState("");
  const [observed, setObserved] = useState<string[]>([]);
  const [reflection, setReflection] = useState("");
  const [saved, setSaved] = useState(false);
  const [paused, setPaused] = useState(false);
  const [guide, setGuide] = useState(false);
  const [rating, setRating] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);

  function navigate(next: View) {
    setView(next);
    requestAnimationFrame(() => {
      heading.current?.focus();
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  }
  function begin() {
    if (!started) setJourneyQuestion(objective);
    setStarted(true);
    navigate("journey");
  }
  const stage = saved ? 3 : observed.length ? 2 : started ? 1 : 0;

  return (
    <div className="learn-app">
      <a className="learn-skip" href="#studio-content">
        Skip to content
      </a>
      <aside className="studio-sidebar">
        <a href="/learn" className="studio-brand" aria-label="Headstrong home">
          <span className="brand-symbol" aria-hidden="true">
            h<span>↗</span>
          </span>
          headstrong<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">YOUR LEARNING SPACE</div>
        <nav aria-label="Learning workspace">
          {(
            [
              { id: "discover", icon: "◈", label: "Discover" },
              { id: "journey", icon: "↗", label: "My journey" },
              { id: "notebook", icon: "▤", label: "My notebook" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              disabled={!ready}
              type="button"
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => navigate(item.id)}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
              {item.id === "journey" && started ? (
                <i className="nav-dot" />
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="tiny-spark" aria-hidden="true">
            ✳
          </span>
          <h3>Curiosity comes first.</h3>
          <p>
            No points to chase. No race to finish. Just room to figure things
            out.
          </p>
          <button
            type="button"
            onClick={() => setGuide(!guide)}
            disabled={!ready}
            aria-expanded={guide}
          >
            How this works <span aria-hidden="true">{guide ? "−" : "+"}</span>
          </button>
        </div>
        <button
          className="workspace-connect"
          disabled={!ready}
          type="button"
          onClick={() => navigate("connect")}
        >
          <span aria-hidden="true">◎</span> Connect saved workspace <Arrow />
        </button>
        <div className="sidebar-footer">
          <span className="profile-avatar">E</span>
          <div>
            <strong>Explorer</strong>
            <span>Local sample workspace</span>
          </div>
        </div>
      </aside>
      <div className="studio-main">
        <header className="studio-topbar">
          <span>A little curiosity goes a long way.</span>
          <div>
            <span className="preview-pill">
              <i /> PRIVATE PREVIEW
            </span>
            <button
              type="button"
              className="guide-button"
              disabled={!ready}
              aria-label="Toggle learning guide"
              aria-expanded={guide}
              onClick={() => setGuide(!guide)}
            >
              ?
            </button>
          </div>
        </header>
        <main id="studio-content" className="studio-content">
          {guide ? (
            <section className="studio-guide">
              <div>
                <strong>Your space to try things.</strong>
                <p>
                  Choose a question, inspect the 3D blocks, and write what you
                  notice. This sample stays in this tab and disappears on
                  reload. It is not an assessment. Use a provisioned account in
                  the saved workspace for the real guardian-approved workflow.
                  Synthetic data only.
                </p>
              </div>
              <button
                aria-label="Close guide"
                type="button"
                onClick={() => setGuide(false)}
              >
                ×
              </button>
            </section>
          ) : null}
          {view === "discover" ? (
            <>
              <div className="page-heading">
                <p className="studio-eyebrow">FOLLOW YOUR CURIOSITY</p>
                <h1 ref={heading} tabIndex={-1}>
                  What will you discover today?
                </h1>
                <p>Start with a question. See where it takes you.</p>
              </div>
              <section className="discovery-hero">
                <div className="hero-copy">
                  <span className="hero-tag">
                    <span aria-hidden="true">✳</span> A SMALL QUESTION. A NEW
                    PERSPECTIVE.
                  </span>
                  <h2>
                    Big ideas start
                    <br />
                    with little pieces.
                  </h2>
                  <p>
                    Step inside a world of fractions. Explore, make connections,
                    and find your own way to the whole picture.
                  </p>
                  <button
                    className="studio-primary"
                    disabled={!ready}
                    type="button"
                    onClick={begin}
                  >
                    {started ? "Continue exploring" : "Explore the sample"}
                    <Arrow />
                  </button>
                  <span className="hero-footnote">
                    10 minutes · Interactive 3D · This tab only, not saved
                    online
                  </span>
                </div>
                <div className="hero-art">
                  <FractionArt />
                  <span className="art-caption">
                    A different way to see the whole.
                  </span>
                </div>
              </section>
              <section className="discovery-lower">
                <div className="question-card">
                  <div className="section-heading">
                    <h2>Make it your question</h2>
                    <span>01 / BEGIN WITH WHY</span>
                  </div>
                  <p>What would you like to understand about fractions?</p>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      begin();
                    }}
                  >
                    <label className="sr-only" htmlFor="sample-objective">
                      Your learning question
                    </label>
                    <textarea
                      id="sample-objective"
                      disabled={!ready || started}
                      value={objective}
                      onChange={(e) => setObjective(e.target.value)}
                      minLength={5}
                      maxLength={500}
                      required
                    />
                    <div className="question-actions">
                      <span>Nothing to get right. Just be curious.</span>
                      <button
                        disabled={!ready}
                        type="submit"
                        className="studio-text-button"
                      >
                        {started
                          ? "Continue my journey"
                          : "Follow this question"}{" "}
                        <Arrow />
                      </button>
                    </div>
                  </form>
                  <div className="question-prompts">
                    <span>Need a spark?</span>
                    {[
                      "Why are two halves the same as four quarters?",
                      "What makes a share fair?",
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        disabled={!ready || started}
                        type="button"
                        onClick={() => setObjective(prompt)}
                      >
                        {prompt} <span aria-hidden="true">+</span>
                      </button>
                    ))}
                  </div>
                </div>
                <aside className="journey-preview">
                  <span className="studio-eyebrow">THE WAY WE LEARN</span>
                  <h2>Your path, not a checklist.</h2>
                  <ol>
                    <li>
                      <span>01</span>
                      <div>
                        <strong>Wonder</strong>
                        <p>A question worth following.</p>
                      </div>
                    </li>
                    <li>
                      <span>02</span>
                      <div>
                        <strong>Explore</strong>
                        <p>Try it. Turn it over. Notice something.</p>
                      </div>
                    </li>
                    <li>
                      <span>03</span>
                      <div>
                        <strong>Make meaning</strong>
                        <p>Put your discoveries into words.</p>
                      </div>
                    </li>
                  </ol>
                  <p className="mentor-note">
                    In a connected workspace, your assigned educator helps you
                    reflect on what comes next.
                  </p>
                </aside>
              </section>
            </>
          ) : view === "connect" ? (
            <>
              <div className="page-heading">
                <p className="studio-eyebrow">PROVISIONED ACCOUNTS ONLY</p>
                <h1 ref={heading} tabIndex={-1}>
                  Your saved workspace
                </h1>
                <p>
                  Connect a synthetic learner, guardian, or educator account.
                  Access sign-in alone does not assign a learning role.
                </p>
              </div>
              <div className="connection-explainer">
                <strong>A protected connection, not an open demo login.</strong>
                <p>
                  An operator provides a short-lived token. No real learner
                  data. Tokens stay in this tab’s memory; local sample notes are
                  never sent here.
                </p>
                <button
                  className="studio-text-button"
                  type="button"
                  onClick={() => navigate("discover")}
                >
                  ← Back to the sample
                </button>
              </div>
              <LearningJourneyPanel />
            </>
          ) : view === "notebook" ? (
            <>
              <div className="page-heading">
                <p className="studio-eyebrow">THINKING, IN YOUR OWN WORDS</p>
                <h1 ref={heading} tabIndex={-1}>
                  My notebook
                </h1>
                <p>A little space for the things you notice.</p>
              </div>
              {saved ? (
                <article className="notebook-entry">
                  <span className="entry-label">LOCAL SAMPLE · FRACTIONS</span>
                  <h2>{journeyQuestion}</h2>
                  <blockquote>{reflection}</blockquote>
                  <div className="entry-meta">
                    {observed.length} pieces inspected · Not reviewed by an
                    educator
                  </div>
                  <button
                    className="studio-text-button"
                    type="button"
                    onClick={() => navigate("journey")}
                  >
                    Return to my journey <Arrow />
                  </button>
                </article>
              ) : (
                <section className="studio-empty">
                  <span aria-hidden="true">✎</span>
                  <h2>Every discovery starts somewhere.</h2>
                  <p>
                    Explore the fraction blocks, then capture what you notice.
                    Your first reflection will appear here for this tab only.
                  </p>
                  <button
                    className="studio-primary"
                    type="button"
                    onClick={begin}
                  >
                    Explore the sample <Arrow />
                  </button>
                </section>
              )}
            </>
          ) : (
            <>
              <div className="page-heading journey-title">
                <div>
                  <p className="studio-eyebrow">YOUR FRACTIONS EXPLORATION</p>
                  <h1 ref={heading} tabIndex={-1}>
                    The whole picture
                  </h1>
                  <p>{journeyQuestion}</p>
                </div>
                <span className="local-label">
                  Local sample · not saved online
                </span>
              </div>
              {!started ? (
                <section className="studio-empty">
                  <FractionArt small />
                  <h2>A question is all you need.</h2>
                  <p>
                    Explore how whole, half, and quarter pieces relate. You set
                    the pace.
                  </p>
                  <button
                    className="studio-primary"
                    type="button"
                    onClick={begin}
                  >
                    Start exploring <Arrow />
                  </button>
                </section>
              ) : (
                <>
                  <ol
                    className="journey-progress"
                    aria-label="Journey progress"
                  >
                    {["Your question", "Explore", "Reflect", "Next steps"].map(
                      (label, index) => (
                        <li
                          key={label}
                          aria-current={index === stage ? "step" : undefined}
                          data-complete={index < stage}
                        >
                          <span>{index < stage ? "✓" : `0${index + 1}`}</span>
                          {label}
                        </li>
                      ),
                    )}
                  </ol>
                  <div className="exploration-layout">
                    <div className="exploration-main">
                      {!saved ? (
                        <>
                          {!paused ? (
                            <ExperiencePlayer
                              spec={sampleExperience}
                              initialObserved={observed}
                              localOnly
                              onObserve={(id) =>
                                setObserved((ids) =>
                                  ids.includes(id) ? ids : [...ids, id],
                                )
                              }
                            />
                          ) : (
                            <section className="studio-empty">
                              <h2>Take your time.</h2>
                              <p>
                                Your notes are still here. Come back when you’re
                                ready.
                              </p>
                            </section>
                          )}
                          <div className="exploration-toolbar">
                            <span>{observed.length} of 7 pieces inspected</span>
                            <button
                              type="button"
                              className="studio-text-button"
                              onClick={() => setPaused(!paused)}
                            >
                              {paused
                                ? "Resume exploration"
                                : "Pause exploration"}{" "}
                              {paused ? "→" : "Ⅱ"}
                            </button>
                          </div>
                          <section className="reflection-card">
                            <span className="studio-eyebrow">
                              MAKE IT YOURS
                            </span>
                            <h2>What did you notice?</h2>
                            <p>
                              Try explaining how the pieces connect. There’s no
                              need for a perfect answer.
                            </p>
                            <form
                              onSubmit={(event) => {
                                event.preventDefault();
                                setSaved(true);
                              }}
                            >
                              <label
                                className="sr-only"
                                htmlFor="sample-reflection"
                              >
                                Your reflection
                              </label>
                              <textarea
                                id="sample-reflection"
                                value={reflection}
                                onChange={(e) => setReflection(e.target.value)}
                                placeholder="I noticed that…"
                                required
                                minLength={10}
                                maxLength={2000}
                              />
                              <div className="question-actions">
                                <span>
                                  {!observed.length
                                    ? "Inspect a piece before reflecting."
                                    : "Your words. Your perspective."}
                                </span>
                                <button
                                  className="studio-primary"
                                  type="submit"
                                  disabled={observed.length === 0 || paused}
                                >
                                  Keep in my notebook <Arrow />
                                </button>
                              </div>
                            </form>
                          </section>
                        </>
                      ) : (
                        <section className="reflection-complete">
                          <span className="completion-mark" aria-hidden="true">
                            ✓
                          </span>
                          <p className="studio-eyebrow">
                            A DISCOVERY WORTH KEEPING
                          </p>
                          <h2>You made a connection.</h2>
                          <p>
                            Your reflection is in your local notebook for this
                            tab. It has not been submitted or assessed.
                          </p>
                          <blockquote>{reflection}</blockquote>
                          <button
                            className="studio-primary"
                            type="button"
                            onClick={() => navigate("notebook")}
                          >
                            Open my notebook <Arrow />
                          </button>
                          <div className="sample-feedback">
                            <span className="studio-eyebrow">
                              A QUESTION TO TAKE WITH YOU
                            </span>
                            <p>
                              “If the pieces were a different shape, would two
                              halves still make a whole? How could you show it?”
                            </p>
                            <span>
                              A sample reflection prompt, not educator feedback.
                            </span>
                          </div>
                          <fieldset className="optional-checkin">
                            <legend>
                              How did exploring feel?{" "}
                              <span>Optional · local only</span>
                            </legend>
                            {[
                              "Still wondering",
                              "Making connections",
                              "Ready to try more",
                            ].map((value) => (
                              <button
                                key={value}
                                type="button"
                                aria-pressed={rating === value}
                                onClick={() => setRating(value)}
                              >
                                {value}
                              </button>
                            ))}
                            {rating ? (
                              <output>
                                Noted for this tab. This does not affect
                                assessment.
                              </output>
                            ) : null}
                          </fieldset>
                        </section>
                      )}
                    </div>
                    <aside className="exploration-aside">
                      <span className="studio-eyebrow">A LITTLE DIRECTION</span>
                      <h2>Look closer.</h2>
                      <p>
                        Each row adds up to one whole. The pieces get smaller,
                        but the total stays the same.
                      </p>
                      <div className="wonder-prompt">
                        <span aria-hidden="true">✳</span>
                        <h3>Something to wonder</h3>
                        <p>
                          How many quarters would you need to match one half?
                        </p>
                      </div>
                      <h3>Your pace. Your space.</h3>
                      <p>
                        Click a block or use the labelled inspection buttons.
                        You can pause whenever you like.
                      </p>
                      <hr />
                      <p className="privacy-note">
                        This is a local sample, not proof of mastery. Nothing
                        here is sent to an educator. Reloading clears this
                        workspace.
                      </p>
                      <button
                        type="button"
                        className="studio-text-button"
                        onClick={() => navigate("discover")}
                      >
                        ← Back to discover
                      </button>
                    </aside>
                  </div>
                </>
              )}
            </>
          )}
          <footer className="studio-page-footer">
            <span className="footer-wordmark">headstrong.</span>
            <span>Learner-led. Human-supported.</span>
            <span>Synthetic sample · No real learner data</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
