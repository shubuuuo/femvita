"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Card from "../../components/Card";
import {
  api,
  type HealthTopic,
  type Metrics,
  type MetricDay,
  type Phase,
  type Post,
  type Summary,
  type Tip,
} from "../../lib/api";
import { DATA_CHANGED } from "../../lib/events";

const PHASE_LABEL: Record<Phase, string> = {
  menstrual: "Menstrual phase",
  follicular: "Follicular phase",
  ovulatory: "Ovulatory phase",
  luteal: "Luteal phase",
};
const PHASE_COLOR: Record<Phase, string> = {
  menstrual: "#FF9AA2",
  follicular: "#EEDDFF",
  ovulatory: "#E2F0CB",
  luteal: "#FFDAC1",
};

// Bumps when something else in the app saves data, so widgets refetch
function useRefreshTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    window.addEventListener(DATA_CHANGED, onChange);
    return () => window.removeEventListener(DATA_CHANGED, onChange);
  }, []);
  return tick;
}

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <CycleHero />
      <TipCard />
      <Habits />
      <div className="grid gap-6 md:grid-cols-2">
        <CommunityCard />
        <ArticleCard />
      </div>
      <UpcomingCard />
    </div>
  );
}

// ---------------- Cycle hero ----------------
function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function CycleHero() {
  const tick = useRefreshTick();
  const [s, setS] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<Summary>("/api/cycle/summary")
      .then((d) => {
        if (!cancelled) {
          setS(d);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled)
          setError("Can't load your cycle. Is the backend running?");
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  if (!s) {
    return (
      <Card>
        <p className="text-sm text-gray-500">{error ?? "Loading…"}</p>
      </Card>
    );
  }

  const {
    cycle_day: day,
    ovulation_day: ov,
    fertile_start: fs,
    fertile_end: fe,
    next_period_in: next,
  } = s;

  // State 1: nothing logged yet
  if (
    !s.has_data ||
    day === null ||
    ov === null ||
    fs === null ||
    fe === null ||
    next === null
  ) {
    return (
      <Card>
        <h2 className="text-xl font-semibold text-[#4F4F4F]">
          Welcome to FemVita 🌸
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Log the first day of your period and your cycle day, predictions and
          fertile window will appear here.
        </p>
        <Link
          href="/cycle-tracker"
          className="mt-4 inline-block rounded-full bg-[#B19CD9] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Open Cycle Tracker
        </Link>
      </Card>
    );
  }

  const late = s.days_late > 0;
  const inFertile = !late && day >= fs && day <= fe;

  const nextText = late
    ? `${plural(s.days_late, "day")} later than estimated`
    : next === 0
      ? "Expected today"
      : `In ${plural(next, "day")}`;

  const toOv = ov - day;
  const ovText =
    late || toOv < 0
      ? "Passed this cycle"
      : toOv === 0
        ? "Today"
        : toOv === 1
          ? "Tomorrow"
          : `In ${toOv} days`;

  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-[#B19CD9]">
        Cycle overview
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-[#4F4F4F]">
        Day {day}
        {!late && s.phase && (
          <span className="text-[#B19CD9]"> · {PHASE_LABEL[s.phase]}</span>
        )}
      </h2>
      {late && (
        <p className="text-sm text-gray-500">
          Your period is a little later than the estimate. Cycles vary
          naturally. Log it when it starts and the estimates will update.
          {s.days_late > 35 &&
            " It's been a while since your last logged period, so these numbers may be out of date."}
        </p>
      )}
      {inFertile && (
        <p className="text-sm text-gray-500">
          Youre in your estimated fertile window.
        </p>
      )}

      <Ribbon
        len={s.avg_cycle_length}
        period={s.avg_period_length}
        ov={ov}
        day={day}
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Next period" value={nextText} />
        <Stat label="Estimated ovulation" value={ovText} />
        <Stat
          label="Estimated fertile window"
          value={`Days ${fs}–${fe}${inFertile ? " (now)" : ""}`}
        />
      </div>

      <p className="mt-4 text-xs text-gray-500">
        {s.cycles_used === 0
          ? "Using a default 28-day cycle until you've logged at least two periods. "
          : `Based on your last ${plural(s.cycles_used, "logged cycle")}. `}
        These are calendar-method estimates. They can be off, and they are not
        for contraception or medical advice.
      </p>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#EEDDFF]/50 px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-[#4F4F4F]">{value}</p>
    </div>
  );
}

function Ribbon({
  len,
  period,
  ov,
  day,
}: {
  len: number;
  period: number;
  ov: number;
  day: number;
}) {
  // Same boundaries as phase_for() in cycle_logic.py
  const mEnd = Math.min(period, len);
  const oStart = Math.max(ov - 1, mEnd + 1);
  const oEnd = Math.min(ov + 1, len);
  const segs: { phase: Phase; days: number }[] = [
    { phase: "menstrual", days: mEnd },
    { phase: "follicular", days: Math.max(oStart - 1 - mEnd, 0) },
    { phase: "ovulatory", days: Math.max(oEnd - oStart + 1, 0) },
    { phase: "luteal", days: Math.max(len - oEnd, 0) },
  ];
  const pos = Math.min(Math.max((day - 0.5) / len, 0), 1) * 100; // a late period pins the marker to the end

  return (
    <div className="mt-6">
      <div className="relative">
        <div className="flex h-4 overflow-hidden rounded-full">
          {segs
            .filter((g) => g.days > 0)
            .map((g) => (
              <div
                key={g.phase}
                style={{ flex: g.days, background: PHASE_COLOR[g.phase] }}
              />
            ))}
        </div>
        <div
          className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-[#B19CD9] shadow"
          style={{ left: `${pos}%` }}
          aria-label={`Today is cycle day ${day}`}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-gray-500">
        <span>Day 1</span>
        <span>Day {len}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        {(Object.keys(PHASE_COLOR) as Phase[]).map((p) => (
          <span key={p} className="flex items-center gap-1">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: PHASE_COLOR[p] }}
            />
            {PHASE_LABEL[p]}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------- Tip card ----------------
function TipCard() {
  const tick = useRefreshTick();
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<Tip>("/api/dashboard/tip")
      .then((t) => {
        if (!cancelled) setTip(t);
      })
      .catch(() => {}); // a failed tip just hides the card
    return () => {
      cancelled = true;
    };
  }, [tick]);

  if (!tip) return null;

  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-[#B19CD9]">
        Todays tip · {tip.label}
      </p>
      <p className="mt-2 text-[#4F4F4F]">{tip.text}</p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link
          href="/wellness-hub"
          className="rounded-full border border-[#B19CD9] px-4 py-1.5 text-[#B19CD9] hover:bg-[#EEDDFF]"
        >
          View recommended moves
        </Link>
        <Link
          href="/wellness-hub"
          className="rounded-full border border-[#B19CD9] px-4 py-1.5 text-[#B19CD9] hover:bg-[#EEDDFF]"
        >
          Browse recipes
        </Link>
      </div>
    </Card>
  );
}

// ---------------- Habits (Part 2) ----------------
function fmtSleep(min: number) {
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
}
function fmtLitres(ml: number) {
  return `${Number((ml / 1000).toFixed(2))} L`;
}
function dayLetters(date: string) {
  return new Date(`${date}T00:00:00`)
    .toLocaleDateString("en", { weekday: "short" })
    .slice(0, 2);
}

function Habits() {
  const tick = useRefreshTick();
  const [m, setM] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<Metrics>("/api/metrics/week")
      .then((d) => {
        if (!cancelled) {
          setM(d);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Can't load your daily habits.");
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  // Every write returns the whole updated week, so the cards never guess the new totals
  async function run(path: string, options: RequestInit): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      setM(await api<Metrics>(path, options));
      return true;
    } catch {
      setError("Couldn't save that. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const addWater = (ml: number) =>
    run("/api/metrics/water", { method: "POST", body: JSON.stringify({ ml }) });

  function saveToday(
    patch: Partial<Pick<MetricDay, "sleep_minutes" | "steps">>,
  ) {
    const t = m!.days[m!.days.length - 1];
    return run(`/api/metrics/${t.date}`, {
      method: "PUT",
      body: JSON.stringify({
        sleep_minutes: t.sleep_minutes,
        steps: t.steps,
        ...patch,
      }),
    });
  }

  if (!m) {
    return (
      <Card>
        <p className="text-sm text-gray-500">{error ?? "Loading…"}</p>
      </Card>
    );
  }

  const today = m.days[m.days.length - 1];

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-3">
        <SleepCard
          days={m.days}
          goal={m.goals.sleep_minutes}
          busy={busy}
          onSave={(v) => saveToday({ sleep_minutes: v })}
        />
        <WaterCard
          ml={today.hydration_ml}
          goal={m.goals.hydration_ml}
          busy={busy}
          onAdd={addWater}
        />
        <StepsCard
          steps={today.steps}
          goal={m.goals.steps}
          busy={busy}
          onSave={(v) => saveToday({ steps: v })}
        />
      </div>
      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function SleepCard({
  days,
  goal,
  busy,
  onSave,
}: {
  days: MetricDay[];
  goal: number;
  busy: boolean;
  onSave: (v: number | null) => Promise<boolean>;
}) {
  const today = days[days.length - 1];
  const [editing, setEditing] = useState(false);
  const [h, setH] = useState("");
  const [min, setMin] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);
  const max = Math.max(goal, ...days.map((d) => d.sleep_minutes ?? 0));

  function open() {
    const t = today.sleep_minutes;
    setH(t === null ? "" : String(Math.floor(t / 60)));
    setMin(t === null ? "" : String(t % 60));
    setFormErr(null);
    setEditing(true);
  }

  async function submit() {
    if (h === "" && min === "") {
      if (await onSave(null)) setEditing(false); // both blank = clear the entry
      return;
    }
    const hh = Number(h || 0);
    const mm = Number(min || 0);
    const total = hh * 60 + mm;
    if (
      !Number.isInteger(hh) ||
      !Number.isInteger(mm) ||
      hh < 0 ||
      mm < 0 ||
      mm > 59 ||
      total > 1440
    ) {
      setFormErr("Enter hours (0–24) and minutes (0–59).");
      return;
    }
    if (await onSave(total)) setEditing(false);
  }

  return (
    <Card>
      <p className="text-sm font-medium text-[#4F4F4F]">Sleep</p>
      <p className="mt-1 text-3xl font-semibold text-[#B19CD9]">
        {today.sleep_minutes === null ? "—" : fmtSleep(today.sleep_minutes)}
      </p>
      <p className="text-xs text-gray-500">
        {today.sleep_minutes === null
          ? "Last night isn't logged yet"
          : "Last night"}{" "}
        · goal {fmtSleep(goal)}
      </p>

      <div className="mt-4 flex gap-1.5">
        {days.map((d) => (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-16 w-full items-end rounded bg-[#EEDDFF]/40">
              <div
                className="w-full rounded-t bg-[#B19CD9]"
                style={{
                  height: `${((d.sleep_minutes ?? 0) / max) * 100}%`,
                  minHeight: d.sleep_minutes ? 2 : 0,
                }}
                title={
                  d.sleep_minutes === null
                    ? "Not logged"
                    : fmtSleep(d.sleep_minutes)
                }
              />
            </div>
            <span className="text-[10px] text-gray-500">
              {dayLetters(d.date)}
            </span>
          </div>
        ))}
      </div>

      {editing ? (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-[#4F4F4F]">
            <input
              type="number"
              min={0}
              max={24}
              value={h}
              onChange={(e) => setH(e.target.value)}
              className="w-16 rounded-lg border border-gray-300 px-2 py-1"
              aria-label="Hours slept"
            />{" "}
            h
            <input
              type="number"
              min={0}
              max={59}
              value={min}
              onChange={(e) => setMin(e.target.value)}
              className="w-16 rounded-lg border border-gray-300 px-2 py-1"
              aria-label="Minutes slept"
            />{" "}
            m
          </div>
          {formErr && <p className="text-xs text-red-500">{formErr}</p>}
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={busy}
              className="rounded-full bg-[#B19CD9] px-4 py-1.5 text-sm text-white disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-full border border-gray-300 px-4 py-1.5 text-sm text-[#4F4F4F]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={open}
          className="mt-4 rounded-full border border-[#B19CD9] px-4 py-1.5 text-sm text-[#B19CD9] hover:bg-[#EEDDFF]"
        >
          {today.sleep_minutes === null ? "Log sleep" : "Edit"}
        </button>
      )}
    </Card>
  );
}

function WaterCard({
  ml,
  goal,
  busy,
  onAdd,
}: {
  ml: number;
  goal: number;
  busy: boolean;
  onAdd: (ml: number) => Promise<boolean>;
}) {
  const pct = Math.min(ml / goal, 1) * 100;
  return (
    <Card>
      <p className="text-sm font-medium text-[#4F4F4F]">Water</p>
      <div className="mt-2 flex items-center gap-5">
        <div
          className="relative h-24 w-14 overflow-hidden rounded-b-2xl rounded-t-md border-2 border-[#B19CD9]"
          aria-hidden
        >
          <div
            className="absolute bottom-0 w-full bg-[#B19CD9]/70 transition-[height] duration-300"
            style={{ height: `${pct}%` }}
          />
        </div>
        <div>
          <p className="text-3xl font-semibold text-[#B19CD9]">
            {fmtLitres(ml)}
          </p>
          <p className="text-xs text-gray-500">
            of {fmtLitres(goal)} · {Math.round((ml / goal) * 100)}%
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onAdd(250)}
          disabled={busy}
          className="rounded-full bg-[#B19CD9] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          + 250 ml
        </button>
        <button
          onClick={() => onAdd(-250)}
          disabled={busy || ml === 0}
          className="rounded-full border border-gray-300 px-4 py-1.5 text-sm text-[#4F4F4F] disabled:opacity-40"
          aria-label="Undo 250 ml"
        >
          Undo
        </button>
      </div>
    </Card>
  );
}

function StepsCard({
  steps,
  goal,
  busy,
  onSave,
}: {
  steps: number | null;
  goal: number;
  busy: boolean;
  onSave: (v: number | null) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);
  const pct = steps === null ? 0 : steps / goal;
  const r = 40;
  const c = 2 * Math.PI * r;

  function open() {
    setVal(steps === null ? "" : String(steps));
    setFormErr(null);
    setEditing(true);
  }

  async function submit() {
    if (val === "") {
      if (await onSave(null)) setEditing(false);
      return;
    }
    const n = Number(val);
    if (!Number.isInteger(n) || n < 0 || n > 200000) {
      setFormErr("Enter a whole number from 0 to 200,000.");
      return;
    }
    if (await onSave(n)) setEditing(false);
  }

  return (
    <Card>
      <p className="text-sm font-medium text-[#4F4F4F]">Steps</p>
      <div className="mt-2 flex items-center gap-5">
        <div className="relative h-24 w-24 shrink-0">
          <svg
            viewBox="0 0 100 100"
            className="h-24 w-24 -rotate-90"
            aria-hidden
          >
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#EEDDFF"
              strokeWidth="12"
            />
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#B19CD9"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - Math.min(pct, 1))}
              className="transition-[stroke-dashoffset] duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-[#4F4F4F]">
            {steps === null ? "—" : `${Math.round(pct * 100)}%`}
          </div>
        </div>
        <div>
          <p className="text-3xl font-semibold text-[#B19CD9]">
            {steps === null ? "—" : steps.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            of {goal.toLocaleString()} steps
          </p>
        </div>
      </div>

      {editing ? (
        <div className="mt-4 space-y-2">
          <input
            type="number"
            min={0}
            max={200000}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="w-32 rounded-lg border border-gray-300 px-2 py-1 text-sm"
            aria-label="Steps today"
          />
          {formErr && <p className="text-xs text-red-500">{formErr}</p>}
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={busy}
              className="rounded-full bg-[#B19CD9] px-4 py-1.5 text-sm text-white disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-full border border-gray-300 px-4 py-1.5 text-sm text-[#4F4F4F]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            onClick={open}
            className="mt-4 rounded-full border border-[#B19CD9] px-4 py-1.5 text-sm text-[#B19CD9] hover:bg-[#EEDDFF]"
          >
            {steps === null ? "Enter steps" : "Edit"}
          </button>
          <p className="mt-2 text-xs text-gray-500">
            Entered by hand for now. Device sync would be a separate project.
          </p>
        </>
      )}
    </Card>
  );
}

// ---------------- Community highlight ----------------
function CommunityCard() {
  const [post, setPost] = useState<Post | null | undefined>(undefined); // undefined = still loading
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<Post | null>("/api/dashboard/community-highlight")
      .then((p) => {
        if (!cancelled) setPost(p);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-[#B19CD9]">
        Trending in the community
      </p>
      {failed ? (
        <p className="mt-2 text-sm text-gray-500">
          Cant load community posts right now.
        </p>
      ) : post === undefined ? (
        <p className="mt-2 text-sm text-gray-500">Loading…</p>
      ) : post === null ? (
        <>
          <p className="mt-2 text-sm text-gray-500">
            No threads this week yet. Start the conversation!
          </p>
          <Link
            href="/community"
            className="mt-3 inline-block text-sm text-[#B19CD9] underline"
          >
            Go to Community
          </Link>
        </>
      ) : (
        <>
          <h3 className="mt-2 font-semibold text-[#4F4F4F]">{post.title}</h3>
          <p className="text-xs text-gray-500">
            {post.author} ·{" "}
            <span className="capitalize">{post.tag.replace(/-/g, " ")}</span>
          </p>
          <p className="mt-2 text-sm text-[#4F4F4F]">
            {post.body.length > 140
              ? `${post.body.slice(0, 140).trimEnd()}…`
              : post.body}
          </p>
          <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
            <span>♡ {post.support_count}</span>
            <span>💬 {post.reply_count}</span>
            <Link
              href="/community"
              className="ml-auto text-[#B19CD9] underline"
            >
              Read in Community
            </Link>
          </div>
        </>
      )}
    </Card>
  );
}

// ---------------- Featured article ----------------
function ArticleCard() {
  const [topic, setTopic] = useState<HealthTopic | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<HealthTopic | null>("/api/dashboard/article")
      .then((t) => {
        if (!cancelled) setTopic(t);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed || topic === null) return null; // the card is optional, so it just hides
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-[#B19CD9]">
        Learn something today
      </p>
      {topic === undefined ? (
        <p className="mt-2 text-sm text-gray-500">Loading…</p>
      ) : (
        <>
          <h3 className="mt-2 font-semibold text-[#4F4F4F]">{topic.title}</h3>
          <p className="mt-2 text-sm text-[#4F4F4F]">
            {topic.summary.length > 220
              ? `${topic.summary.slice(0, 220).trimEnd()}…`
              : topic.summary}
          </p>
          <a
            href={topic.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm text-[#B19CD9] underline"
          >
            Read more
          </a>
          <p className="mt-3 text-xs text-gray-500">
            Source: MedlinePlus.gov, National Library of Medicine. General
            information, not medical advice.
          </p>
        </>
      )}
    </Card>
  );
}

// ---------------- Upcoming appointments (placeholder until Telehealth exists) ----------------
function UpcomingCard() {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-[#B19CD9]">
        Upcoming appointments
      </p>
      <p className="mt-2 text-sm text-gray-500">No upcoming appointments.</p>
      <Link
        href="/telehealth"
        className="mt-3 inline-block text-sm text-[#B19CD9] underline"
      >
        Go to Telehealth
      </Link>
    </Card>
  );
}
