const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Flow = "light" | "medium" | "heavy";
export type Mood = "happy" | "neutral" | "sad";
export type Mucus = "dry" | "sticky" | "creamy" | "watery" | "egg_white";
export type Symptom =
  | "cramps"
  | "fatigue"
  | "acne"
  | "headache"
  | "mood_shifts";

export type LogBody = {
  flow: Flow | null;
  mood: Mood | null;
  symptoms: Symptom[];
  bbt: number | null;
  cervical_mucus: Mucus | null;
};
export type DailyLog = LogBody & { log_date: string };

export type DayInfo = {
  date: string;
  cycle_day: number | null;
  is_period: boolean;
  is_predicted_period: boolean;
  is_fertile: boolean;
  is_ovulation: boolean;
  log: DailyLog | null;
};

export type Summary = {
  today: string;
  has_data: boolean;
  avg_cycle_length: number;
  avg_period_length: number;
  cycles_used: number;
  cycle_day: number | null;
  days_late: number;
  next_period_in: number | null;
  ovulation_day: number | null;
  fertile_start: number | null;
  fertile_end: number | null;
  last_period_start: string | null;
  phase: Phase | null;
};

export type BbtPoint = { date: string; bbt: number; cycle_day: number | null };

// Every request carries the browser's timezone so the server knows what "today" is.
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}${path}${sep}tz=${encodeURIComponent(tz)}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export type ChallengeDay = {
  date: string;
  done: boolean;
  is_today: boolean;
  is_future: boolean;
};
export type Challenge = {
  slug: string;
  title: string;
  description: string;
  week_start: string;
  completed: number;
  target: number;
  days: ChallengeDay[];
};

export type HealthTopic = {
  title: string;
  summary: string;
  url: string;
  snippet: string | null;
};
export type HealthTopics = { term: string; topics: HealthTopic[] };
export type Phase = "menstrual" | "follicular" | "ovulatory" | "luteal";
export type MealCard = { id: string; name: string; thumb: string | null };
export type Nutrition = {
  phase: Phase;
  label: string;
  why: string;
  detected: boolean;
  meals: MealCard[];
};
export type MealDetail = {
  id: string;
  name: string;
  category: string | null;
  area: string | null;
  thumb: string | null;
  ingredients: { name: string; measure: string }[];
  steps: string[];
  source_url: string | null;
  youtube_url: string | null;
};
export type Move = {
  id: number;
  name: string;
  description: string;
  muscles: string[];
  muscles_secondary: string[];
  equipment: string[];
  image: string | null;
  credit: string | null;
};

export type Tag =
  | "general"
  | "cycle-syncing"
  | "pcos-endometriosis"
  | "pregnancy-fertility"
  | "mental-wellness"
  | "nutrition-fitness";
export type Me = { id: number; username: string | null; is_admin: boolean };
export type Post = {
  id: number;
  title: string;
  body: string;
  tag: Tag;
  anonymous: boolean;
  author: string;
  is_mine: boolean;
  created_at: string;
  support_count: number;
  reply_count: number;
  supported_by_me: boolean;
  bookmarked_by_me: boolean;
  group: string | null; // a group's slug
  group_name: string | null;
};
export type PostList = { posts: Post[]; next_before: number | null };
export type Reply = {
  id: number;
  post_id: number;
  body: string;
  author: string; // "Anonymous 1", "Anonymous Member" or a username
  is_op: boolean; // written by the person who started the thread
  is_mine: boolean;
  created_at: string;
};
export type ReplyList = { replies: Reply[] };

export type Group = {
  slug: string;
  name: string;
  description: string;
  member_count: number;
  joined: boolean;
};

export type PollOption = {
  id: number;
  label: string;
  votes: number | null; // null until you've voted
  percent: number | null;
};
export type Poll = {
  id: number;
  question: string;
  options: PollOption[];
  my_vote: number | null;
  total: number | null;
};

export type Reason =
  | "harassment"
  | "medical_misinformation"
  | "self_harm_concern"
  | "spam"
  | "other";

export type AdminItem = {
  kind: "post" | "reply";
  id: number;
  post_id: number;
  title: string | null;
  body: string;
  author: string; // the real username
  anonymous: boolean;
  is_hidden: boolean;
  report_count: number;
  reasons: Record<string, number>;
  notes: string[];
  self_harm: boolean;
  created_at: string;
};
export type AdminQueue = { items: AdminItem[] };

export type Tip = { phase: Phase | null; label: string; text: string };
export type MetricDay = {
  date: string;
  sleep_minutes: number | null;
  steps: number | null;
  hydration_ml: number;
};
export type Metrics = {
  goals: { sleep_minutes: number; steps: number; hydration_ml: number };
  days: MetricDay[]; // 7 days, oldest first, the last is today
};
export type AppNotification = {
  kind: "period" | "fertile" | "ovulation" | "log";
  text: string;
  href: string;
};
export type NotificationList = { items: AppNotification[] };
