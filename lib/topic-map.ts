import type { CuratedResource } from "@/lib/db/schema";

type TopicEntry = Omit<CuratedResource, "summary"> & { summary?: string };

/** Static map: keyword → authoritative Tier-1 resources.
 *  Used by the plan importer to seed curated resources for each task.
 *  Keywords are lowercase; matching is case-insensitive substring search. */
export const TOPIC_MAP: Record<string, TopicEntry[]> = {
  // ── JavaScript / TypeScript ──────────────────────────────────────────────
  javascript: [
    {
      title: "The Modern JavaScript Tutorial",
      url: "https://javascript.info",
      type: "article",
      source: "topic-map",
      summary: "Comprehensive, beginner-friendly JS tutorial from fundamentals to advanced topics.",
    },
    {
      title: "MDN Web Docs — JavaScript",
      url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
      type: "doc",
      source: "topic-map",
      summary: "Authoritative Mozilla reference for all JavaScript language features.",
    },
    {
      title: "freeCodeCamp JavaScript Algorithms and Data Structures",
      url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/",
      type: "course",
      source: "topic-map",
      summary: "Free hands-on JavaScript curriculum with 300+ interactive exercises.",
    },
  ],
  typescript: [
    {
      title: "TypeScript Official Handbook",
      url: "https://www.typescriptlang.org/docs/handbook/intro.html",
      type: "doc",
      source: "topic-map",
      summary: "Official TypeScript handbook covering types, interfaces, generics and more.",
    },
    {
      title: "TypeScript in 5 minutes",
      url: "https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html",
      type: "article",
      source: "topic-map",
      summary: "Quick-start guide to TypeScript for developers who already know JavaScript.",
    },
    {
      title: "Total TypeScript — Free Tutorials",
      url: "https://www.totaltypescript.com/tutorials",
      type: "exercise",
      source: "topic-map",
      summary: "Interactive TypeScript exercises from beginner to advanced, by Matt Pocock.",
    },
  ],
  // ── Python ───────────────────────────────────────────────────────────────
  python: [
    {
      title: "Python Official Documentation",
      url: "https://docs.python.org/3/tutorial/",
      type: "doc",
      source: "topic-map",
      summary: "Official Python tutorial and reference — the authoritative source.",
    },
    {
      title: "Real Python Tutorials",
      url: "https://realpython.com",
      type: "article",
      source: "topic-map",
      summary: "Practical, well-written Python tutorials for all skill levels.",
    },
    {
      title: "freeCodeCamp — Scientific Computing with Python",
      url: "https://www.freecodecamp.org/learn/scientific-computing-with-python/",
      type: "course",
      source: "topic-map",
      summary: "Free Python curriculum covering core programming concepts through projects.",
    },
  ],
  // ── Data Structures & Algorithms ─────────────────────────────────────────
  "data structure": [
    {
      title: "NeetCode 150 — Structured DSA Practice",
      url: "https://neetcode.io/practice",
      type: "exercise",
      source: "topic-map",
      summary: "Curated 150-problem list with video solutions, ordered by topic and difficulty.",
    },
    {
      title: "LeetCode DSA Study Plan",
      url: "https://leetcode.com/studyplan/",
      type: "exercise",
      source: "topic-map",
      summary: "Structured LeetCode study plans for arrays, strings, trees, graphs and more.",
    },
    {
      title: "CS Visualized: Data Structures",
      url: "https://dev.to/lydiahallie/cs-visualized-useful-algorithms-and-data-structures-2c3",
      type: "article",
      source: "topic-map",
      summary: "Visual explanations of common data structures and algorithms.",
    },
  ],
  algorithm: [
    {
      title: "NeetCode — Algorithm Patterns",
      url: "https://neetcode.io/courses/dsa-for-beginners",
      type: "course",
      source: "topic-map",
      summary: "Beginner-friendly DSA course with video explanations of each pattern.",
    },
    {
      title: "LeetCode — Top Interview Questions",
      url: "https://leetcode.com/problem-list/top-interview-questions/",
      type: "exercise",
      source: "topic-map",
      summary: "The most commonly asked interview questions, curated by LeetCode.",
    },
  ],
  leetcode: [
    {
      title: "NeetCode 150",
      url: "https://neetcode.io/practice",
      type: "exercise",
      source: "topic-map",
      summary: "The go-to structured problem list with video walkthroughs.",
    },
    {
      title: "LeetCode Patterns",
      url: "https://seanprashad.com/leetcode-patterns/",
      type: "article",
      source: "topic-map",
      summary: "Categorizes LeetCode problems by pattern to build systematic problem-solving.",
    },
  ],
  // ── SQL & Databases ───────────────────────────────────────────────────────
  sql: [
    {
      title: "SQLZoo — Interactive SQL Tutorial",
      url: "https://sqlzoo.net",
      type: "exercise",
      source: "topic-map",
      summary: "Free interactive SQL exercises from beginner SELECT queries to advanced joins.",
    },
    {
      title: "PostgreSQL Official Documentation",
      url: "https://www.postgresql.org/docs/current/",
      type: "doc",
      source: "topic-map",
      summary: "Authoritative PostgreSQL reference for all SQL features and extensions.",
    },
    {
      title: "LeetCode SQL Study Plan",
      url: "https://leetcode.com/studyplan/top-sql-50/",
      type: "exercise",
      source: "topic-map",
      summary: "Top 50 SQL problems covering SELECT, JOIN, aggregations, and window functions.",
    },
  ],
  database: [
    {
      title: "SQLZoo — Interactive SQL Tutorial",
      url: "https://sqlzoo.net",
      type: "exercise",
      source: "topic-map",
      summary: "Free interactive SQL exercises from beginner SELECT queries to advanced joins.",
    },
    {
      title: "MongoDB University Free Courses",
      url: "https://learn.mongodb.com",
      type: "course",
      source: "topic-map",
      summary: "Official MongoDB courses from beginner CRUD to advanced aggregation pipelines.",
    },
    {
      title: "Use The Index, Luke — SQL Performance",
      url: "https://use-the-index-luke.com",
      type: "article",
      source: "topic-map",
      summary: "In-depth guide to SQL indexing and query performance tuning.",
    },
  ],
  // ── Backend / API ─────────────────────────────────────────────────────────
  api: [
    {
      title: "MDN — HTTP Overview",
      url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview",
      type: "doc",
      source: "topic-map",
      summary: "Authoritative explanation of HTTP: request/response, methods, status codes.",
    },
    {
      title: "REST API Design Best Practices — freeCodeCamp",
      url: "https://www.freecodecamp.org/news/rest-api-design-best-practices-build-a-rest-api/",
      type: "article",
      source: "topic-map",
      summary: "Practical guide to RESTful naming, versioning, error handling, and pagination.",
    },
  ],
  express: [
    {
      title: "Express.js Official Documentation",
      url: "https://expressjs.com/en/guide/routing.html",
      type: "doc",
      source: "topic-map",
      summary: "Official Express routing, middleware, and error handling guide.",
    },
    {
      title: "freeCodeCamp — Back End Development and APIs",
      url: "https://www.freecodecamp.org/learn/back-end-development-and-apis/",
      type: "course",
      source: "topic-map",
      summary: "Project-based course building Node/Express APIs from scratch.",
    },
  ],
  // ── Security ──────────────────────────────────────────────────────────────
  security: [
    {
      title: "OWASP Top 10",
      url: "https://owasp.org/www-project-top-ten/",
      type: "article",
      source: "topic-map",
      summary: "The authoritative list of the 10 most critical web application security risks.",
    },
    {
      title: "Snyk Learn — Free Security Courses",
      url: "https://learn.snyk.io",
      type: "course",
      source: "topic-map",
      summary: "Free interactive security lessons on XSS, SQL injection, and common vulnerabilities.",
    },
    {
      title: "OWASP Cheat Sheet Series",
      url: "https://cheatsheetseries.owasp.org",
      type: "doc",
      source: "topic-map",
      summary: "Concise developer-focused guides for preventing specific vulnerability classes.",
    },
  ],
  owasp: [
    {
      title: "OWASP Top 10",
      url: "https://owasp.org/www-project-top-ten/",
      type: "doc",
      source: "topic-map",
      summary: "The definitive reference for the 10 most critical web security risks.",
    },
    {
      title: "OWASP Cheat Sheet Series",
      url: "https://cheatsheetseries.owasp.org",
      type: "doc",
      source: "topic-map",
      summary: "Developer quick-reference sheets for preventing injection, XSS, auth flaws, and more.",
    },
    {
      title: "Snyk Learn — OWASP Top 10",
      url: "https://learn.snyk.io/lesson/sql-injection/",
      type: "exercise",
      source: "topic-map",
      summary: "Interactive exercises that let you exploit and then fix each OWASP vulnerability.",
    },
  ],
  // ── Git ───────────────────────────────────────────────────────────────────
  git: [
    {
      title: "Pro Git Book (free online)",
      url: "https://git-scm.com/book/en/v2",
      type: "doc",
      source: "topic-map",
      summary: "The complete, authoritative book on Git — free online, covers everything.",
    },
    {
      title: "Learn Git Branching",
      url: "https://learngitbranching.js.org",
      type: "exercise",
      source: "topic-map",
      summary: "Interactive visual exercises for branching, merging, rebasing, and cherry-pick.",
    },
    {
      title: "Conventional Commits",
      url: "https://www.conventionalcommits.org",
      type: "doc",
      source: "topic-map",
      summary: "Specification for writing structured commit messages. Widely adopted convention.",
    },
  ],
  // ── Docker / DevOps ───────────────────────────────────────────────────────
  docker: [
    {
      title: "Docker Official Get Started Guide",
      url: "https://docs.docker.com/get-started/",
      type: "doc",
      source: "topic-map",
      summary: "Official step-by-step Docker tutorial: images, containers, volumes, Compose.",
    },
    {
      title: "Play With Docker — Online Lab",
      url: "https://labs.play-with-docker.com",
      type: "exercise",
      source: "topic-map",
      summary: "Free in-browser Docker playground — no install needed to practice.",
    },
    {
      title: "Docker Compose Documentation",
      url: "https://docs.docker.com/compose/",
      type: "doc",
      source: "topic-map",
      summary: "Official guide to defining multi-container apps with Docker Compose.",
    },
  ],
  "ci/cd": [
    {
      title: "GitHub Actions Documentation",
      url: "https://docs.github.com/en/actions",
      type: "doc",
      source: "topic-map",
      summary: "Official GitHub Actions guide for building CI/CD pipelines.",
    },
    {
      title: "freeCodeCamp — Introduction to CI/CD",
      url: "https://www.freecodecamp.org/news/what-is-ci-cd/",
      type: "article",
      source: "topic-map",
      summary: "Clear explanation of CI/CD concepts, tools, and best practices.",
    },
  ],
  // ── System Design ─────────────────────────────────────────────────────────
  "system design": [
    {
      title: "ByteByteGo System Design Newsletter",
      url: "https://blog.bytebytego.com",
      type: "article",
      source: "topic-map",
      summary: "Visual system design breakdowns of real-world systems by Alex Xu.",
    },
    {
      title: "System Design Primer (GitHub)",
      url: "https://github.com/donnemartin/system-design-primer",
      type: "article",
      source: "topic-map",
      summary: "Comprehensive open-source guide to system design concepts and patterns.",
    },
    {
      title: "Designing Data-Intensive Applications — Overview",
      url: "https://dataintensive.net",
      type: "doc",
      source: "topic-map",
      summary: "Companion site for the best book on distributed systems and data architecture.",
    },
  ],
  // ── AI / LLM ──────────────────────────────────────────────────────────────
  "prompt engineering": [
    {
      title: "Anthropic Prompt Engineering Guide",
      url: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview",
      type: "doc",
      source: "topic-map",
      summary: "Authoritative guide from Anthropic on effective prompt design for Claude.",
    },
    {
      title: "Learn Prompting",
      url: "https://learnprompting.org",
      type: "course",
      source: "topic-map",
      summary: "Free open-source course on prompt engineering from zero to advanced techniques.",
    },
    {
      title: "OpenAI Prompt Engineering Guide",
      url: "https://platform.openai.com/docs/guides/prompt-engineering",
      type: "doc",
      source: "topic-map",
      summary: "Official OpenAI guide with six strategies for getting better results from LLMs.",
    },
  ],
  "llm": [
    {
      title: "Anthropic Claude API Documentation",
      url: "https://docs.anthropic.com/en/docs/overview",
      type: "doc",
      source: "topic-map",
      summary: "Official Anthropic docs: API reference, model guides, and best practices.",
    },
    {
      title: "OpenAI API Cookbook",
      url: "https://cookbook.openai.com",
      type: "article",
      source: "topic-map",
      summary: "Practical code examples for using LLMs in real applications.",
    },
    {
      title: "freeCodeCamp — How to Build LLM Applications",
      url: "https://www.freecodecamp.org/news/large-language-models-beginners-guide/",
      type: "article",
      source: "topic-map",
      summary: "Beginner-friendly walkthrough of building applications with large language models.",
    },
  ],
  rag: [
    {
      title: "LangChain RAG Tutorial",
      url: "https://python.langchain.com/docs/tutorials/rag/",
      type: "doc",
      source: "topic-map",
      summary: "Official LangChain guide to building RAG pipelines with document loaders and retrievers.",
    },
    {
      title: "Pinecone Learning Center — What is RAG?",
      url: "https://www.pinecone.io/learn/retrieval-augmented-generation/",
      type: "article",
      source: "topic-map",
      summary: "Clear conceptual explanation of RAG with diagrams, from the vector DB experts.",
    },
  ],
  "agentic": [
    {
      title: "Anthropic — Building Effective Agents",
      url: "https://www.anthropic.com/research/building-effective-agents",
      type: "article",
      source: "topic-map",
      summary: "Anthropic's guide to designing reliable, capable AI agents.",
    },
    {
      title: "LangGraph Documentation",
      url: "https://langchain-ai.github.io/langgraph/",
      type: "doc",
      source: "topic-map",
      summary: "Official guide to LangGraph for building multi-step stateful AI agents.",
    },
    {
      title: "CrewAI Docs — Getting Started",
      url: "https://docs.crewai.com",
      type: "doc",
      source: "topic-map",
      summary: "CrewAI framework for orchestrating multi-agent collaborations.",
    },
  ],
  mcp: [
    {
      title: "Model Context Protocol — Official Docs",
      url: "https://modelcontextprotocol.io/introduction",
      type: "doc",
      source: "topic-map",
      summary: "The authoritative spec and guide for the MCP standard (USB-C for AI).",
    },
    {
      title: "Anthropic MCP Announcement",
      url: "https://www.anthropic.com/news/model-context-protocol",
      type: "article",
      source: "topic-map",
      summary: "Anthropic's original announcement of MCP with context and examples.",
    },
  ],
  // ── Debugging ─────────────────────────────────────────────────────────────
  debug: [
    {
      title: "VS Code Debugging Guide",
      url: "https://code.visualstudio.com/docs/editor/debugging",
      type: "doc",
      source: "topic-map",
      summary: "Official VS Code docs: breakpoints, watch variables, call stack, and debug console.",
    },
    {
      title: "Chrome DevTools — Debugging JavaScript",
      url: "https://developer.chrome.com/docs/devtools/javascript",
      type: "doc",
      source: "topic-map",
      summary: "Official Chrome DevTools guide to pausing and inspecting JavaScript.",
    },
    {
      title: "freeCodeCamp — Debugging Guide",
      url: "https://www.freecodecamp.org/news/what-is-debugging-how-to-debug-code/",
      type: "article",
      source: "topic-map",
      summary: "Beginner-friendly overview of debugging mindset and tools.",
    },
  ],
  // ── React / Next.js ───────────────────────────────────────────────────────
  react: [
    {
      title: "React Official Documentation",
      url: "https://react.dev",
      type: "doc",
      source: "topic-map",
      summary: "The official React docs — rewritten in 2023, excellent for all levels.",
    },
    {
      title: "Next.js Official Documentation",
      url: "https://nextjs.org/docs",
      type: "doc",
      source: "topic-map",
      summary: "Authoritative Next.js guide: App Router, RSC, routing, API routes, deployment.",
    },
  ],
  "next.js": [
    {
      title: "Next.js Official Documentation",
      url: "https://nextjs.org/docs",
      type: "doc",
      source: "topic-map",
      summary: "Authoritative Next.js guide: App Router, RSC, routing, API routes, deployment.",
    },
    {
      title: "Next.js Learn Course",
      url: "https://nextjs.org/learn",
      type: "course",
      source: "topic-map",
      summary: "Official interactive Next.js course — build a dashboard app step by step.",
    },
  ],
  // ── Cloud / Deployment ────────────────────────────────────────────────────
  "deploy": [
    {
      title: "Vercel Documentation",
      url: "https://vercel.com/docs",
      type: "doc",
      source: "topic-map",
      summary: "Official Vercel docs: deploying Next.js, environment variables, custom domains.",
    },
    {
      title: "Railway Documentation",
      url: "https://docs.railway.app",
      type: "doc",
      source: "topic-map",
      summary: "Official Railway docs for deploying Node, Python, and database services.",
    },
    {
      title: "freeCodeCamp — DevOps and CI/CD",
      url: "https://www.freecodecamp.org/news/devops-for-developers/",
      type: "article",
      source: "topic-map",
      summary: "Beginner-friendly DevOps overview covering Docker, CI/CD, and cloud deployment.",
    },
  ],
  // ── Authentication ────────────────────────────────────────────────────────
  auth: [
    {
      title: "Auth.js (NextAuth v5) Documentation",
      url: "https://authjs.dev",
      type: "doc",
      source: "topic-map",
      summary: "Official Auth.js docs for authentication with Next.js, including OAuth and credentials.",
    },
    {
      title: "JWT.io — Introduction to JSON Web Tokens",
      url: "https://jwt.io/introduction",
      type: "article",
      source: "topic-map",
      summary: "Clear introduction to JWT structure, signing, and verification.",
    },
  ],
};

/** Given a task title and section, returns all matching Tier-1 curated resources. */
export function getCuratedResources(title: string, section: string): CuratedResource[] {
  const combined = `${title} ${section}`.toLowerCase();
  const seen = new Set<string>();
  const results: CuratedResource[] = [];

  for (const [keyword, entries] of Object.entries(TOPIC_MAP)) {
    if (combined.includes(keyword)) {
      for (const entry of entries) {
        if (!seen.has(entry.url)) {
          seen.add(entry.url);
          results.push({
            ...entry,
            summary: entry.summary ?? "",
          });
        }
      }
    }
  }

  // Every task gets at least 3 resources; fall back to JavaScript + Git + debugging
  if (results.length < 3) {
    const fallbacks: Array<{ keyword: string; needed: boolean }> = [
      { keyword: "javascript", needed: !seen.has("https://javascript.info") },
      { keyword: "git", needed: !seen.has("https://git-scm.com/book/en/v2") },
      { keyword: "debug", needed: !seen.has("https://code.visualstudio.com/docs/editor/debugging") },
    ];
    for (const { keyword, needed } of fallbacks) {
      if (needed && results.length < 3) {
        const entries = TOPIC_MAP[keyword] ?? [];
        for (const entry of entries) {
          if (!seen.has(entry.url) && results.length < 3) {
            seen.add(entry.url);
            results.push({ ...entry, summary: entry.summary ?? "" });
          }
        }
      }
    }
  }

  return results;
}
