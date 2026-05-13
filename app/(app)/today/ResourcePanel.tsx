"use client";

import { useState } from "react";

interface CuratedResource {
  title: string;
  url: string;
  type: string;
  summary: string;
  source: string;
}

interface SearchResource {
  title: string;
  url: string;
  summary: string;
  snippet: string;
}

interface CommunityResource {
  title: string;
  url: string;
  votes: number;
}

interface ResourcesData {
  curated: CuratedResource[];
  search: SearchResource[];
  community: CommunityResource[];
  cached?: boolean;
}

interface Props {
  taskId: string;
  curated: CuratedResource[]; // Tier 1 pre-loaded from server
}

const TYPE_ICON: Record<string, string> = {
  video: "▶",
  doc: "📄",
  course: "🎓",
  exercise: "⚡",
  article: "📝",
};

function ResourceLink({
  title,
  url,
  label,
  sublabel,
}: {
  title: string;
  url: string;
  label?: string;
  sublabel?: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <div
        className="flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors"
        style={{ background: "var(--surface-2)" }}
      >
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-medium truncate group-hover:underline"
            style={{ color: "var(--accent)" }}
          >
            {title}
          </p>
          {label && (
            <p
              className="text-xs mt-0.5 line-clamp-2"
              style={{ color: "var(--text-muted)" }}
            >
              {label}
            </p>
          )}
          {sublabel && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {sublabel}
            </p>
          )}
        </div>
      </div>
    </a>
  );
}

export default function ResourcePanel({ taskId, curated }: Props) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ResourcesData | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (data) {
      setOpen(true);
      return;
    }
    setLoading(true);
    setOpen(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/resources`);
      if (res.ok) setData((await res.json()) as ResourcesData);
    } finally {
      setLoading(false);
    }
  }

  const searchResults = data?.search ?? [];
  const community = data?.community ?? [];

  return (
    <div
      className="mt-3 pt-3 border-t"
      style={{ borderColor: "var(--border)" }}
    >
      {/* Tier 1 — always visible */}
      {curated.length > 0 && (
        <div className="space-y-1.5 mb-3">
          <p
            className="text-xs font-semibold mb-1"
            style={{ color: "var(--text-muted)" }}
          >
            CURATED
          </p>
          {curated.map((r) => (
            <ResourceLink
              key={r.url}
              title={`${TYPE_ICON[r.type] ?? "🔗"} ${r.title}`}
              url={r.url}
              label={r.summary || undefined}
            />
          ))}
        </div>
      )}

      {/* Toggle for Tier 2 + 3 */}
      <button
        onClick={open ? () => setOpen(false) : loadMore}
        className="text-xs transition-colors"
        style={{ color: "var(--accent)" }}
      >
        {open ? "▲ Hide" : loading ? "Loading…" : "▼ Find more resources"}
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          {loading && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Searching & ranking…
            </p>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-1.5">
              <p
                className="text-xs font-semibold mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                AI-RANKED SEARCH
              </p>
              {searchResults.map((r) => (
                <ResourceLink
                  key={r.url}
                  title={r.title}
                  url={r.url}
                  label={r.summary}
                  sublabel={
                    r.snippet ? r.snippet.slice(0, 120) + "…" : undefined
                  }
                />
              ))}
            </div>
          )}

          {!loading && searchResults.length === 0 && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              No search results available right now.
            </p>
          )}

          {community.length > 0 && (
            <div className="space-y-1.5">
              <p
                className="text-xs font-semibold mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                COMMUNITY
              </p>
              {community.map((r) => (
                <ResourceLink
                  key={r.url}
                  title={r.title}
                  url={r.url}
                  sublabel={`${r.votes} vote${r.votes !== 1 ? "s" : ""}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
