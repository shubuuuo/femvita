"use client";
import { useEffect, useRef, useState } from "react";
import Card from "../../components/Card";
import {
  api,
  type Challenge,
  type ChallengeDay,
  type HealthTopics,
  type MealDetail,
  type Move,
  type Nutrition,
  type Phase,
} from "../../lib/api";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Session = {
  id: string;
  title: string;
  minutes: number;
  summary: string;
  steps: string[];
};

// General relaxation guidance written for FemVita (no API involved)
const SESSIONS: Session[] = [
  {
    id: "mindful-breath",
    title: "Mindful Breath",
    minutes: 5,
    summary: "A short reset you can do anywhere.",
    steps: [
      "Sit comfortably with your back supported and your hands resting in your lap.",
      "Close your eyes, or soften your gaze toward the floor.",
      "Breathe in gently through your nose for about four counts, then out slowly for about six.",
      "Pick one spot where you feel the breath (nostrils, chest or belly) and stay with it.",
      "When your mind wanders, notice it without judging and bring your attention back to the breath.",
      "In the last minute, let your breathing return to normal before opening your eyes.",
      "If you ever feel lightheaded, stop counting and breathe normally.",
    ],
  },
  {
    id: "body-scan",
    title: "Body Scan",
    minutes: 10,
    summary: "Move your attention slowly through the body.",
    steps: [
      "Lie down or sit comfortably, and let your arms rest at your sides.",
      "Take three slow breaths to settle in.",
      "Bring attention to your toes and feet. Just notice what you feel: warmth, pressure, tingling, nothing at all.",
      "Move slowly upward: calves, knees, thighs, hips, belly, chest.",
      "Continue through your hands, arms, shoulders, neck and face.",
      "If you find tension, breathe toward that spot and let it soften if it wants to. There is nothing to fix.",
      "Finish by feeling your whole body at once, then open your eyes when you're ready.",
    ],
  },
  {
    id: "sleep-meditation",
    title: "Sleep Meditation",
    minutes: 15,
    summary: "Wind down before bed.",
    steps: [
      "Dim the lights, lower your screen brightness and get comfortable in bed.",
      "Let your breathing slow down, with a little longer out-breath than in-breath.",
      "Relax your body from the top down: forehead, jaw, shoulders, arms, belly, legs, feet.",
      "Count each out-breath from one to ten, then start again. If you lose count, simply begin at one.",
      "Imagine a calm, safe place and notice its sounds, colours and temperature.",
      "If you're still awake when the timer ends, just rest. Lying quietly is also good for you.",
    ],
  },
];

export default function WellnessHub() {
  return (
    <div className="space-y-6">
      <WeeklyChallenge />
      <Mindfulness />
      <KnowledgeBase />
      <NutritionCorner />
      <FitnessMoves />
    </div>
  );
}

// ---------------- Weekly challenge ----------------
function WeeklyChallenge() {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<Challenge>("/api/wellness/challenge")
      .then((c) => {
        if (!cancelled) setChallenge(c);
      })
      .catch(() => {
        if (!cancelled)
          setError("Can't load the challenge. Is the backend running?");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(day: ChallengeDay) {
    setSaving(true);
    setError(null);
    try {
      const updated = await api<Challenge>(
        `/api/wellness/challenge/checkin/${day.date}`,
        {
          method: "PUT",
          body: JSON.stringify({ done: !day.done }),
        },
      );
      setChallenge(updated); // the server sends back the whole updated week
    } catch {
      setError("Couldn't save that day. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!challenge) {
    return (
      <Card>
        <p className="text-sm text-gray-500">{error ?? "Loading…"}</p>
      </Card>
    );
  }

  const pct = (challenge.completed / challenge.target) * 100;

  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-[#B19CD9]">
        Weekly Wellness Challenge
      </p>
      <h2 className="mt-1 text-xl font-semibold text-[#4F4F4F]">
        {challenge.title}
      </h2>
      <p className="text-sm text-gray-500">{challenge.description}</p>

      <div className="mt-4 flex items-center justify-between text-sm text-[#4F4F4F]">
        <span>
          {challenge.completed} of {challenge.target} days complete
        </span>
        {challenge.completed === challenge.target && (
          <span>🌸 Challenge complete!</span>
        )}
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#EEDDFF]">
        <div
          className="h-full rounded-full bg-[#B19CD9] transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-5 grid grid-cols-7 gap-2">
        {challenge.days.map((day, i) => (
          <button
            key={day.date}
            onClick={() => toggle(day)}
            disabled={day.is_future || saving}
            aria-pressed={day.done}
            aria-label={`${WEEKDAY_LABELS[i]}: ${day.done ? "done" : "not done"}`}
            className="flex flex-col items-center gap-1 disabled:opacity-40"
          >
            <span className="text-xs text-gray-500">{WEEKDAY_LABELS[i]}</span>
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm ${
                day.done
                  ? "border-[#B19CD9] bg-[#B19CD9] text-white"
                  : day.is_today
                    ? "border-[#B19CD9] text-[#B19CD9]"
                    : "border-gray-200 text-[#4F4F4F]"
              }`}
            >
              {day.done ? "✓" : Number(day.date.slice(8))}
            </span>
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
    </Card>
  );
}

// ---------------- Mindfulness ----------------
function Mindfulness() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = SESSIONS.find((s) => s.id === activeId) ?? null;

  return (
    <Card>
      <h2 className="text-xl font-semibold text-[#4F4F4F]">
        Mindfulness &amp; Meditation
      </h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {SESSIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveId(s.id === activeId ? null : s.id)}
            className={`rounded-2xl border-2 p-4 text-left transition-colors ${
              s.id === activeId
                ? "border-[#B19CD9] bg-[#EEDDFF]"
                : "border-gray-200 hover:bg-[#EEDDFF]/40"
            }`}
          >
            <p className="text-lg font-semibold text-[#B19CD9]">
              {s.minutes} min
            </p>
            <p className="font-medium text-[#4F4F4F]">{s.title}</p>
            <p className="mt-1 text-xs text-gray-500">{s.summary}</p>
          </button>
        ))}
      </div>

      {active && <SessionPlayer key={active.id} session={active} />}

      <p className="mt-4 text-xs text-gray-500">
        General relaxation guidance, not medical advice. Stop any exercise that
        feels uncomfortable.
      </p>
    </Card>
  );
}

function SessionPlayer({ session }: { session: Session }) {
  const total = session.minutes * 60;
  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(false);
  const endAtRef = useRef(0);

  // Count down against the clock (not "minus 1 per tick"), so it stays accurate in background tabs
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const left = Math.max(
        0,
        Math.ceil((endAtRef.current - Date.now()) / 1000),
      );
      setRemaining(left);
      if (left === 0) setRunning(false);
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  const start = () => {
    endAtRef.current = Date.now() + remaining * 1000;
    setRunning(true);
  };
  const reset = () => {
    setRunning(false);
    setRemaining(total);
  };

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const finished = remaining === 0;

  return (
    <div className="mt-5 rounded-2xl bg-[#EEDDFF]/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-[#4F4F4F]">{session.title}</h3>
          <p className="text-3xl font-semibold tabular-nums text-[#B19CD9]">
            {finished ? "Well done 🌸" : `${mm}:${ss}`}
          </p>
        </div>
        <div className="flex gap-2">
          {!finished && (
            <button
              onClick={running ? () => setRunning(false) : start}
              className="rounded-full bg-[#B19CD9] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              {running ? "Pause" : remaining === total ? "Start" : "Resume"}
            </button>
          )}
          <button
            onClick={reset}
            className="rounded-full border border-gray-300 px-5 py-2 text-sm text-[#4F4F4F] hover:bg-white"
          >
            Reset
          </button>
        </div>
      </div>

      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[#4F4F4F]">
        {session.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  );
}

// ---------------- Small data-fetching hook (used by the three API sections) ----------------
function useApi<T>(path: string | null) {
  const [res, setRes] = useState<{
    path: string | null;
    data: T | null;
    failed: boolean;
  }>({
    path: null,
    data: null,
    failed: false,
  });

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    api<T>(path)
      .then((data) => {
        if (!cancelled) setRes({ path, data, failed: false });
      })
      .catch(() => {
        if (!cancelled) setRes({ path, data: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  // Old data stays on screen while the next request is loading
  const loading = path !== null && res.path !== path;
  return { data: res.data, loading, failed: res.path === path && res.failed };
}

// ---------------- Knowledge base (MedlinePlus) ----------------
const TOPICS = [
  { label: "Menstruation", term: "menstruation" },
  { label: "PCOS", term: "polycystic ovary syndrome" },
  { label: "Sleep", term: "sleep" },
  { label: "Stress", term: "stress" },
];

function KnowledgeBase() {
  const [term, setTerm] = useState(TOPICS[0].term);
  const [draft, setDraft] = useState("");
  const { data, loading, failed } = useApi<HealthTopics>(
    `/api/wellness/health-topics?q=${encodeURIComponent(term)}`,
  );

  function search(e: React.FormEvent) {
    e.preventDefault();
    if (draft.trim().length >= 2) setTerm(draft.trim());
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold text-[#4F4F4F]">Knowledge Base</h2>

      <div className="mt-3 flex flex-wrap gap-2">
        {TOPICS.map((t) => (
          <button
            key={t.term}
            onClick={() => {
              setTerm(t.term);
              setDraft("");
            }}
            className={`rounded-full px-4 py-1.5 text-sm ${
              term === t.term
                ? "bg-[#B19CD9] text-white"
                : "bg-[#EEDDFF] text-[#4F4F4F] hover:opacity-80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={search} className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={60}
          placeholder="Search a health topic…"
          className="min-w-0 flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm"
        />
        <button className="rounded-full bg-[#B19CD9] px-5 py-2 text-sm font-medium text-white hover:opacity-90">
          Search
        </button>
      </form>

      <div className={`mt-4 space-y-4 ${loading ? "opacity-50" : ""}`}>
        {failed && (
          <p className="text-sm text-red-500">
            Couldn&apos;t load health information right now.
          </p>
        )}
        {data && data.topics.length === 0 && !failed && (
          <p className="text-sm text-gray-500">
            No MedlinePlus topics found for “{data.term}”.
          </p>
        )}
        {data?.topics.map((t) => (
          <article
            key={t.url}
            className="rounded-2xl border border-gray-200 p-4"
          >
            <h3 className="font-semibold text-[#4F4F4F]">{t.title}</h3>
            <p className="mt-1 text-sm text-gray-600">{t.summary}</p>
            <a
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-medium text-[#B19CD9] hover:underline"
            >
              Read more on MedlinePlus.gov →
            </a>
          </article>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Health information from{" "}
        <a
          href="https://medlineplus.gov/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          MedlinePlus.gov
        </a>{" "}
        (U.S. National Library of Medicine). General information, not medical
        advice.
      </p>
    </Card>
  );
}

// ---------------- Nutrition (TheMealDB) ----------------
const PHASES: { key: Phase; label: string }[] = [
  { key: "menstrual", label: "Menstrual" },
  { key: "follicular", label: "Follicular" },
  { key: "ovulatory", label: "Ovulatory" },
  { key: "luteal", label: "Luteal" },
];

function NutritionCorner() {
  const [phase, setPhase] = useState<Phase | null>(null); // null = let the server pick from your logs
  const [vegetarian, setVegetarian] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const qs = new URLSearchParams();
  if (phase) qs.set("phase", phase);
  if (vegetarian) qs.set("vegetarian", "true");
  const nutrition = useApi<Nutrition>(`/api/wellness/nutrition?${qs}`);
  const recipe = useApi<MealDetail>(
    openId ? `/api/wellness/meals/${openId}` : null,
  );

  const data = nutrition.data;

  return (
    <Card>
      <h2 className="text-xl font-semibold text-[#4F4F4F]">Nutrition Corner</h2>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {PHASES.map((p) => (
          <button
            key={p.key}
            onClick={() => {
              setPhase(p.key);
              setOpenId(null);
            }}
            className={`rounded-full px-4 py-1.5 text-sm ${
              data?.phase === p.key
                ? "bg-[#B19CD9] text-white"
                : "bg-[#EEDDFF] text-[#4F4F4F] hover:opacity-80"
            }`}
          >
            {p.label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm text-[#4F4F4F]">
          <input
            type="checkbox"
            checked={vegetarian}
            onChange={(e) => {
              setVegetarian(e.target.checked);
              setOpenId(null);
            }}
          />
          Vegetarian
        </label>
      </div>

      {nutrition.failed && (
        <p className="mt-4 text-sm text-red-500">
          Couldn&apos;t load recipes right now.
        </p>
      )}

      {data && (
        <div className={nutrition.loading ? "opacity-50" : ""}>
          <p className="mt-4 text-sm text-gray-600">
            <span className="font-medium text-[#4F4F4F]">
              {data.label} phase.
            </span>{" "}
            {data.why}
          </p>
          {!data.detected && (
            <p className="mt-1 text-xs text-gray-500">
              {phase
                ? "Showing the phase you picked."
                : "Log a few periods in the Cycle Tracker and this will follow your cycle automatically."}
            </p>
          )}

          {data.meals.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              No recipes found for this combination.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {data.meals.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setOpenId(m.id === openId ? null : m.id)}
                  className={`overflow-hidden rounded-2xl border-2 text-left ${
                    m.id === openId
                      ? "border-[#B19CD9]"
                      : "border-gray-200 hover:border-[#B19CD9]/60"
                  }`}
                >
                  {m.thumb && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.thumb}
                      alt=""
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  )}
                  <p className="p-2 text-sm font-medium text-[#4F4F4F]">
                    {m.name}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {openId && recipe.data && recipe.data.id === openId && (
        <div className="mt-5 rounded-2xl bg-[#EEDDFF]/40 p-5">
          <h3 className="font-semibold text-[#4F4F4F]">{recipe.data.name}</h3>
          <p className="text-xs text-gray-500">
            {[recipe.data.category, recipe.data.area]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <ul className="space-y-1 text-sm text-[#4F4F4F]">
              {recipe.data.ingredients.map((ing) => (
                <li key={ing.name}>
                  <span className="text-gray-500">{ing.measure}</span>{" "}
                  {ing.name}
                </li>
              ))}
            </ul>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-[#4F4F4F]">
              {recipe.data.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
          {(recipe.data.youtube_url || recipe.data.source_url) && (
            <p className="mt-3 space-x-4 text-sm">
              {recipe.data.youtube_url && (
                <a
                  href={recipe.data.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#B19CD9] hover:underline"
                >
                  Watch video
                </a>
              )}
              {recipe.data.source_url && (
                <a
                  href={recipe.data.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#B19CD9] hover:underline"
                >
                  Original recipe
                </a>
              )}
            </p>
          )}
        </div>
      )}
      {openId && recipe.failed && (
        <p className="mt-3 text-sm text-red-500">
          Couldn&apos;t load that recipe.
        </p>
      )}

      <p className="mt-4 text-xs text-gray-500">
        Recipes from{" "}
        <a
          href="https://www.themealdb.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          TheMealDB
        </a>
        . Eating by cycle phase is a popular idea, but research on it is
        limited, so treat these as inspiration rather than a prescription. If
        you have allergies or a medical condition, check the ingredients and ask
        your doctor or dietitian.
      </p>
    </Card>
  );
}

// ---------------- Fitness (wger) ----------------
function FitnessMoves() {
  const { data, loading, failed } = useApi<Move[]>("/api/wellness/moves");
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <Card>
      <h2 className="text-xl font-semibold text-[#4F4F4F]">
        Gentle Morning Moves
      </h2>
      <p className="text-sm text-gray-500">
        Low-impact, no-jumping moves. Try about 30–40 seconds each, then go
        round again if it feels good.
      </p>

      {loading && !data && (
        <p className="mt-4 text-sm text-gray-500">Loading…</p>
      )}
      {failed && (
        <p className="mt-4 text-sm text-red-500">
          Couldn&apos;t load exercises right now.
        </p>
      )}
      {data && data.length === 0 && (
        <p className="mt-4 text-sm text-gray-500">
          No exercises found right now.
        </p>
      )}

      <div className="mt-4 space-y-3">
        {data?.map((m, i) => (
          <article
            key={m.id}
            className="rounded-2xl border border-gray-200 p-4"
          >
            <button
              onClick={() => setOpenId(openId === m.id ? null : m.id)}
              aria-expanded={openId === m.id}
              className="flex w-full items-center gap-4 text-left"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEDDFF] text-sm font-semibold text-[#B19CD9]">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-[#4F4F4F]">
                  {m.name}
                </span>
                <span className="block text-xs text-gray-500">
                  {[...m.muscles, ...m.equipment].join(" · ")}
                </span>
              </span>
              <span className="text-[#B19CD9]">
                {openId === m.id ? "−" : "+"}
              </span>
            </button>

            {openId === m.id && (
              <div className="mt-3 grid gap-4 sm:grid-cols-[10rem_1fr]">
                {m.image && (
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.image}
                      alt={m.name}
                      loading="lazy"
                      className="w-full rounded-xl border border-gray-200"
                    />
                    <p className="mt-1 text-[11px] text-gray-500">
                      Image{m.credit ? `: ${m.credit}` : ""} · wger.de
                    </p>
                  </div>
                )}
                <div className="text-sm text-[#4F4F4F]">
                  {m.description && <p>{m.description}</p>}
                  {m.muscles_secondary.length > 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                      Also works: {m.muscles_secondary.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </article>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Exercise data and images from{" "}
        <a
          href="https://wger.de/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          wger.de
        </a>
        , shared under Creative Commons licences. General guidance, not medical
        advice. Stop if anything hurts.
      </p>
    </Card>
  );
}
