"use client";
import { useEffect, useState } from "react";
import Card from "../../components/Card";

import {
  api,
  apiErrorMessage,
  type Account,
  type Metrics,
  type MonthSteps,
  type Preferences,
} from "../../lib/api";
import { notifyDataChanged } from "../../lib/events";

export default function Profile() {
  return (
    <div className="space-y-6">
      <IdentityCard />
      <div className="grid gap-6 lg:grid-cols-2">
        <SleepTrendCard />
        <ActivityTrendCard />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <PreferencesCard />
        <DataCard />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <MonthStepsCard />
        <PasswordCard />
      </div>
      <Card>
        <p className="text-sm font-medium text-[#4F4F4F]">Connected devices</p>
        <p className="mt-1 text-sm text-gray-500">
          Syncing a smartwatch or fitness tracker isnt available yet. For now,
          enter sleep and steps from the Dashboard.
        </p>
      </Card>
    </div>
  );
}

// ---------------- helpers ----------------
function initials(a: Account) {
  const source = (a.full_name || a.username || "?").trim();
  const parts = source.split(/\s+/);
  return (
    parts.length > 1
      ? parts[0][0] + parts[parts.length - 1][0]
      : source.slice(0, 2)
  ).toUpperCase();
}
function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
function fmtSleep(min: number) {
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
}
function dayLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en", {
    weekday: "short",
  });
}
const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#4F4F4F]";

// ---------------- Identity card ----------------
function IdentityCard() {
  const [me, setMe] = useState<Account | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [birthday, setBirthday] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<Account>("/api/me")
      .then((a) => {
        if (!cancelled) setMe(a);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError)
    return (
      <Card>
        <p className="text-sm text-gray-500">Cant load your profile.</p>
      </Card>
    );
  if (!me)
    return (
      <Card>
        <p className="text-sm text-gray-500">Loading…</p>
      </Card>
    );

  function startEdit() {
    setName(me!.full_name ?? "");
    setUsername(me!.username ?? "");
    setBirthday(me!.birthday ?? "");
    setError(null);
    setEditing(true);
  }

  async function save() {
    const patch: Record<string, string> = {};
    const n = name.trim();
    if (n === "") return setError("Please enter your name.");
    if (n.length > 80)
      return setError("Your name is too long (80 characters at most).");
    if (!/^[A-Za-z0-9_.]{3,30}$/.test(username)) {
      return setError(
        "Usernames are 3–30 characters: letters, numbers, dots and underscores.",
      );
    }
    if (birthday === "") return setError("Please enter your birthday.");
    if (n !== (me!.full_name ?? "")) patch.full_name = n;
    if (username !== me!.username) patch.username = username;
    if (birthday !== me!.birthday) patch.birthday = birthday;
    if (Object.keys(patch).length === 0) return setEditing(false);

    setSaving(true);
    setError(null);
    try {
      setMe(
        await api<Account>("/api/me", {
          method: "PATCH",
          body: JSON.stringify(patch),
        }),
      );
      setEditing(false);
    } catch (e) {
      setError(
        apiErrorMessage(e, "Couldn't save your changes. Please try again."),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#EEDDFF] text-xl font-semibold text-[#B19CD9]">
          {initials(me)}
        </div>

        {editing ? (
          <div className="min-w-[16rem] flex-1 space-y-3">
            <label className="block text-sm text-[#4F4F4F]">
              Name
              <input
                className={`${inputClass} mt-1`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </label>
            <label className="block text-sm text-[#4F4F4F]">
              Username
              <input
                className={`${inputClass} mt-1`}
                value={username}
                maxLength={30}
                onChange={(e) => setUsername(e.target.value)}
              />
              <span className="text-xs text-gray-500">
                Shown on your community posts. Changing it renames your older
                posts too.
              </span>
            </label>
            <label className="block text-sm text-[#4F4F4F]">
              Birthday
              <input
                type="date"
                className={`${inputClass} mt-1`}
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </label>
            <p className="text-xs text-gray-500">
              Email: {me.email ?? "—"} (cant be changed yet)
            </p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={saving}
                className="rounded-full bg-[#B19CD9] px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-full border border-gray-300 px-5 py-2 text-sm text-[#4F4F4F]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="min-w-[16rem] flex-1">
            <h2 className="text-xl font-semibold text-[#4F4F4F]">
              {me.full_name ?? me.username ?? "Your profile"}
            </h2>
            <dl className="mt-2 space-y-1 text-sm text-[#4F4F4F]">
              <div className="flex gap-2">
                <dt className="w-24 text-gray-500">Username</dt>
                <dd>{me.username ? `@${me.username}` : "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 text-gray-500">Email</dt>
                <dd>{me.email ?? "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 text-gray-500">Birthday</dt>
                <dd>{me.birthday ? fmtDate(me.birthday) : "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 text-gray-500">Member since</dt>
                <dd>
                  {new Date(me.created_at).toLocaleDateString("en", {
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
            </dl>
            <button
              onClick={startEdit}
              className="mt-4 rounded-full border border-[#B19CD9] px-5 py-1.5 text-sm text-[#B19CD9] hover:bg-[#EEDDFF]"
            >
              Edit profile
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

// ---------------- Change password ----------------
function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setDone(false);
    if (next.length < 10)
      return setError("Your new password needs at least 10 characters.");
    if (next !== confirm) return setError("The new passwords don't match.");
    setBusy(true);
    setError(null);
    try {
      await api("/api/me/password", {
        method: "POST",
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch (err) {
      setError(
        apiErrorMessage(
          err,
          "Couldn't change your password. Please try again.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <p className="text-sm font-medium text-[#4F4F4F]">Change password</p>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Current password"
          className={inputClass}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="New password (10+ characters)"
          className={inputClass}
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Repeat new password"
          className={inputClass}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {done && (
          <p className="text-sm text-green-600">
            Password changed. Your other devices have been signed out.
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !current || !next}
          className="rounded-full bg-[#B19CD9] px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Update password
        </button>
      </form>
    </Card>
  );
}

// ---------------- Line chart (hand-drawn SVG, no library) ----------------
function LineChart({
  values,
  labels,
  yMax,
  refLine,
  refLabel,
  fmt,
}: {
  values: (number | null)[];
  labels: string[];
  yMax: number;
  refLine?: number;
  refLabel?: string;
  fmt: (v: number) => string;
}) {
  const W = 300,
    H = 150,
    padL = 10,
    padR = 10,
    padT = 12,
    padB = 24;
  const n = values.length;
  const x = (i: number) =>
    padL +
    (n === 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (n - 1));
  const y = (v: number) =>
    padT + (1 - Math.min(v, yMax) / yMax) * (H - padT - padB);

  // Split into runs so a day with no data leaves a gap in the line instead of a fake slope
  const runs: { i: number; v: number }[][] = [];
  let cur: { i: number; v: number }[] = [];
  values.forEach((v, i) => {
    if (v === null) {
      if (cur.length) runs.push(cur);
      cur = [];
    } else cur.push({ i, v });
  });
  if (cur.length) runs.push(cur);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-3 w-full"
      role="img"
      aria-label="7-day trend chart"
    >
      {refLine !== undefined && (
        <>
          <line
            x1={padL}
            x2={W - padR}
            y1={y(refLine)}
            y2={y(refLine)}
            stroke="#B19CD9"
            strokeOpacity={0.6}
            strokeDasharray="4 4"
          />
          <text
            x={W - padR}
            y={y(refLine) - 4}
            textAnchor="end"
            fontSize="10"
            fill="#B19CD9"
          >
            {refLabel}
          </text>
        </>
      )}
      {runs
        .filter((r) => r.length > 1)
        .map((r) => (
          <polyline
            key={r[0].i}
            fill="none"
            stroke="#B19CD9"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={r.map((p) => `${x(p.i)},${y(p.v)}`).join(" ")}
          />
        ))}
      {values.map((v, i) =>
        v === null ? null : (
          <circle key={i} cx={x(i)} cy={y(v)} r={3.5} fill="#B19CD9">
            <title>{`${labels[i]}: ${fmt(v)}`}</title>
          </circle>
        ),
      )}
      {labels.map((l, i) => (
        <text
          key={i}
          x={x(i)}
          y={H - 6}
          textAnchor="middle"
          fontSize="10"
          fill="#6b7280"
        >
          {l}
        </text>
      ))}
    </svg>
  );
}

// ---------------- Sleep + activity (share one fetch each) ----------------
function useWeek() {
  const [m, setM] = useState<Metrics | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    api<Metrics>("/api/metrics/week")
      .then((d) => {
        if (!cancelled) setM(d);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { m, failed };
}

function SleepTrendCard() {
  const { m, failed } = useWeek();
  if (failed)
    return (
      <Card>
        <p className="text-sm text-gray-500">Cant load your sleep data.</p>
      </Card>
    );
  if (!m)
    return (
      <Card>
        <p className="text-sm text-gray-500">Loading…</p>
      </Card>
    );

  const values = m.days.map((d) => d.sleep_minutes);
  const logged = values.filter((v): v is number => v !== null);
  const avg = logged.length
    ? Math.round(logged.reduce((a, b) => a + b, 0) / logged.length)
    : null;
  const goal = m.goals.sleep_minutes;

  return (
    <Card>
      <p className="text-sm font-medium text-[#4F4F4F]">
        My sleep, last 7 days
      </p>
      {avg === null ? (
        <p className="mt-2 text-sm text-gray-500">
          No sleep logged this week. Log it from the Dashboard.
        </p>
      ) : (
        <>
          <p className="mt-1 text-xs text-gray-500">
            Average {fmtSleep(avg)} over {logged.length} logged night
            {logged.length === 1 ? "" : "s"}
          </p>
          <LineChart
            values={values}
            labels={m.days.map((d) => dayLabel(d.date))}
            yMax={Math.ceil((Math.max(goal, ...logged) * 1.1) / 60) * 60}
            refLine={goal}
            refLabel={`Goal ${fmtSleep(goal)}`}
            fmt={fmtSleep}
          />
        </>
      )}
    </Card>
  );
}

function ActivityTrendCard() {
  const { m, failed } = useWeek();
  if (failed)
    return (
      <Card>
        <p className="text-sm text-gray-500">Cant load your activity data.</p>
      </Card>
    );
  if (!m)
    return (
      <Card>
        <p className="text-sm text-gray-500">Loading…</p>
      </Card>
    );

  const goal = m.goals.steps;
  const values = m.days.map((d) =>
    d.steps === null ? null : Math.round((d.steps / goal) * 100),
  );
  const logged = values.filter((v): v is number => v !== null);

  return (
    <Card>
      <p className="text-sm font-medium text-[#4F4F4F]">
        My activity, last 7 days
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Steps as a percentage of your {goal.toLocaleString()}-step goal
      </p>
      {logged.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">
          No steps logged this week. Log them from the Dashboard.
        </p>
      ) : (
        <LineChart
          values={values}
          labels={m.days.map((d) => dayLabel(d.date))}
          yMax={Math.max(100, ...logged) * 1.1}
          refLine={100}
          refLabel="Goal"
          fmt={(v) => `${v}%`}
        />
      )}
    </Card>
  );
}

// ---------------- Steps this month ----------------
function MonthStepsCard() {
  const [d, setD] = useState<MonthSteps | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<MonthSteps>("/api/metrics/month")
      .then((x) => {
        if (!cancelled) setD(x);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed)
    return (
      <Card>
        <p className="text-sm text-gray-500">Cant load your monthly steps.</p>
      </Card>
    );
  if (!d)
    return (
      <Card>
        <p className="text-sm text-gray-500">Loading…</p>
      </Card>
    );

  const pct = d.target ? d.steps_total / d.target : 0;
  const r = 40;
  const c = 2 * Math.PI * r;

  return (
    <Card>
      <p className="text-sm font-medium text-[#4F4F4F]">Your steps goal</p>
      <div className="mt-3 flex items-center gap-5">
        <div className="relative h-28 w-28 shrink-0">
          <svg
            viewBox="0 0 100 100"
            className="h-28 w-28 -rotate-90"
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
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-[#4F4F4F]">
            {Math.round(pct * 100)}%
          </div>
        </div>
        <div>
          <p className="text-3xl font-semibold text-[#B19CD9]">
            {d.steps_total.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            steps this month, from {d.days_logged} logged day
            {d.days_logged === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Month target: {d.target.toLocaleString()}
          </p>
        </div>
      </div>
    </Card>
  );
}
// ---------------- Notification preferences ----------------
function Switch({
  on,
  disabled,
  onClick,
  label,
}: {
  on: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? "bg-[#B19CD9]" : "bg-gray-300"}`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`}
      />
    </button>
  );
}

function PreferencesCard() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<Preferences>("/api/preferences")
      .then((p) => {
        if (!cancelled) setPrefs(p);
      })
      .catch(() => {
        if (!cancelled) setError("Can't load your preferences.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(key: keyof Preferences) {
    if (!prefs) return;
    setBusy(true);
    setError(null);
    try {
      setPrefs(
        await api<Preferences>("/api/preferences", {
          method: "PATCH",
          body: JSON.stringify({ [key]: !prefs[key] }),
        }),
      );
      notifyDataChanged(); // the bell refreshes straight away
    } catch {
      setError("Couldn't save that. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const rows: { key: keyof Preferences; title: string; text: string }[] = [
    {
      key: "cycle_alerts",
      title: "Cycle alerts",
      text: "When your period is near, your fertile window opens, or ovulation is estimated.",
    },
    {
      key: "log_reminder",
      title: "Daily log reminder",
      text: "A reminder when you haven't logged anything today.",
    },
  ];

  return (
    <Card>
      <p className="text-sm font-medium text-[#4F4F4F]">
        Notification preferences
      </p>
      {!prefs ? (
        <p className="mt-2 text-sm text-gray-500">{error ?? "Loading…"}</p>
      ) : (
        <>
          <ul className="mt-3 space-y-4">
            {rows.map((r) => (
              <li
                key={r.key}
                className="flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-sm text-[#4F4F4F]">{r.title}</p>
                  <p className="text-xs text-gray-500">{r.text}</p>
                </div>
                <Switch
                  on={prefs[r.key]}
                  disabled={busy}
                  onClick={() => toggle(r.key)}
                  label={r.title}
                />
              </li>
            ))}
          </ul>
          {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
          <p className="mt-4 text-xs text-gray-500">
            These show in the bell inside FemVita. They arent sent by email or
            push yet.
          </p>
        </>
      )}
    </Card>
  );
}

// ---------------- Export and delete ----------------
type ExportData = {
  daily_logs: {
    log_date: string;
    flow: string | null;
    mood: string | null;
    symptoms: string[];
    bbt: number | null;
    cervical_mucus: string | null;
  }[];
  [section: string]: unknown;
};

function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvCell(v: unknown) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function DataCard() {
  const [busy, setBusy] = useState<"json" | "csv" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function exportData(kind: "json" | "csv") {
    const stamp = new Date().toISOString().slice(0, 10);
    setBusy(kind);
    setMessage(null);
    try {
      const data = await api<ExportData>("/api/me/export");
      if (kind === "json") {
        download(
          `femvita-export-${stamp}.json`,
          JSON.stringify(data, null, 2),
          "application/json",
        );
      } else {
        const head = [
          "date",
          "flow",
          "mood",
          "symptoms",
          "bbt_celsius",
          "cervical_mucus",
        ];
        const lines = data.daily_logs.map((l) =>
          [
            l.log_date,
            l.flow,
            l.mood,
            l.symptoms.join(";"),
            l.bbt,
            l.cervical_mucus,
          ]
            .map(csvCell)
            .join(","),
        );
        // The leading \uFEFF helps Excel read the file as UTF-8
        download(
          `femvita-logs-${stamp}.csv`,
          `\uFEFF${[head.join(","), ...lines].join("\r\n")}`,
          "text/csv",
        );
      }
    } catch {
      setMessage("Couldn't prepare your export. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api("/api/me/delete", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      window.location.href = "/"; // change this to "/login" once step 1b exists
    } catch (e) {
      setDeleteError(
        apiErrorMessage(e, "Couldn't delete your account. Please try again."),
      );
      setDeleting(false);
    }
  }

  return (
    <Card>
      <p className="text-sm font-medium text-[#4F4F4F]">Data & privacy</p>
      <p className="mt-1 text-xs text-gray-500">
        Download a copy of what FemVita holds about you: account details, cycle
        logs, sleep, steps and water, your posts and replies, and your settings.
        It never includes your password or other peoples posts.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => exportData("json")}
          disabled={busy !== null}
          className="rounded-full bg-[#B19CD9] px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy === "json" ? "Preparing…" : "Export all data (JSON)"}
        </button>
        <button
          onClick={() => exportData("csv")}
          disabled={busy !== null}
          className="rounded-full border border-[#B19CD9] px-5 py-2 text-sm text-[#B19CD9] hover:bg-[#EEDDFF] disabled:opacity-50"
        >
          {busy === "csv" ? "Preparing…" : "Export cycle logs (CSV)"}
        </button>
      </div>
      {message && <p className="mt-2 text-xs text-red-500">{message}</p>}

      <hr className="my-5 border-gray-200" />

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="rounded-full bg-[#E57373] px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Delete my account
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[#4F4F4F]">
            This permanently deletes your account and everything linked to it:
            your cycle logs, sleep, steps and water, settings, bookmarks,
            supports, poll votes and group memberships, and{" "}
            <strong>
              all your community posts and replies, including replies other
              people wrote on your posts
            </strong>
            . It cant be undone. Export your data first if you want a copy.
          </p>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            placeholder="Type DELETE to confirm"
            className={inputClass}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          {deleteError && <p className="text-sm text-red-500">{deleteError}</p>}
          <div className="flex gap-2">
            <button
              onClick={deleteAccount}
              disabled={deleting || !password || typed !== "DELETE"}
              className="rounded-full bg-[#E57373] px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {deleting ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              onClick={() => {
                setConfirming(false);
                setPassword("");
                setTyped("");
                setDeleteError(null);
              }}
              className="rounded-full border border-gray-300 px-5 py-2 text-sm text-[#4F4F4F]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
