"use client";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  api,
  type BbtPoint,
  type DailyLog,
  type DayInfo,
  type Flow,
  type LogBody,
  type Mood,
  type Mucus,
  type Summary,
  type Symptom,
} from "../../lib/api";
import Card from "@/components/Card";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const FLOWS: { value: Flow; label: string; bg: string }[] = [
  { value: "light", label: "Light", bg: "bg-[#E2F0CB]" },
  { value: "medium", label: "Medium", bg: "bg-[#FFDAC1]" },
  { value: "heavy", label: "Heavy", bg: "bg-[#FF9AA2]" },
];
const MOODS: { value: Mood; emoji: string }[] = [
  { value: "happy", emoji: "😊" },
  { value: "neutral", emoji: "😐" },
  { value: "sad", emoji: "😢" },
];
const SYMPTOMS: { value: Symptom; label: string }[] = [
  { value: "cramps", label: "Cramps" },
  { value: "fatigue", label: "Fatigue" },
  { value: "acne", label: "Acne" },
  { value: "headache", label: "Headache" },
  { value: "mood_shifts", label: "Mood Shifts" },
];
const MUCUS: { value: Mucus; label: string }[] = [
  { value: "dry", label: "Dry" },
  { value: "sticky", label: "Sticky" },
  { value: "creamy", label: "Creamy" },
  { value: "watery", label: "Watery" },
  { value: "egg_white", label: "Egg white" },
];
const MOOD_EMOJI = Object.fromEntries(
  MOODS.map((m) => [m.value, m.emoji]),
) as Record<Mood, string>;

// Dates are handled as "YYYY-MM-DD" strings everywhere, which avoids timezone surprises.
const longDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
const shortDate = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1].slice(0, 3)}`;
};
const weekdayOf = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function CycleTracker() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [days, setDays] = useState<DayInfo[]>([]);
  const [bbt, setBbt] = useState<BbtPoint[]>([]);
  const [view, setView] = useState<{ year: number; month: number } | null>(
    null,
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [version, setVersion] = useState(0); // bump to re-fetch everything after a save
  const [error, setError] = useState<string | null>(null);

  // Summary + today's date from the backend
  useEffect(() => {
    let cancelled = false;
    api<Summary>("/api/cycle/summary")
      .then((s) => {
        if (cancelled) return;
        setSummary(s);
        const [y, m] = s.today.split("-").map(Number);
        setView((v) => v ?? { year: y, month: m });
        setSelected((sel) => sel ?? s.today);
      })
      .catch(() => {
        if (!cancelled)
          setError("Can't reach the server. Is the backend running?");
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  // Calendar for the month being viewed
  useEffect(() => {
    if (!view) return;
    let cancelled = false;
    api<DayInfo[]>(`/api/cycle/calendar?year=${view.year}&month=${view.month}`)
      .then((d) => {
        if (!cancelled) setDays(d);
      })
      .catch(() => {
        if (!cancelled) setError("Can't load the calendar.");
      });
    return () => {
      cancelled = true;
    };
  }, [view, version]);

  // BBT trend (last 30 days)
  useEffect(() => {
    let cancelled = false;
    api<BbtPoint[]>("/api/cycle/bbt?days=30")
      .then((d) => {
        if (!cancelled) setBbt(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [version]);

  if (error) {
    return (
      <Card>
        <p className="text-sm text-[#4F4F4F]">{error}</p>
      </Card>
    );
  }
  if (!summary || !view || !selected) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  const shiftMonth = (delta: number) =>
    setView((prev) => {
      if (!prev) return prev; // not loaded yet: nothing to shift
      const d = new Date(prev.year, prev.month - 1 + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });

  async function saveLog(body: LogBody) {
    await api(`/api/logs/${selected}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    setVersion((v) => v + 1);
  }

  // ---- Values derived from the backend response ----
  const {
    cycle_day: cd,
    fertile_start: fs,
    fertile_end: fe,
    ovulation_day: ov,
  } = summary;
  const len = summary.avg_cycle_length;
  const ready =
    summary.has_data && cd != null && fs != null && fe != null && ov != null;

  const phases = ready
    ? [
        { name: "Follicular / Menstrual", from: 0, to: fs - 1, bg: "#EEDDFF" },
        {
          name: "Fertile & Ovulation",
          from: fs - 1,
          to: fe,
          bg: "linear-gradient(to right, #E2F0CB, #B5EAEA)",
        },
        { name: "Luteal", from: fe, to: len, bg: "#FFDAC1" },
      ]
    : [];

  const status =
    summary.days_late > 0
      ? `Period is ${plural(summary.days_late, "day")} late`
      : summary.next_period_in === 0
        ? "Period expected today"
        : `Next period in ${plural(summary.next_period_in ?? 0, "day")}`;

  const selectedDay = days.find((d) => d.date === selected);
  const firstWeekday = days.length ? weekdayOf(days[0].date) : 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      {/* ---------- LEFT: progress + calendar ---------- */}
      <div className="space-y-6">
        <Card>
          <p className="text-xs text-gray-500">{longDate(summary.today)}</p>

          {ready ? (
            <>
              <h2 className="text-xl font-semibold text-[#4F4F4F]">
                Current Cycle: Day {cd}
              </h2>
              <p className="text-sm text-gray-500">{status}</p>

              <div className="relative mb-2 mt-8">
                <div className="flex h-5 overflow-hidden rounded-full">
                  {phases.map((p) => (
                    <div
                      key={p.name}
                      title={p.name}
                      style={{
                        width: `${((p.to - p.from) / len) * 100}%`,
                        background: p.bg,
                      }}
                    />
                  ))}
                </div>
                <span
                  className="absolute -top-7 -translate-x-1/2 text-xl"
                  style={{ left: `${((ov - 0.5) / len) * 100}%` }}
                  title="Estimated ovulation"
                >
                  🌸
                </span>
                <span
                  className="absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-[#B19CD9] shadow"
                  style={{ left: `${Math.min((cd - 0.5) / len, 1) * 100}%` }}
                  title={`Day ${cd}`}
                />
              </div>

              <div className="flex justify-between text-xs text-gray-500">
                <span>0</span>
                <span>{len} days</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#4F4F4F]">
                {phases.map((p) => (
                  <span key={p.name} className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: p.bg }}
                    />
                    {p.name}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-[#4F4F4F]">Welcome</h2>
              <p className="mt-1 text-sm text-gray-500">
                Log flow on the first day of your period (use the form on the
                right) and your cycle predictions will appear here.
              </p>
            </>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="h-9 w-9 rounded-full hover:bg-[#EEDDFF]/60"
            >
              ‹
            </button>
            <h2 className="text-lg font-semibold text-[#4F4F4F]">
              {MONTHS[view.month - 1]} {view.year}
            </h2>
            <button
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="h-9 w-9 rounded-full hover:bg-[#EEDDFF]/60"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-gray-500">
            {WEEKDAYS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {Array.from({ length: firstWeekday }, (_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {days.map((day) => {
              const isSelected = day.date === selected;
              const isToday = day.date === summary.today;
              const bg = day.is_period
                ? "bg-[#FF9AA2]/40"
                : day.is_ovulation
                  ? "bg-[#FFDAC1]"
                  : day.is_predicted_period
                    ? "bg-[#FF9AA2]/15"
                    : day.is_fertile
                      ? "bg-[#FFDAC1]/40"
                      : "bg-gray-50 hover:bg-[#EEDDFF]/40";

              return (
                <button
                  key={day.date}
                  onClick={() => setSelected(day.date)}
                  title={
                    day.cycle_day ? `Cycle day ${day.cycle_day}` : undefined
                  }
                  className={`flex min-h-20 flex-col rounded-xl border-2 p-2 text-left text-sm text-[#4F4F4F] transition-colors ${bg} ${
                    isSelected ? "border-[#B19CD9]" : "border-transparent"
                  }`}
                >
                  <span
                    className={
                      isToday ? "font-bold text-[#B19CD9]" : "font-medium"
                    }
                  >
                    {Number(day.date.slice(8))}
                  </span>
                  {isToday && (
                    <span className="text-[10px] leading-tight text-[#B19CD9]">
                      Today
                    </span>
                  )}
                  {day.is_ovulation && !isToday && (
                    <span className="text-[10px] leading-tight">Ovulation</span>
                  )}
                  <span className="mt-auto flex gap-1 text-base">
                    {day.is_ovulation && "🌸"}
                    {day.is_period && "🩸"}
                    {day.log?.mood && MOOD_EMOJI[day.log.mood]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#4F4F4F]">
            <Legend color="bg-[#FF9AA2]/40" label="Period" />
            <Legend color="bg-[#FF9AA2]/15" label="Predicted period" />
            <Legend color="bg-[#FFDAC1]/40" label="Fertile window" />
            <Legend color="bg-[#FFDAC1]" label="Ovulation (estimate)" />
          </div>
        </Card>
      </div>

      {/* ---------- RIGHT: log form + BBT + insights ---------- */}
      <div className="space-y-6">
        <Card>
          <h2 className="text-lg font-semibold text-[#4F4F4F]">
            {selected === summary.today ? "Health Log Today" : "Health Log"}
          </h2>
          <p className="mb-4 text-xs text-gray-500">{longDate(selected)}</p>

          {/* key = remount (fresh form state) when the day or its saved data changes */}
          <LogForm
            key={`${selected}:${JSON.stringify(selectedDay?.log ?? null)}`}
            initial={selectedDay?.log ?? null}
            disabled={selected > summary.today}
            onSave={saveLog}
          />
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-[#4F4F4F]">BBT</h2>
          {bbt.length < 2 ? (
            <p className="mt-2 text-sm text-gray-500">
              Log your temperature on at least 2 days to see your trend.
            </p>
          ) : (
            <div className="mt-3 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={bbt}
                  margin={{ top: 5, right: 8, bottom: 0, left: -20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={shortDate}
                    tick={{ fontSize: 11 }}
                    minTickGap={24}
                  />
                  <YAxis
                    domain={["dataMin - 0.2", "dataMax + 0.2"]}
                    tickFormatter={(v: number) => v.toFixed(1)}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    labelFormatter={(label) => shortDate(String(label))}
                    formatter={(v) => [`${v} °C`, "BBT"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="bbt"
                    stroke="#B19CD9"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-[#4F4F4F]">
            Quick Insights
          </h2>
          <dl className="mt-3 space-y-2 text-sm text-[#4F4F4F]">
            <Row label="Average cycle" value={`${len} days`} />
            <Row
              label="Average period"
              value={`${summary.avg_period_length} days`}
            />
            {ready && <Row label="Fertile window" value={`Days ${fs}–${fe}`} />}
            {ready && <Row label="Est. ovulation" value={`Day ${ov}`} />}
          </dl>
          {summary.cycles_used < 3 && (
            <p className="mt-3 text-xs text-gray-500">
              {summary.cycles_used === 0
                ? "These are standard estimates until you log a few periods."
                : "Estimates get more accurate as you log more cycles."}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded ${color}`} />
      {label}
    </span>
  );
}

type Draft = {
  flow: Flow | null;
  mood: Mood | null;
  symptoms: Symptom[];
  bbt: string;
  cervical_mucus: Mucus | null;
};

function LogForm({
  initial,
  disabled,
  onSave,
}: {
  initial: DailyLog | null;
  disabled: boolean;
  onSave: (body: LogBody) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft>({
    flow: initial?.flow ?? null,
    mood: initial?.mood ?? null,
    symptoms: initial?.symptoms ?? [],
    bbt: initial?.bbt != null ? String(initial.bbt) : "",
    cervical_mucus: initial?.cervical_mucus ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const toggleSymptom = (s: Symptom) =>
    set({
      symptoms: draft.symptoms.includes(s)
        ? draft.symptoms.filter((x) => x !== s)
        : [...draft.symptoms, s],
    });

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        flow: draft.flow,
        mood: draft.mood,
        symptoms: draft.symptoms,
        bbt: draft.bbt === "" ? null : Number(draft.bbt),
        cervical_mucus: draft.cervical_mucus,
      });
    } catch {
      setError(
        "Couldn't save. Check the values and that the backend is running.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <fieldset disabled={disabled || saving} className="disabled:opacity-60">
      <p className="mb-2 text-sm font-medium text-[#4F4F4F]">Flow</p>
      <div className="flex gap-2">
        {FLOWS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() =>
              set({ flow: draft.flow === f.value ? null : f.value })
            }
            className={`flex-1 rounded-full py-2 text-sm text-[#4F4F4F] ${f.bg} ${
              draft.flow === f.value ? "ring-2 ring-[#B19CD9]" : ""
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="mb-2 mt-5 text-sm font-medium text-[#4F4F4F]">Mood</p>
      <div className="flex gap-2">
        {MOODS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() =>
              set({ mood: draft.mood === m.value ? null : m.value })
            }
            className={`h-11 w-11 rounded-full text-xl hover:bg-[#EEDDFF]/60 ${
              draft.mood === m.value ? "bg-[#EEDDFF] ring-2 ring-[#B19CD9]" : ""
            }`}
          >
            {m.emoji}
          </button>
        ))}
      </div>

      <p className="mb-2 mt-5 text-sm font-medium text-[#4F4F4F]">Symptoms</p>
      <div className="space-y-2">
        {SYMPTOMS.map((s) => (
          <label
            key={s.value}
            className="flex items-center gap-2 text-sm text-[#4F4F4F]"
          >
            <input
              type="checkbox"
              checked={draft.symptoms.includes(s.value)}
              onChange={() => toggleSymptom(s.value)}
              className="h-4 w-4 accent-[#B19CD9]"
            />
            {s.label}
          </label>
        ))}
      </div>

      <label
        htmlFor="bbt"
        className="mb-1 mt-5 block text-sm font-medium text-[#4F4F4F]"
      >
        BBT (°C)
      </label>
      <input
        id="bbt"
        type="number"
        step="0.01"
        min="34"
        max="42"
        placeholder="36.50"
        value={draft.bbt}
        onChange={(e) => set({ bbt: e.target.value })}
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#B19CD9]"
      />

      <label
        htmlFor="mucus"
        className="mb-1 mt-4 block text-sm font-medium text-[#4F4F4F]"
      >
        Cervical Mucus
      </label>
      <select
        id="mucus"
        value={draft.cervical_mucus ?? ""}
        onChange={(e) =>
          set({ cervical_mucus: (e.target.value || null) as Mucus | null })
        }
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#B19CD9]"
      >
        <option value="">Select…</option>
        {MUCUS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={submit}
        className="mt-6 w-full rounded-full bg-[#B19CD9] py-2.5 text-sm font-medium text-white hover:opacity-90"
      >
        {saving ? "Saving…" : "Save"}
      </button>
      {disabled && (
        <p className="mt-2 text-xs text-gray-500">You cant log a future day.</p>
      )}
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </fieldset>
  );
}
