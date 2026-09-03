#!/usr/bin/env node
/**
 * Launch, doctor, drive, and tear down an isolated Macro instance.
 * Invocation examples live in ../SKILL.md — do not invent flags.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(SCRIPT_DIR, "..");
const REPO_ROOT = path.resolve(SKILL_DIR, "../../..");
const CURRENT_LINK = "/tmp/macro-verify-current";
const FAKE_CLAUDE = "/no/such/macro-claude-binary";
const FAKE_CODEX = "/no/such/macro-codex-binary";

function die(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) flags[key] = true;
      else {
        flags[key] = next;
        i++;
      }
    } else positional.push(a);
  }
  return { flags, positional };
}

function resolveArtifactPath(p) {
  if (path.isAbsolute(p)) return p;
  if (p.startsWith("artifacts/") || p.startsWith(`artifacts${path.sep}`)) {
    return path.join(SKILL_DIR, p);
  }
  return path.resolve(process.cwd(), p);
}

function statePath() {
  if (process.env.MACRO_VERIFY_STATE) return process.env.MACRO_VERIFY_STATE;
  const linked = path.join(CURRENT_LINK, "state.json");
  if (fs.existsSync(linked)) return linked;
  die(
    "No verification state. Run `control-macro launch` first, or set MACRO_VERIFY_STATE.",
  );
}

function readState() {
  const file = statePath();
  const state = JSON.parse(fs.readFileSync(file, "utf8"));
  state._file = file;
  return state;
}

function writeState(dir, state) {
  const file = path.join(dir, "state.json");
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
  return file;
}

function alive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHttp(url, timeoutMs, nextLog) {
  const start = Date.now();
  let last = "";
  while (Date.now() - start < timeoutMs) {
    if (nextLog && fs.existsSync(nextLog)) {
      const log = fs.readFileSync(nextLog, "utf8");
      if (log.includes("Another next dev server is already running")) {
        throw new Error(
          `Next refused to start a second dev server. Set NEXT_DIST_DIR to a unique folder inside the repo. Log: ${nextLog}`,
        );
      }
    }
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.ok || (res.status >= 200 && res.status < 500)) return res.status;
      last = `HTTP ${res.status}`;
    } catch (err) {
      last = err instanceof Error ? err.message : String(err);
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${url} (${last})`);
}

function findFreePort(start) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      const server = net.createServer();
      server.unref();
      server.on("error", (err) => {
        if (err.code === "EADDRINUSE" && port < start + 40) tryPort(port + 1);
        else reject(err);
      });
      server.listen(port, "127.0.0.1", () => {
        const found = server.address().port;
        server.close(() => resolve(found));
      });
    };
    tryPort(start);
  });
}

function sendDaemon(state, payload, timeoutMs = 60_000) {
  return new Promise((resolve, reject) => {
    const sock = net.connect(state.controlPort, "127.0.0.1");
    let buf = "";
    const timer = setTimeout(() => {
      sock.destroy();
      reject(new Error(`control daemon timed out on ${payload.op}`));
    }, timeoutMs);
    sock.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    sock.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      if (!buf.includes("\n")) return;
      clearTimeout(timer);
      sock.end();
      try {
        resolve(JSON.parse(buf.split("\n")[0]));
      } catch (err) {
        reject(err);
      }
    });
    sock.write(JSON.stringify(payload) + "\n");
  });
}

async function runDaemon() {
  const stateFile = process.env.MACRO_VERIFY_STATE;
  if (!stateFile) die("daemon missing MACRO_VERIFY_STATE");
  const readyFile = process.env.MACRO_VERIFY_DAEMON_READY;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  const server = net.createServer((sock) => {
    let buf = "";
    sock.on("data", async (chunk) => {
      buf += chunk.toString("utf8");
      const nl = buf.indexOf("\n");
      if (nl === -1) return;
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      let req;
      try {
        req = JSON.parse(line);
      } catch (err) {
        sock.write(JSON.stringify({ ok: false, error: String(err) }) + "\n");
        return;
      }
      try {
        const result = await handleBrowser(page, req);
        sock.write(JSON.stringify({ ok: true, ...result }) + "\n");
      } catch (err) {
        sock.write(
          JSON.stringify({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }) + "\n",
        );
      }
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const controlPort = server.address().port;
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  state.controlPort = controlPort;
  state.daemonPid = process.pid;
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  if (readyFile) fs.writeFileSync(readyFile, String(controlPort));
  const shutdown = async () => {
    server.close();
    await browser.close().catch(() => undefined);
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

function locator(page, req) {
  if (req.placeholder) return page.getByPlaceholder(req.placeholder);
  if (req.label) return page.getByLabel(req.label, { exact: !!req.exact });
  if (req.role && req.name) {
    return page.getByRole(req.role, { name: req.name, exact: !!req.exact });
  }
  if (req.text) return page.getByText(req.text);
  if (req.selector) return page.locator(req.selector);
  throw new Error("Need --placeholder, --label, --role/--name, --text, or --selector");
}

async function handleBrowser(page, req) {
  const timeout = Number(req.timeout || 20_000);
  switch (req.op) {
    case "goto": {
      const url = req.url;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout });
      return { url: page.url(), title: await page.title() };
    }
    case "click": {
      await locator(page, req).first().click({ timeout });
      return { url: page.url() };
    }
    case "fill": {
      if (req.value === undefined) throw new Error("--value is required");
      await locator(page, req).first().fill(String(req.value), { timeout });
      return {};
    }
    case "wait": {
      await locator(page, req).first().waitFor({ state: "visible", timeout });
      return { text: await locator(page, req).first().innerText() };
    }
    case "screenshot": {
      if (!req.path) throw new Error("--path is required");
      fs.mkdirSync(path.dirname(req.path), { recursive: true });
      await page.screenshot({ path: req.path, fullPage: true });
      return { path: req.path };
    }
    case "snapshot": {
      if (!req.path) throw new Error("--path is required");
      fs.mkdirSync(path.dirname(req.path), { recursive: true });
      const aria = await page.locator("body").ariaSnapshot();
      fs.writeFileSync(req.path, aria);
      return { path: req.path };
    }
    case "title":
      return { title: await page.title(), url: page.url() };
    default:
      throw new Error(`Unknown browser op ${req.op}`);
  }
}

async function cmdLaunch(flags) {
  const runId =
    flags["run-id"] ||
    `${new Date().toISOString().replace(/[:.]/g, "")}-${process.pid}`;
  const host = flags.host || "127.0.0.1";
  const port = flags.port
    ? Number(flags.port)
    : await findFreePort(4173);
  const dir = path.join(os.tmpdir(), `macro-verify-${runId}`);
  fs.mkdirSync(dir, { recursive: true });
  const dbPath = path.join(dir, "app.db");
  const distDir = `.next-verify-${runId}`;
  const url = `http://${host}:${port}`;
  const nextLog = path.join(dir, "next.log");
  const daemonLog = path.join(dir, "daemon.log");
  const readyFile = path.join(dir, "daemon.ready");

  const nextOut = fs.openSync(nextLog, "w");
  const child = spawn(
    "npm",
    ["run", "dev", "--", "--hostname", host, "--port", String(port)],
    {
      cwd: REPO_ROOT,
      detached: true,
      stdio: ["ignore", nextOut, nextOut],
      env: {
        ...process.env,
        CALORIE_LOGGER_DB_PATH: dbPath,
        NEXT_DIST_DIR: distDir,
        AI_PROVIDER: "none",
        AI_CLAUDE_BIN: FAKE_CLAUDE,
        AI_CODEX_BIN: FAKE_CODEX,
        OPENAI_API_KEY: "",
        ANTHROPIC_API_KEY: "",
      },
    },
  );
  fs.closeSync(nextOut);
  if (!child.pid) die("failed to spawn next dev");
  child.unref();

  const state = {
    runId,
    url,
    host,
    port,
    dbPath,
    distDir,
    pid: child.pid,
    aiProvider: "none",
    startedAt: new Date().toISOString(),
    repoRoot: REPO_ROOT,
  };
  const file = writeState(dir, state);
  try {
    fs.rmSync(CURRENT_LINK, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  try {
    fs.symlinkSync(dir, CURRENT_LINK);
  } catch {
    fs.writeFileSync(
      path.join(os.tmpdir(), "macro-verify-current-path"),
      dir,
    );
  }

  try {
    await waitForHttp(url, 120_000, nextLog);
    await waitForHttp(`${url}/api/status`, 30_000, nextLog);
  } catch (err) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      try {
        process.kill(child.pid, "SIGTERM");
      } catch {
        /* ignore */
      }
    }
    die(`Launch failed: ${err instanceof Error ? err.message : err}\nSee ${nextLog}`);
  }

  const daemonOut = fs.openSync(daemonLog, "w");
  const daemon = spawn(process.execPath, [fileURLToPath(import.meta.url), "_daemon"], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: ["ignore", daemonOut, daemonOut],
    env: {
      ...process.env,
      MACRO_VERIFY_STATE: file,
      MACRO_VERIFY_DAEMON_READY: readyFile,
    },
  });
  fs.closeSync(daemonOut);
  daemon.unref();
  const start = Date.now();
  while (!fs.existsSync(readyFile)) {
    if (Date.now() - start > 60_000) {
      die(`Browser daemon failed to start. See ${daemonLog}`);
    }
    await sleep(100);
  }
  const refreshed = JSON.parse(fs.readFileSync(file, "utf8"));
  console.log(
    JSON.stringify(
      {
        ok: true,
        runId,
        url: refreshed.url,
        dbPath: refreshed.dbPath,
        state: file,
        pid: refreshed.pid,
        daemonPid: refreshed.daemonPid,
        export: `export MACRO_VERIFY_STATE=${file}`,
      },
      null,
      2,
    ),
  );
}

async function cmdDoctor() {
  const state = readState();
  const problems = [];
  if (!alive(state.pid)) problems.push(`next pid ${state.pid} is not running`);
  if (state.daemonPid && !alive(state.daemonPid)) {
    problems.push(`browser daemon pid ${state.daemonPid} is not running`);
  }
  if (!fs.existsSync(state.dbPath)) problems.push(`db missing: ${state.dbPath}`);
  let status = null;
  let home = 0;
  try {
    const res = await fetch(state.url);
    home = res.status;
    if (!res.ok) problems.push(`GET ${state.url} -> ${res.status}`);
  } catch (err) {
    problems.push(`GET ${state.url} failed: ${err instanceof Error ? err.message : err}`);
  }
  try {
    const res = await fetch(`${state.url}/api/status`);
    status = await res.json();
    if (status.bannerKind !== "none") {
      problems.push(
        `expected AI bannerKind "none" on a verification instance, got ${status.bannerKind}`,
      );
    }
    if (status.selection && status.selection !== "none" && status.selection !== "auto") {
      problems.push(`unexpected AI selection ${status.selection} (launch pins AI_PROVIDER=none)`);
    }
  } catch (err) {
    problems.push(`/api/status failed: ${err instanceof Error ? err.message : err}`);
  }
  if (state.host !== "127.0.0.1" && state.host !== "localhost") {
    problems.push(`unexpected host ${state.host}`);
  }
  const report = {
    ok: problems.length === 0,
    url: state.url,
    dbPath: state.dbPath,
    pid: state.pid,
    daemonPid: state.daemonPid,
    homeStatus: home,
    bannerKind: status?.bannerKind ?? null,
    aiProvider: state.aiProvider,
    problems,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(2);
}

async function cmdBrowser(op, flags) {
  const state = readState();
  if (!alive(state.daemonPid)) die("browser daemon is not running; relaunch");
  const req = {
    op,
    path: flags.path,
    url: flags.path && !String(flags.path).startsWith("http")
      ? new URL(flags.path, state.url).toString()
      : flags.url || flags.path,
    placeholder: flags.placeholder,
    label: flags.label,
    role: flags.role,
    name: flags.name,
    text: flags.text,
    selector: flags.selector,
    value: flags.value,
    exact: !!flags.exact,
    timeout: flags.timeout,
  };
  if (op === "screenshot" || op === "snapshot") {
    req.path = resolveArtifactPath(String(flags.path));
  }
  const result = await sendDaemon(state, req, Number(flags.timeout || 60_000) + 5_000);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(2);
}

async function cmdHttp(method, flags) {
  const state = readState();
  const url = new URL(flags.path || "/", state.url).toString();
  const headers = { Accept: "application/json" };
  const init = { method, headers };
  if (flags.json) {
    headers["Content-Type"] = "application/json";
    init.body = flags.json;
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep text */
  }
  const out = { ok: res.ok, status: res.status, url, body };
  console.log(JSON.stringify(out, null, 2));
  if (!res.ok) process.exit(2);
}

function cmdCleanup() {
  const state = readState();
  if (state.daemonPid && alive(state.daemonPid)) {
    try {
      process.kill(state.daemonPid, "SIGTERM");
    } catch {
      /* ignore */
    }
  }
  if (state.pid && alive(state.pid)) {
    try {
      process.kill(-state.pid, "SIGTERM");
    } catch {
      try {
        process.kill(state.pid, "SIGTERM");
      } catch {
        /* ignore */
      }
    }
  }
  const dir = path.dirname(state._file);
  if (state.distDir && !String(state.distDir).includes("..")) {
    fs.rmSync(path.join(REPO_ROOT, state.distDir), {
      recursive: true,
      force: true,
    });
  }
  fs.rmSync(dir, { recursive: true, force: true });
  try {
    if (fs.existsSync(CURRENT_LINK) && fs.readlinkSync(CURRENT_LINK) === dir) {
      fs.rmSync(CURRENT_LINK, { force: true });
    }
  } catch {
    /* ignore */
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        cleaned: dir,
        artifactsKept: path.join(SKILL_DIR, "artifacts"),
      },
      null,
      2,
    ),
  );
}

function usage() {
  die(`Usage:
  control-macro launch [--port 4173] [--host 127.0.0.1] [--run-id ID]
  control-macro doctor
  control-macro browser goto --path /
  control-macro browser click --role button --name Log [--exact]
  control-macro browser fill --placeholder "What did you eat" --value "..."
  control-macro browser wait --text Egg [--timeout 20000]
  control-macro browser screenshot --path artifacts/log-meal/after.png
  control-macro browser snapshot --aria --path artifacts/log-meal/after.aria.txt
  control-macro http get --path /api/status
  control-macro http post --path /api/log --json '{"text":"...","date":"YYYY-MM-DD"}'
  control-macro cleanup`);
}

const argv = process.argv.slice(2);
if (argv[0] === "_daemon") {
  await runDaemon();
} else {
  const { flags, positional } = parseArgs(argv);
  const cmd = positional[0];
  if (cmd === "launch") await cmdLaunch(flags);
  else if (cmd === "doctor") await cmdDoctor();
  else if (cmd === "browser") {
    const op = positional[1];
    if (!op) usage();
    if (flags.aria && op === "snapshot") {
      /* accepted for the documented --aria flag */
    }
    await cmdBrowser(op, flags);
  } else if (cmd === "http") {
    const method = (positional[1] || "get").toUpperCase();
    await cmdHttp(method, flags);
  } else if (cmd === "cleanup") cmdCleanup();
  else usage();
}
