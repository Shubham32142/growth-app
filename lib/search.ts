/**
 * Tavily Search client — Tier 2 resource grounding.
 * Returns real URLs with snippets; the LLM only filters/ranks these,
 * it never invents new URLs.
 */

export interface TavilyResult {
  title: string;
  url: string;
  snippet: string;
}

interface TavilyAPIResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilyAPIResult[];
}

const TAVILY_API_URL = "https://api.tavily.com/search";

/**
 * Search for real, current learning resources for a given task title.
 * Returns up to `maxResults` grounded results (real URLs only).
 */
export async function searchResources(
  taskTitle: string,
  maxResults = 8,
): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY is not set");

  const query = `${taskTitle} tutorial beginner 2026`;

  const res = await fetch(TAVILY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      max_results: maxResults,
      include_domains: [
        "dev.to",
        "youtube.com",
        "freecodecamp.org",
        "developer.mozilla.org",
        "docs.python.org",
        "javascript.info",
        "roadmap.sh",
        "neetcode.io",
        "theodinproject.com",
        "css-tricks.com",
        "web.dev",
        "github.com",
      ],
      search_depth: "basic",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tavily API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as TavilyResponse;
  return (data.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.content?.slice(0, 300) ?? "",
  }));
}
