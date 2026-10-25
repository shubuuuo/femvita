"use client";
import { useEffect, useState } from "react";
import Card from "../../components/Card";
import Link from "next/link";
import {
  api,
  type Group,
  type Me,
  type Poll,
  type Post,
  type PostList,
  type Reason,
  type Reply,
  type ReplyList,
  type Tag,
} from "../../lib/api";

// Keep this list in step with `Tag` in the backend (schemas.py).
const TAGS: { key: Tag; label: string }[] = [
  { key: "general", label: "General" },
  { key: "cycle-syncing", label: "Cycle Syncing" },
  { key: "pcos-endometriosis", label: "PCOS / Endometriosis" },
  { key: "pregnancy-fertility", label: "Pregnancy & Fertility" },
  { key: "mental-wellness", label: "Mental Wellness" },
  { key: "nutrition-fitness", label: "Nutrition & Fitness" },
];
const TAG_LABEL = Object.fromEntries(
  TAGS.map((t) => [t.key, t.label]),
) as Record<Tag, string>;

// "saved" is the current user's private bookmarks, "group:<slug>" is one support group's own feed
type Filter = Tag | "all" | "saved" | `group:${string}`;
const groupOf = (f: Filter) => (f.startsWith("group:") ? f.slice(6) : null);

// Does a brand-new post belong in the list being looked at? (Group posts never show on the main feed.)
function belongs(filter: Filter, post: Post) {
  const g = groupOf(filter);
  if (g) return post.group === g;
  if (filter === "saved") return false;
  if (post.group) return false;
  return filter === "all" || filter === post.tag;
}
type Feed = {
  filter: Filter;
  posts: Post[];
  next: number | null;
  failed: boolean;
};

function feedUrl(filter: Filter, before?: number) {
  const qs = new URLSearchParams();
  const g = groupOf(filter);
  if (g) qs.set("group", g);
  else if (filter === "saved") qs.set("saved", "true");
  else if (filter !== "all") qs.set("tag", filter);
  if (before) qs.set("before", String(before));
  return `/api/community/posts?${qs}`;
}

function timeAgo(iso: string) {
  const mins = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 60000),
  );
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Community() {
  const [filter, setFilter] = useState<Filter>("all");
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    api<Me>("/api/me")
      .then(setMe)
      .catch(() => {});
    api<Group[]>("/api/community/groups")
      .then(setGroups)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    api<PostList>(feedUrl(filter))
      .then((d) => {
        if (!cancelled)
          setFeed({
            filter,
            posts: d.posts,
            next: d.next_before,
            failed: false,
          });
      })
      .catch(() => {
        if (!cancelled)
          setFeed({ filter, posts: [], next: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  // Old posts stay visible while a new filter loads, but dimmed
  const loading = feed?.filter !== filter;
  const currentGroup = groups.find((g) => g.slug === groupOf(filter)) ?? null;

  async function loadMore() {
    if (!feed?.next) return;
    setLoadingMore(true);
    try {
      const d = await api<PostList>(feedUrl(filter, feed.next));
      setFeed((f) =>
        f && f.filter === filter
          ? { ...f, posts: [...f.posts, ...d.posts], next: d.next_before }
          : f,
      );
    } catch {
      setFeed((f) => (f ? { ...f, failed: true } : f));
    } finally {
      setLoadingMore(false);
    }
  }

  function handleCreated(post: Post) {
    // Show it straight away if it belongs in the list the user is looking at
    if (belongs(filter, post)) {
      setFeed((f) =>
        f && f.filter === filter ? { ...f, posts: [post, ...f.posts] } : f,
      );
    }
  }

  // Change one post in the list (new support count, new reply count...).
  // It takes a function so two quick changes can't overwrite each other.
  function handlePatch(id: number, change: (p: Post) => Post) {
    setFeed((f) => {
      if (!f) return f;
      const posts = f.posts.flatMap((p) => {
        if (p.id !== id) return [p];
        const next = change(p);
        // Un-saving something while looking at "Saved" removes it from that list
        return f.filter === "saved" && !next.bookmarked_by_me ? [] : [next];
      });
      return { ...f, posts };
    });
  }

  async function handleMembership(slug: string, on: boolean) {
    try {
      const updated = await api<Group>(
        `/api/community/groups/${slug}/membership`,
        {
          method: "PUT",
          body: JSON.stringify({ on }),
        },
      );
      setGroups((gs) => gs.map((g) => (g.slug === slug ? updated : g)));
    } catch {
      window.alert("Couldn't update that group. Please try again.");
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    try {
      await api(`/api/community/posts/${id}`, { method: "DELETE" });
      setFeed((f) =>
        f ? { ...f, posts: f.posts.filter((p) => p.id !== id) } : f,
      );
    } catch {
      window.alert("Couldn't delete that post. Please try again.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-6">
        {/* Topic filter pills */}
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Topics"
        >
          {[
            { key: "all" as const, label: "All Posts" },
            ...TAGS,
            { key: "saved" as const, label: "🔖 Saved" },
          ].map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={filter === t.key}
              onClick={() => setFilter(t.key)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${
                filter === t.key
                  ? "bg-[#B19CD9] text-white"
                  : "bg-[#EEDDFF] text-[#4F4F4F] hover:opacity-80"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {currentGroup && (
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => setFilter("all")}
                  className="text-xs text-[#B19CD9] hover:underline"
                >
                  ← All posts
                </button>
                <h1 className="text-lg font-semibold text-[#4F4F4F]">
                  {currentGroup.name}
                </h1>
                <p className="text-sm text-gray-500">
                  {currentGroup.description}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {currentGroup.member_count} member
                  {currentGroup.member_count === 1 ? "" : "s"}
                </p>
              </div>
              <button
                onClick={() =>
                  handleMembership(currentGroup.slug, !currentGroup.joined)
                }
                className={`rounded-full px-5 py-2 text-sm font-medium ${
                  currentGroup.joined
                    ? "border border-gray-300 text-[#4F4F4F] hover:bg-gray-50"
                    : "bg-[#B19CD9] text-white hover:opacity-90"
                }`}
              >
                {currentGroup.joined ? "Leave group" : "Join group"}
              </button>
            </div>
          </Card>
        )}

        {currentGroup && !currentGroup.joined ? (
          <Card>
            <p className="text-sm text-gray-500">
              Anyone can read this group. Join it to post and reply.
            </p>
          </Card>
        ) : (
          <Composer
            me={me}
            onCreated={handleCreated}
            group={currentGroup?.slug ?? null}
            defaultTag={
              filter === "all" || filter === "saved" || groupOf(filter)
                ? "general"
                : (filter as Tag)
            }
          />
        )}

        <div className={`space-y-4 ${loading ? "opacity-50" : ""}`}>
          {feed?.failed && (
            <Card>
              <p className="text-sm text-red-500">
                Couldn&apos;t load posts. Is the backend running?
              </p>
            </Card>
          )}
          {feed && !feed.failed && feed.posts.length === 0 && !loading && (
            <Card>
              <p className="text-sm text-gray-500">
                {filter === "saved"
                  ? "You haven't saved any posts yet. Tap the bookmark on a post to keep it here. Only you can see your saved posts."
                  : currentGroup && !currentGroup.joined
                    ? "No posts in this group yet."
                    : "No posts here yet. Be the first to share something."}
              </p>
            </Card>
          )}
          {feed?.posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              inGroup={currentGroup !== null}
              onDelete={handleDelete}
              onPatch={handlePatch}
            />
          ))}
          {feed?.next && !loading && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full rounded-full border border-gray-300 py-2 text-sm text-[#4F4F4F] hover:bg-[#EEDDFF]/40 disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      </div>

      <aside className="space-y-6">
        <Guidelines />
        <DailyPoll />
        <GroupsCard
          groups={groups}
          activeSlug={groupOf(filter)}
          onOpen={(slug) => setFilter(`group:${slug}`)}
          onMembership={handleMembership}
        />
        {me?.is_admin && (
          <Link
            href="/admin/reports"
            className="block rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm text-[#4F4F4F] hover:bg-[#EEDDFF]/40"
          >
            🛡 Moderation queue
          </Link>
        )}
      </aside>
    </div>
  );
}

// ---------------- Create post ----------------
function Composer({
  me,
  onCreated,
  defaultTag,
  group,
}: {
  me: Me | null;
  onCreated: (p: Post) => void;
  defaultTag: Tag;
  group: string | null; // a group's slug: the post goes to that group's feed only
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState<Tag>(defaultTag);
  const [anonymous, setAnonymous] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPosting(true);
    setError(null);
    try {
      const post = await api<Post>("/api/community/posts", {
        method: "POST",
        body: JSON.stringify({
          title,
          body,
          tag: group ? "general" : tag,
          anonymous,
          group,
        }),
      });
      onCreated(post);
      setTitle("");
      setBody("");
      setOpen(false);
    } catch {
      setError(
        "Couldn't post. Check that the title and text are filled in. You can post up to 5 times an hour, and you need to be a member to post in a group.",
      );
    } finally {
      setPosting(false);
    }
  }

  if (!open) {
    return (
      <Card>
        <button
          onClick={() => {
            setTag(defaultTag); // start from the topic the feed is filtered to
            setOpen(true);
          }}
          className="w-full rounded-full border border-gray-300 px-4 py-3 text-left text-sm text-gray-500 hover:bg-[#EEDDFF]/40"
        >
          Share your experience or ask a question anonymously…
        </button>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          required
          minLength={3}
          placeholder="Title"
          aria-label="Post title"
          className="w-full rounded-xl border border-gray-300 px-4 py-2 font-medium text-[#4F4F4F]"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={5000}
          required
          rows={5}
          placeholder="What's on your mind?"
          aria-label="Post text"
          className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-[#4F4F4F]"
        />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {!group && (
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value as Tag)}
              aria-label="Topic"
              className="rounded-full border border-gray-300 px-3 py-1.5 text-sm text-[#4F4F4F]"
            >
              {TAGS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          )}
          <label className="flex items-center gap-2 text-sm text-[#4F4F4F]">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />
            Post anonymously
          </label>
          <span className="ml-auto text-xs text-gray-400">
            {body.length}/5000
          </span>
        </div>

        <p className="text-xs text-gray-500">
          {anonymous
            ? "Other members will see “Anonymous Member”. FemVita moderators can still see who wrote it."
            : me?.username
              ? `Posting as ${me.username}.`
              : "Posting with your username."}
        </p>
        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full border border-gray-300 px-5 py-2 text-sm text-[#4F4F4F] hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            disabled={posting || title.trim().length < 3 || !body.trim()}
            className="rounded-full bg-[#B19CD9] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {posting ? "Posting…" : "Post"}
          </button>
        </div>
      </form>
    </Card>
  );
}

// ---------------- Small icons (they fill in when switched on) ----------------
const ICON = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function HeartIcon({ on }: { on: boolean }) {
  return (
    <svg {...ICON} fill={on ? "currentColor" : "none"} stroke="currentColor">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg {...ICON} fill="none" stroke="currentColor">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function BookmarkIcon({ on }: { on: boolean }) {
  return (
    <svg {...ICON} fill={on ? "currentColor" : "none"} stroke="currentColor">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// ---------------- One post in the feed ----------------
function PostCard({
  post,
  inGroup,
  onDelete,
  onPatch,
}: {
  post: Post;
  inGroup: boolean;
  onDelete: (id: number) => void;
  onPatch: (id: number, change: (p: Post) => Post) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const long = post.body.length > 280 || post.body.split("\n").length > 4;

  // Support / bookmark: ask the server for the new state and use the post it sends back,
  // so the numbers on screen are always the real ones.
  async function toggle(kind: "support" | "bookmark") {
    if (busy) return;
    setBusy(true);
    const on =
      kind === "support" ? !post.supported_by_me : !post.bookmarked_by_me;
    try {
      const updated = await api<Post>(
        `/api/community/posts/${post.id}/${kind}`,
        {
          method: "PUT",
          body: JSON.stringify({ on }),
        },
      );
      onPatch(post.id, () => updated);
    } catch {
      window.alert("Couldn't save that. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEDDFF] text-sm font-semibold text-[#B19CD9]"
        >
          {post.anonymous ? "?" : post.author.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#4F4F4F]">
            {post.author}
            {post.is_mine && (
              <span className="ml-2 text-xs font-normal text-gray-400">
                (you)
              </span>
            )}
          </p>
          <p className="text-xs text-gray-500">{timeAgo(post.created_at)}</p>
        </div>
        <span className="rounded-full bg-[#EEDDFF] px-3 py-1 text-xs text-[#4F4F4F]">
          {post.group_name && !inGroup
            ? `👥 ${post.group_name}`
            : TAG_LABEL[post.tag]}
        </span>
      </div>

      <h2 className="mt-3 text-lg font-semibold text-[#4F4F4F]">
        {post.title}
      </h2>
      <p
        className={`mt-1 whitespace-pre-wrap break-words text-sm text-gray-700 ${!expanded && long ? "line-clamp-4" : ""}`}
      >
        {post.body}
      </p>
      {long && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-sm font-medium text-[#B19CD9] hover:underline"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}

      {/* Engagement bar */}
      <div className="mt-3 flex items-center gap-5 border-t border-gray-100 pt-3 text-sm">
        <button
          onClick={() => toggle("support")}
          disabled={busy}
          aria-pressed={post.supported_by_me}
          aria-label={
            post.supported_by_me ? "Remove your support" : "Support this post"
          }
          className={`flex items-center gap-1.5 disabled:opacity-60 ${
            post.supported_by_me
              ? "text-[#B19CD9]"
              : "text-gray-500 hover:text-[#B19CD9]"
          }`}
        >
          <HeartIcon on={post.supported_by_me} />
          <span>{post.support_count}</span>
          <span className="sr-only">supports</span>
        </button>

        <button
          onClick={() => setShowReplies(!showReplies)}
          aria-expanded={showReplies}
          className={`flex items-center gap-1.5 ${
            showReplies
              ? "text-[#B19CD9]"
              : "text-gray-500 hover:text-[#B19CD9]"
          }`}
        >
          <CommentIcon />
          <span>{post.reply_count}</span>
          <span className="sr-only">replies</span>
        </button>

        <button
          onClick={() => toggle("bookmark")}
          disabled={busy}
          aria-pressed={post.bookmarked_by_me}
          aria-label={
            post.bookmarked_by_me ? "Remove from saved" : "Save this post"
          }
          className={`flex items-center gap-1.5 disabled:opacity-60 ${
            post.bookmarked_by_me
              ? "text-[#B19CD9]"
              : "text-gray-500 hover:text-[#B19CD9]"
          }`}
        >
          <BookmarkIcon on={post.bookmarked_by_me} />
        </button>

        {post.is_mine ? (
          <button
            onClick={() => onDelete(post.id)}
            className="ml-auto text-gray-400 hover:text-red-500"
          >
            Delete
          </button>
        ) : (
          <button
            onClick={() => setReporting(!reporting)}
            className="ml-auto text-xs text-gray-400 hover:text-red-500"
          >
            Report
          </button>
        )}
      </div>

      {reporting && (
        <ReportForm
          url={`/api/community/posts/${post.id}/report`}
          onClose={() => setReporting(false)}
        />
      )}

      {showReplies && (
        <Replies
          post={post}
          onCountChange={(delta) =>
            onPatch(post.id, (p) => ({
              ...p,
              reply_count: Math.max(0, p.reply_count + delta),
            }))
          }
        />
      )}
    </Card>
  );
}

// ---------------- Replies (loaded only when a thread is opened) ----------------
function Replies({
  post,
  onCountChange,
}: {
  post: Post;
  onCountChange: (delta: number) => void;
}) {
  const [replies, setReplies] = useState<Reply[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<ReplyList>(`/api/community/posts/${post.id}/replies`)
      .then((d) => {
        if (!cancelled) setReplies(d.replies);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [post.id]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const reply = await api<Reply>(
        `/api/community/posts/${post.id}/replies`,
        {
          method: "POST",
          body: JSON.stringify({ body: text, anonymous }),
        },
      );
      setReplies((r) => [...(r ?? []), reply]);
      onCountChange(1);
      setText("");
    } catch (err) {
      setError(
        err instanceof Error && err.message.startsWith("API 403")
          ? "Join this group to reply."
          : "Couldn't send your reply. You can reply up to 20 times an hour.",
      );
    } finally {
      setSending(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this reply?")) return;
    try {
      await api(`/api/community/replies/${id}`, { method: "DELETE" });
      setReplies((r) => (r ? r.filter((x) => x.id !== id) : r));
      onCountChange(-1);
    } catch {
      window.alert("Couldn't delete that reply. Please try again.");
    }
  }

  return (
    <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
      {!replies && !loadFailed && (
        <p className="text-sm text-gray-500">Loading replies…</p>
      )}
      {loadFailed && (
        <p className="text-sm text-red-500">Couldn&apos;t load replies.</p>
      )}
      {replies && replies.length === 0 && (
        <p className="text-sm text-gray-500">
          No replies yet. Be the first to respond.
        </p>
      )}

      {replies?.map((r) => (
        <div key={r.id} className="flex gap-3">
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EEDDFF] text-xs font-semibold text-[#B19CD9]"
          >
            {r.author.startsWith("Anonymous")
              ? "?"
              : r.author.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1 rounded-xl bg-[#EEDDFF]/30 px-3 py-2">
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
              <span className="font-medium text-[#4F4F4F]">{r.author}</span>
              {r.is_op && (
                <span className="rounded-full bg-[#B19CD9] px-2 py-0.5 text-[10px] font-medium text-white">
                  Author
                </span>
              )}
              {r.is_mine && <span className="text-gray-400">(you)</span>}
              <span>{timeAgo(r.created_at)}</span>
              {r.is_mine ? (
                <button
                  onClick={() => remove(r.id)}
                  className="ml-auto text-gray-400 hover:text-red-500"
                >
                  Delete
                </button>
              ) : (
                <button
                  onClick={() =>
                    setReportingId(reportingId === r.id ? null : r.id)
                  }
                  className="ml-auto text-gray-400 hover:text-red-500"
                >
                  Report
                </button>
              )}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700">
              {r.body}
            </p>
            {reportingId === r.id && (
              <ReportForm
                url={`/api/community/replies/${r.id}/report`}
                onClose={() => setReportingId(null)}
              />
            )}
          </div>
        </div>
      ))}

      <form onSubmit={send} className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          rows={2}
          placeholder="Write a supportive reply…"
          aria-label="Your reply"
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-[#4F4F4F]"
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {post.is_mine ? (
            <span className="text-xs text-gray-500">
              You&apos;ll show as the thread&apos;s author.
            </span>
          ) : (
            <label className="flex items-center gap-2 text-xs text-[#4F4F4F]">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
              />
              Reply anonymously
            </label>
          )}
          <span className="ml-auto text-xs text-gray-400">
            {text.length}/2000
          </span>
          <button
            disabled={sending || !text.trim()}
            className="rounded-full bg-[#B19CD9] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Reply"}
          </button>
        </div>
        {anonymous && !post.is_mine && (
          <p className="text-xs text-gray-500">
            Others will see “Anonymous” and a number. FemVita moderators can
            still see who wrote it.
          </p>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </form>
    </div>
  );
}

// ---------------- Report form (used under a post or a reply) ----------------
const REASONS: { key: Reason; label: string }[] = [
  { key: "harassment", label: "Harassment or unkind behaviour" },
  { key: "medical_misinformation", label: "Medical misinformation" },
  {
    key: "self_harm_concern",
    label: "Someone may be at risk of harming themselves",
  },
  { key: "spam", label: "Spam or advertising" },
  { key: "other", label: "Something else" },
];

function ReportForm({ url, onClose }: { url: string; onClose: () => void }) {
  const [reason, setReason] = useState<Reason | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    setSending(true);
    setError(null);
    try {
      await api(url, {
        method: "POST",
        body: JSON.stringify({ reason, note: note.trim() || null }),
      });
      setDone(true);
    } catch {
      setError(
        "Couldn't send your report. Please try again in a little while.",
      );
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="mt-3 rounded-xl bg-[#EEDDFF]/40 p-3 text-sm text-[#4F4F4F]">
        <p>Thank you. A FemVita moderator will take a look.</p>
        {reason === "self_harm_concern" && (
          <p className="mt-2 text-xs">
            If you think someone is in immediate danger, please contact your
            local emergency number. A report here isn&apos;t an emergency
            service.
          </p>
        )}
        <button
          onClick={onClose}
          className="mt-2 text-xs font-medium text-[#B19CD9] hover:underline"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mt-3 space-y-2 rounded-xl bg-[#EEDDFF]/40 p-3"
    >
      <p className="text-sm font-medium text-[#4F4F4F]">
        Why are you reporting this?
      </p>
      <div className="space-y-1">
        {REASONS.map((r) => (
          <label
            key={r.key}
            className="flex items-center gap-2 text-sm text-[#4F4F4F]"
          >
            <input
              type="radio"
              name={`reason-${url}`}
              checked={reason === r.key}
              onChange={() => setReason(r.key)}
            />
            {r.label}
          </label>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={300}
        rows={2}
        placeholder="Anything we should know? (optional)"
        aria-label="Report details"
        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-[#4F4F4F]"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-gray-300 px-4 py-1.5 text-sm text-[#4F4F4F] hover:bg-white"
        >
          Cancel
        </button>
        <button
          disabled={!reason || sending}
          className="rounded-full bg-[#B19CD9] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send report"}
        </button>
      </div>
    </form>
  );
}

// ---------------- Daily poll (sidebar) ----------------
function DailyPoll() {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<Poll | null>("/api/community/poll/today")
      .then((p) => {
        if (!cancelled) setPoll(p);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function vote(optionId: number) {
    setVoting(true);
    setError(null);
    try {
      setPoll(
        await api<Poll>("/api/community/poll/vote", {
          method: "PUT",
          body: JSON.stringify({ option_id: optionId }),
        }),
      );
    } catch {
      setError("Couldn't save your vote. Please try again.");
    } finally {
      setVoting(false);
    }
  }

  if (!loaded || !poll) return null; // no poll today (or it failed to load): hide the widget

  const voted = poll.my_vote !== null;
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-[#B19CD9]">
        Daily Community Poll
      </p>
      <h2 className="mt-1 text-base font-semibold text-[#4F4F4F]">
        {poll.question}
      </h2>

      <div className="mt-3 space-y-2">
        {poll.options.map((o) =>
          voted ? (
            <div key={o.id} className="text-sm text-[#4F4F4F]">
              <div className="flex justify-between gap-2">
                <span className={o.id === poll.my_vote ? "font-semibold" : ""}>
                  {o.label}
                  {o.id === poll.my_vote && " ✓"}
                </span>
                <span className="text-gray-500">{o.percent}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#EEDDFF]">
                <div
                  className="h-full rounded-full bg-[#B19CD9] transition-[width] duration-300"
                  style={{ width: `${o.percent}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              key={o.id}
              onClick={() => vote(o.id)}
              disabled={voting}
              className="w-full rounded-full border border-gray-300 px-4 py-2 text-left text-sm text-[#4F4F4F] hover:bg-[#EEDDFF]/40 disabled:opacity-50"
            >
              {o.label}
            </button>
          ),
        )}
      </div>

      <p className="mt-3 text-xs text-gray-500">
        {voted
          ? `${poll.total} vote${poll.total === 1 ? "" : "s"}. A new poll arrives tomorrow.`
          : "Vote to see how everyone else answered."}
      </p>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </Card>
  );
}

// ---------------- Support groups (sidebar) ----------------
function GroupsCard({
  groups,
  activeSlug,
  onOpen,
  onMembership,
}: {
  groups: Group[];
  activeSlug: string | null;
  onOpen: (slug: string) => void;
  onMembership: (slug: string, on: boolean) => void;
}) {
  if (groups.length === 0) return null;
  return (
    <Card>
      <h2 className="text-lg font-semibold text-[#4F4F4F]">Support Groups</h2>
      <p className="text-xs text-gray-500">
        Posts in a group appear only in that group.
      </p>
      <ul className="mt-3 space-y-3">
        {groups.map((g) => (
          <li
            key={g.slug}
            className={`rounded-xl border p-3 ${
              g.slug === activeSlug
                ? "border-[#B19CD9] bg-[#EEDDFF]/40"
                : "border-gray-200"
            }`}
          >
            <button onClick={() => onOpen(g.slug)} className="text-left">
              <span className="block text-sm font-medium text-[#4F4F4F]">
                {g.name}
              </span>
              <span className="block text-xs text-gray-500">
                {g.member_count} member{g.member_count === 1 ? "" : "s"}
              </span>
            </button>
            <button
              onClick={() => onMembership(g.slug, !g.joined)}
              className={`mt-2 rounded-full px-4 py-1 text-xs font-medium ${
                g.joined
                  ? "border border-gray-300 text-[#4F4F4F] hover:bg-gray-50"
                  : "bg-[#B19CD9] text-white hover:opacity-90"
              }`}
            >
              {g.joined ? "Joined ✓" : "Join"}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ---------------- Guidelines (static) ----------------
function Guidelines() {
  return (
    <Card>
      <h2 className="text-lg font-semibold text-[#4F4F4F]">
        Community Guidelines
      </h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700">
        <li>
          Be kind. Support each other, and don&apos;t shame, judge or harass.
        </li>
        <li>
          Share experiences, not diagnoses. Peer advice isn&apos;t a substitute
          for care from a doctor, and please don&apos;t recommend medication
          doses.
        </li>
        <li>Keep personal details (full name, phone, address) out of posts.</li>
        <li>
          Anonymous posts hide your username from other members. FemVita
          moderators can still see who wrote them.
        </li>
      </ul>
      <div className="mt-4 rounded-xl bg-[#FFDAC1]/50 p-3 text-xs text-[#4F4F4F]">
        <p className="font-medium">Need help now?</p>
        <p className="mt-1">
          Heavy bleeding, severe pain, fainting, or thoughts of harming yourself
          are not things to wait on a forum for. Contact your local emergency
          number or a doctor right away.
        </p>
      </div>
    </Card>
  );
}
