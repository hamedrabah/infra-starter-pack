import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import YAML from "yaml";

const IGNORE = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/coverage/**",
  "**/vendor/**"
];

const LANGUAGE_BY_EXTENSION = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".py": "Python",
  ".go": "Go",
  ".rs": "Rust",
  ".java": "Java",
  ".rb": "Ruby",
  ".php": "PHP",
  ".cs": "C#"
};

const FRAMEWORKS = {
  next: "Next.js",
  react: "React",
  express: "Express",
  fastify: "Fastify",
  hono: "Hono",
  "@nestjs/core": "NestJS",
  vue: "Vue",
  svelte: "Svelte",
  astro: "Astro",
  remix: "Remix"
};

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

async function findOpenApi(root) {
  const candidates = await fg(
    ["**/*openapi*.{json,yaml,yml}", "**/*swagger*.{json,yaml,yml}"],
    { cwd: root, ignore: IGNORE, onlyFiles: true, dot: false }
  );
  const specs = [];
  for (const relative of candidates.slice(0, 25)) {
    try {
      const raw = await fs.readFile(path.join(root, relative), "utf8");
      const doc = relative.endsWith(".json") ? JSON.parse(raw) : YAML.parse(raw);
      if (doc?.openapi || doc?.swagger) {
        specs.push({
          path: relative,
          version: String(doc.openapi || doc.swagger),
          title: doc.info?.title || path.basename(relative),
          endpointCount: Object.keys(doc.paths || {}).length
        });
      }
    } catch {
      // A malformed candidate is reported by Mintlify validation later.
    }
  }
  return specs;
}

function nextRouteFromFile(file) {
  const appMatch = file.match(/(?:^|\/)app\/(.+)\/route\.(?:js|jsx|ts|tsx)$/);
  if (appMatch) {
    const route = appMatch[1]
      .split("/")
      .filter((part) => !part.startsWith("("))
      .map((part) => part.startsWith("[") ? `:${part.slice(1, -1)}` : part)
      .join("/");
    return `/api/${route}`.replace("/api/api/", "/api/");
  }
  const pagesMatch = file.match(/(?:^|\/)pages\/api\/(.+)\.(?:js|jsx|ts|tsx)$/);
  if (pagesMatch) return `/api/${pagesMatch[1].replace(/\/index$/, "")}`;
  return null;
}

async function findRoutes(root, sourceFiles) {
  const found = new Map();
  const methodPattern = /\b(?:app|router|server)\s*\.\s*(get|post|put|patch|delete|options|head)\s*\(\s*["'`]([^"'`]+)["'`]/gi;
  for (const relative of sourceFiles.slice(0, 1500)) {
    const nextRoute = nextRouteFromFile(relative);
    if (nextRoute) found.set(`ANY ${nextRoute}`, { method: "ANY", path: nextRoute, source: relative, confidence: "inferred" });
    let raw;
    try {
      raw = await fs.readFile(path.join(root, relative), "utf8");
    } catch {
      continue;
    }
    for (const match of raw.matchAll(methodPattern)) {
      const method = match[1].toUpperCase();
      const routePath = match[2];
      found.set(`${method} ${routePath}`, { method, path: routePath, source: relative, confidence: "observed" });
    }
  }
  return [...found.values()].slice(0, 200);
}

export async function scanRepository(inputRoot = process.cwd()) {
  const root = path.resolve(inputRoot);
  const stat = await fs.stat(root).catch(() => null);
  if (!stat?.isDirectory()) throw new Error(`Repository directory does not exist: ${root}`);

  const files = await fg(["**/*"], { cwd: root, ignore: IGNORE, onlyFiles: true, dot: false });
  const packageJson = await readJson(path.join(root, "package.json"));
  const dependencies = { ...(packageJson?.dependencies || {}), ...(packageJson?.devDependencies || {}) };
  const languageCounts = {};
  const sourceFiles = [];
  for (const file of files) {
    const language = LANGUAGE_BY_EXTENSION[path.extname(file).toLowerCase()];
    if (!language) continue;
    languageCounts[language] = (languageCounts[language] || 0) + 1;
    sourceFiles.push(file);
  }

  const frameworks = Object.entries(FRAMEWORKS)
    .filter(([dependency]) => dependency in dependencies)
    .map(([, label]) => label);
  const packageManager = files.includes("pnpm-lock.yaml") ? "pnpm"
    : files.includes("yarn.lock") ? "yarn"
      : files.includes("bun.lockb") || files.includes("bun.lock") ? "bun"
        : files.includes("package-lock.json") ? "npm" : null;
  const readme = files.find((file) => /^readme(?:\.[^.]+)?$/i.test(file));
  const openapi = await findOpenApi(root);
  const routes = await findRoutes(root, sourceFiles.filter((file) => /\.(?:js|jsx|ts|tsx)$/.test(file)));

  return {
    schemaVersion: 1,
    scannedAt: new Date().toISOString(),
    root,
    name: packageJson?.name || path.basename(root),
    description: packageJson?.description || "",
    packageManager,
    languages: Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, files]) => ({ name, files })),
    frameworks,
    scripts: packageJson?.scripts || {},
    readme: readme || null,
    openapi,
    routes,
    totals: { files: files.length, sourceFiles: sourceFiles.length }
  };
}
