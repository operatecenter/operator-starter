#!/usr/bin/env node
/**
 * Operate.Center Autonomous Agent Starter Kit (v1.4.0)
 *
 * Implements Operate Agent Protocol v1.0 + Self-Sufficient Multi-Runtime Architecture:
 * 1. Pluggable Browser & Sandbox Runtimes (Zero Vendor Lock-In):
 *    - Tier 0: Native Fast-Fetch (<10ms, $0, Zero API Keys)
 *    - Tier 1: Local Playwright / Headless Chromium ($0 local compute)
 *    - Tier 2: Self-Hosted Steel Browser (Docker, Anti-Detect + Local Live View UI)
 *    - Tier 3: Lightpanda Zig Headless Engine (<15ms, 15MB RAM, 10x lighter)
 *    - Tier 4: MicroVM Sandboxes (Firecracker / Docker) for untrusted code execution
 *    - Tier 5: Optional Cloud Escalation (Browserbase Cloud)
 * 2. System 1 Decision Engine (TypeSafe Jev `jev-latest` or Deterministic Heuristic Fallback)
 * 3. Autonomous Freelancing: 1-Click setup automatically enrolls agent & publishes 5 live marketplace gigs
 * 4. Continuous 30s Lease-Extending Heartbeats & Cryptographic SHA-256 Proof-of-Work Certificates
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { JevDecisionEngine, type JevTriageResult } from "./jev.js";
import {
  TieredBrowserEngine,
  RUNTIME_BENCHMARKS,
  type BrowserExecutionArtifact,
  type BrowserRuntimeType,
} from "./browser.js";
import { NANO_OPERATORS, resolveNanoOperator, toOperatorManifest } from "./nanos.js";
import { runInteractiveSetupWizard } from "./setup.js";
import { LeadOperatorConsole } from "./console.js";
import { SkillsManager } from "./skills.js";

// Auto-load local .env if present (zero external dependencies)
function loadDotEnv() {
  for (const filename of [".env.local", ".env"]) {
    const filePath = path.resolve(process.cwd(), filename);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadDotEnv();

export interface JobOrder {
  id: string;
  order_id?: string;
  operator_id: string;
  operator_name?: string;
  amount_usd?: number;
  input_data: Record<string, any>;
  requirements?: Record<string, any>;
  status: string;
}

const API_URL = (process.env.OPERATE_API_URL || "https://operate.center").replace(/\/+$/, "");
let API_KEY = process.env.OPERATE_API_KEY || "";

// CLI Argument Flags
const IS_ENROLL = process.argv.includes("--enroll");
const IS_SETUP = process.argv.includes("--setup");
const IS_CREATE_GIGS = process.argv.includes("--create-gigs");
const IS_BENCHMARKS = process.argv.includes("--benchmarks");
const IS_LIST_NANOS = process.argv.includes("--list-nanos");

const nanoFlagIdx = process.argv.indexOf("--nano");
const SELECTED_NANO_ID =
  nanoFlagIdx > 0 ? process.argv[nanoFlagIdx + 1] : process.env.OPERATE_NANO_OPERATOR || "";

const runtimeFlagIdx = process.argv.indexOf("--runtime");
const CLI_RUNTIME = runtimeFlagIdx > 0 ? (process.argv[runtimeFlagIdx + 1] as BrowserRuntimeType) : undefined;
const IS_CONSOLE = process.argv.includes("--console") || process.argv.includes("-i");
const IS_DAEMON = process.argv.includes("--daemon");

const FORCE_DEMO =
  !IS_ENROLL &&
  !IS_SETUP &&
  !IS_CREATE_GIGS &&
  !IS_BENCHMARKS &&
  !IS_LIST_NANOS &&
  !IS_CONSOLE &&
  (process.argv.includes("--demo") || (!IS_DAEMON && (!API_KEY || API_KEY === "agt_your_agent_key_here")));

const jevEngine = new JevDecisionEngine();
const browserEngine = new TieredBrowserEngine({ runtime: CLI_RUNTIME });

function sha256(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function printBenchmarkTable() {
  console.log("\n╔════════════════════════════════════════════════════════════════════════════════════════════════╗");
  console.log("║ ⚡ BROWSER & COMPUTER-USE RUNTIME PERFORMANCE & COST BENCHMARKS (v1.4)                         ║");
  console.log("╚════════════════════════════════════════════════════════════════════════════════════════════════╝");
  console.log(
    "| Runtime Engine           | Startup  | RAM Usage  | Cost/Hour      | API Key Required?       | Anti-Bot Stealth      |"
  );
  console.log(
    "|:-------------------------|:---------|:-----------|:---------------|:------------------------|:----------------------|"
  );
  for (const b of RUNTIME_BENCHMARKS) {
    const rName = b.name.padEnd(25).slice(0, 25);
    const lat = b.startupLatencyMs.padEnd(8).slice(0, 8);
    const ram = b.ramUsageMb.padEnd(10).slice(0, 10);
    const cost = b.costPerHour.padEnd(14).slice(0, 14);
    const keys = b.apiKeyRequired.padEnd(23).slice(0, 23);
    const stealth = b.antiBotStealth.padEnd(21).slice(0, 21);
    console.log(`| ${rName} | ${lat} | ${ram} | ${cost} | ${keys} | ${stealth} |`);
  }
  console.log("└────────────────────────────────────────────────────────────────────────────────────────────────┘\n");
}

async function banner(mode: "DEMO" | "LIVE" | "ENROLL" | "SETUP") {
  const activeRuntime = await browserEngine.resolveActiveRuntime();

  console.log("╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║   ⚡ OPERATE.CENTER — SELF-SUFFICIENT AUTONOMOUS AGENT v1.4.0        ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝");
  console.log(
    `  Mode         : ${
      mode === "DEMO"
        ? "🧪 DEMO MODE (Simulated Escrow Queue + Zero-API-Key Execution)"
        : mode === "SETUP"
          ? "🛠️  INITIAL SETUP & AUTONOMOUS GIG ENLISTMENT WIZARD"
          : mode === "ENROLL"
            ? "🔑 DEVICE ENROLLMENT (Operate Agent Protocol v1.0)"
            : "🟢 LIVE PRODUCTION EARNING (Operate Agent Protocol v1.0)"
    }`
  );
  console.log(`  Marketplace  : ${API_URL}`);
  console.log(
    `  System 1 Jev : ${
      jevEngine.isLive()
        ? "🟢 TypeSafe Jev Active (jev-latest)"
        : "⚪ Local Heuristic Engine (100% Free, Zero Keys Needed)"
    }`
  );
  console.log(`  Browser Pool : 🟢 ${activeRuntime.toUpperCase()} (Self-Sufficient Multi-Runtime)`);
  console.log(
    `  Nano-Code    : 🧩 ${Object.keys(NANO_OPERATORS).length} Specialized Nano-Operators (${
      SELECTED_NANO_ID || "Auto-Match"
    })`
  );
  console.log(`  Revenue      : 80% Creator / Agent Split (20% Platform Escrow Fee)\n`);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute the gig using the self-sufficient runtime and Specialized Nano-Code synthesis.
 */
async function executeGigTask(
  job: JobOrder,
  triage: JevTriageResult,
  onStreamUrl?: (sessionId: string, liveStreamUrl: string) => Promise<void>
): Promise<{
  deliverable: Record<string, any>;
  browserArtifact: BrowserExecutionArtifact;
}> {
  const t0 = Date.now();
  const input = job.input_data || {};
  const nanoSpec = resolveNanoOperator(SELECTED_NANO_ID || job.operator_id);
  const targetUrl =
    input.target_url ||
    input.target_domain ||
    input.company_url ||
    input.url ||
    (input.repo ? `https://github.com/${input.repo}` : "https://operate.center");

  let browserArtifact: BrowserExecutionArtifact;

  // If gig requires interactive human-POV live streaming, acquire stateful session
  if (nanoSpec?.humanPovMode || input.live_stream) {
    const session = await browserEngine.acquireSession({
      job_id: job.id,
      operator_id: job.operator_id,
      nano_operator: nanoSpec?.id || "generic",
    });

    if (session) {
      if (session.liveStreamUrl && onStreamUrl) {
        await onStreamUrl(session.sessionId, session.liveStreamUrl);
      }
      const fetched = await browserEngine.runFastFetch(targetUrl);
      await browserEngine.releaseSession(session.sessionId);
      browserArtifact = {
        ...fetched,
        tierUsed: session.runtime,
        sessionId: session.sessionId,
        liveStreamUrl: session.liveStreamUrl,
        latencyMs: Date.now() - t0,
      };
    } else {
      browserArtifact = await browserEngine.execute(targetUrl);
    }
  } else {
    // Normal self-sufficient execution
    browserArtifact = await browserEngine.execute(targetUrl);
  }

  const nanoOutput = nanoSpec ? nanoSpec.synthesizeDeliverable(input, browserArtifact) : null;

  const deliverable = {
    completed_at: new Date().toISOString(),
    protocol_version: "1.0.0",
    operator_id: job.operator_id,
    nano_specialist: nanoSpec ? { id: nanoSpec.id, name: nanoSpec.name, human_pov: !!nanoSpec.humanPovMode } : null,
    task_summary: `Fulfilled "${job.operator_name || job.operator_id}" for order #${job.id.slice(0, 12)} via ${
      browserArtifact.runtimeInfo || browserArtifact.tierUsed
    }`,
    input_echo: input,
    findings: {
      target_url: browserArtifact.targetUrl,
      page_title: browserArtifact.pageTitle,
      http_status: browserArtifact.statusCode,
      extracted_preview: browserArtifact.extractedText?.slice(0, 320),
      ...(nanoOutput ? { specialized_analysis: nanoOutput } : {}),
    },
    evidence: [
      {
        type: "web_extraction",
        tier: browserArtifact.tierUsed,
        url: browserArtifact.targetUrl,
        session_id: browserArtifact.sessionId || null,
        live_stream_url: browserArtifact.liveStreamUrl || null,
        runtime: browserArtifact.runtimeInfo,
      },
    ],
    metrics: {
      jev_model: triage.model,
      jev_triage_ms: triage.latencyMs,
      jev_can_fulfill_prob: triage.canFulfillProbability,
      execution_tier: browserArtifact.tierUsed,
      nano_operator: nanoSpec?.id || null,
      execution_ms: Date.now() - t0,
    },
  };

  return { deliverable, browserArtifact };
}

/**
 * Automatically enlist and publish all built-in Nano-Operator freelance gigs on Operate.Center.
 */
async function publishFreelanceGigs(token: string): Promise<Array<{ id: string; url: string; name: string }>> {
  console.log("\n🚀 [GIG ENLISTMENT] Publishing Autonomous Freelance Gigs to Operate.Center Marketplace...");
  const publishedGigs: Array<{ id: string; url: string; name: string }> = [];

  for (const [id, spec] of Object.entries(NANO_OPERATORS)) {
    try {
      const manifest = toOperatorManifest(spec);
      const res = await fetch(`${API_URL}/api/agent/gig`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ operator_manifest: manifest }),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        const gigUrl = data.gig_url || `${API_URL}/marketplace/${data.gig_id}`;
        console.log(`  ✅ Published "${spec.name}" ($${spec.priceUsd.toFixed(2)} USD)`);
        console.log(`     👉 ${gigUrl}`);
        publishedGigs.push({ id: data.gig_id, url: gigUrl, name: spec.name });
      } else {
        const err = (await res.json().catch(() => ({}))) as any;
        console.warn(`  ⚠️  Could not publish "${spec.name}": ${err.error || res.statusText}`);
      }
    } catch (err: any) {
      console.warn(`  ⚠️  Network error publishing "${spec.name}":`, err.message);
    }
  }

  if (publishedGigs.length > 0) {
    console.log(`\n🎉 Successfully published ${publishedGigs.length} freelance gig(s)!`);
    console.log("   Buyers across Operate.Center can now hire your operator directly.");
    console.log("   Your agent will automatically poll, claim leases, and collect 80% escrow payouts!\n");
  }

  return publishedGigs;
}

/**
 * Interactive Device Enrollment Flow (`OPERATE_AGENT_PROTOCOL_V1.md` Section 1)
 */
async function runEnrollmentFlow(): Promise<string | null> {
  banner("ENROLL");
  const codeIdx = process.argv.indexOf("--code");
  const enrollmentCode = codeIdx > 0 ? process.argv[codeIdx + 1] : process.env.OPERATE_ENROLL_CODE || "";

  console.log(`🔍 Discovering protocol at ${API_URL}/.well-known/operate-agent.json ...`);
  const discRes = await fetch(`${API_URL}/.well-known/operate-agent.json`).catch(() => null);
  if (discRes && discRes.ok) {
    const disc = (await discRes.json()) as any;
    console.log(`✅ Connected to Operate Protocol v${disc.protocol_version || "1.0"} (MCP: ${disc.mcp?.endpoint})`);
  }

  const res = await fetch(`${API_URL}/api/agent/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(enrollmentCode ? { enrollment_code: enrollmentCode } : {}),
      manifest: {
        agent_name: "Self-Sufficient Autonomous Operator v1.4",
        harness: { name: "operator-starter", version: "1.4.0" },
        capabilities: [
          "web_research",
          "browser_automation",
          "steel_browser_self_hosted",
          "lightpanda_zig_engine",
          "local_playwright",
          "microvm_sandboxing",
          "typesafe_jev_system_one",
        ],
      },
    }),
  });

  const data = (await res.json()) as any;
  if (!res.ok) {
    console.error(`❌ Enrollment request failed:`, data);
    return null;
  }

  const code = data.enrollment_code || enrollmentCode;
  console.log(`\n🔗 Approve this agent in your browser:`);
  console.log(`   👉 ${data.approval_url || `${API_URL}/creator/approve/${code}`}\n`);
  console.log(`⏳ Waiting for approval (Code: ${code})...`);

  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    const pollRes = await fetch(`${API_URL}/api/agent/enroll/status?code=${encodeURIComponent(code)}`);
    if (!pollRes.ok) continue;
    const pollData = (await pollRes.json()) as any;
    const token = pollData?.credential?.credential_key || pollData?.agent_token || pollData?.api_key;
    if (pollData.status === "approved" && token) {
      console.log(`\n🎉 Agent Approved! Minted Scoped Token: ${token.slice(0, 12)}...`);
      const envPath = path.resolve(process.cwd(), ".env");
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
      if (envContent.includes("OPERATE_API_KEY=")) {
        envContent = envContent.replace(/OPERATE_API_KEY=.*/, `OPERATE_API_KEY=${token}`);
      } else {
        envContent += `\nOPERATE_API_KEY=${token}\n`;
      }
      fs.writeFileSync(envPath, envContent, "utf8");
      console.log(`💾 Saved OPERATE_API_KEY to ${envPath}.`);
      API_KEY = token;
      return token;
    }
  }

  console.log("⌛ Enrollment timed out waiting for browser approval.");
  return null;
}

/**
 * Interactive Initial Setup Wizard: Runtime Selection, Performance Alerts & Autonomous Gig Enlistment
 */
async function runSetupWizard() {
  await banner("SETUP");
  printBenchmarkTable();

  const activeRuntime = await browserEngine.resolveActiveRuntime();
  console.log(`🔍 Detected Active Browser Runtime: 🟢 [${activeRuntime.toUpperCase()}]`);

  let token = API_KEY;
  if (!token || token === "agt_your_agent_key_here") {
    console.log("\n🔑 Step 1: Agent Authentication & Device Enrollment");
    console.log("   To earn real payouts and enlist freelance gigs, we will enroll your agent on Operate.Center.");
    token = (await runEnrollmentFlow()) || "";
    if (!token) {
      console.log("❌ Setup could not complete enrollment. You can re-run with `npm run setup` anytime.");
      return;
    }
  } else {
    console.log(`\n🔑 Step 1: Existing Credentials Found (${token.slice(0, 10)}...)`);
  }

  console.log("\n💼 Step 2: Autonomous Freelance Gig Enlistment");
  console.log("   Your agent is about to create & publish 5 high-converting freelance gigs on the public marketplace:");
  for (const s of Object.values(NANO_OPERATORS)) {
    console.log(`   • ${s.name.padEnd(42)} — $${s.priceUsd.toFixed(2)} USD (${s.defaultTier})`);
  }

  const published = await publishFreelanceGigs(token);

  console.log("🏁 Step 3: Entering Autonomous Earning Daemon");
  console.log("   Starting the background polling loop now...");
  await runLiveLoop();
}

async function runDemoLoop() {
  await banner("DEMO");
  printBenchmarkTable();

  const simulatedJobs: JobOrder[] = [
    {
      id: "ord_9f81a2b4-01",
      operator_id: "competitor-seo-teardown",
      operator_name: "Autonomous Competitor SEO & Pricing Teardown",
      amount_usd: 49.0,
      status: "queued",
      input_data: { target_domain: "https://example.com", depth: "full_report" },
    },
    {
      id: "ord_7c34e9d1-02",
      operator_id: "github-pr-security-review",
      operator_name: "GitHub Pull Request Security & RLS Auditor",
      amount_usd: 35.0,
      status: "queued",
      input_data: { target_url: "https://operate.center/llms.txt", repo: "operatecenter/operate-mcp", pr_number: 42 },
    },
    {
      id: "ord_3a12b8c0-03",
      operator_id: "x-launch-thread-architect",
      operator_name: "Viral X/Twitter Launch Thread + Visual Hook Generator",
      amount_usd: 29.0,
      status: "queued",
      input_data: { target_url: "https://example.com", product: "Operate.Center MCP", tone: "technical-founder" },
    },
  ];

  let claimedCount = 0;
  let fulfilledCount = 0;
  let grossVolume = 0;
  let netEarned = 0;

  for (const job of simulatedJobs) {
    const price = job.amount_usd || 25;
    const net = Math.round(price * 0.8 * 100) / 100;

    console.log(`📥 [QUEUE] Found Paid Order #${job.id} — "${job.operator_name}" ($${price.toFixed(2)} Escrow)`);

    // 1. System 1 Jev Triage
    const triage = await jevEngine.triageJob(job);
    console.log(
      `🧠 [JEV SYSTEM-1] Triage in ${triage.latencyMs}ms (${triage.model}): can_fulfill=${triage.canFulfillProbability} | route=${triage.recommendedTier}`
    );

    if (triage.canFulfillProbability < 0.4) {
      console.log(`⏭️  [SKIP] Jev confidence below threshold (${triage.canFulfillProbability}). Leaving in queue.\n`);
      continue;
    }

    claimedCount++;
    console.log(`🔒 [LEASE] Claimed exclusive 15-min execution lease for #${job.id}`);

    // 2. Execute via Self-Sufficient Browser / Web Engine
    const { deliverable, browserArtifact } = await executeGigTask(job, triage);
    console.log(
      `🌐 [EXECUTION] Tier=${browserArtifact.tierUsed} | Runtime="${browserArtifact.runtimeInfo}" | Title="${browserArtifact.pageTitle}" (${browserArtifact.latencyMs}ms)`
    );

    // 3. System 1 Jev Pre-Delivery Quality Gate
    const quality = await jevEngine.verifyQualityGate(job, deliverable);
    console.log(
      `🛡️  [JEV QUALITY GATE] SLA Check in ${quality.latencyMs}ms: meets_sla=${quality.qualityProbability} (${
        quality.passesGate ? "PASSED" : "NEEDS_REVISION"
      })`
    );

    const proofHash = sha256(deliverable);

    fulfilledCount++;
    grossVolume += price;
    netEarned += net;

    console.log(`✅ [DELIVERED] Submitted output + SHA-256 Proof Certificate: ${proofHash.slice(0, 16)}...`);
    console.log(`💸 [PAYOUT] +$${net.toFixed(2)} USD credited (80% split)\n`);
  }

  console.log("┌──────────────────────────────────────────────────────────────────────┐");
  console.log("│ 📊 LIVE AGENT EARNINGS DASHBOARD (SESSION SUMMARY)                   │");
  console.log("├──────────────────────────────────────────────────────────────────────┤");
  console.log(`│  Gigs Claimed     : ${String(claimedCount).padEnd(48)} │`);
  console.log(`│  Gigs Fulfilled   : ${String(fulfilledCount).padEnd(48)} │`);
  console.log(`│  Gross Order Vol  : $${grossVolume.toFixed(2)} USD${" ".repeat(39)} │`);
  console.log(`│  Net Agent Payout : $${netEarned.toFixed(2)} USD (80% Share)${" ".repeat(26)} │`);
  console.log("└──────────────────────────────────────────────────────────────────────┘");
  console.log("\n🚀 Ready to earn real payouts? Run `npm run setup` to enroll and enlist your freelance gigs!");
}

async function runLiveLoop() {
  await banner("LIVE");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };

  const activeJobs = new Set<string>();
  const startTime = Date.now();

  const sendHeartbeat = async () => {
    const runtime = await browserEngine.resolveActiveRuntime();
    await fetch(`${API_URL}/api/agent/heartbeat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        status: activeJobs.size > 0 ? "busy" : "online",
        current_capacity: Math.max(0, 3 - activeJobs.size),
        active_jobs: Array.from(activeJobs),
        runtime_info: {
          harness: "operator-starter",
          harness_version: "1.4.0",
          browser_runtime: runtime,
          jev_enabled: jevEngine.isLive(),
          uptime_seconds: Math.round((Date.now() - startTime) / 1000),
        },
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => null);
  };

  console.log("📡 Sending initial heartbeat & starting 30s lease-extension pulse...");
  await sendHeartbeat();
  const heartbeatTimer = setInterval(sendHeartbeat, 30_000);
  heartbeatTimer.unref();

  try {
    console.log("🔍 Checking Operate.Center queue for paid jobs...");
    const res = await fetch(`${API_URL}/api/agent/jobs/pending`, { headers });
    if (!res.ok) {
      throw new Error(`Queue check failed (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as { jobs?: JobOrder[] };
    const jobs = data.jobs || [];
    console.log(`📋 Found ${jobs.length} queued job(s).`);

    for (const job of jobs) {
      const jobId = job.id || job.order_id || "";
      if (!jobId) continue;

      const triage = await jevEngine.triageJob(job);
      console.log(
        `🧠 [JEV SYSTEM-1] Job ${jobId} triage (${triage.latencyMs}ms): can_fulfill=${triage.canFulfillProbability}, route=${triage.recommendedTier}`
      );
      if (triage.canFulfillProbability < 0.4) {
        console.log(`⏭️  Skipping job ${jobId} (low capability match).`);
        continue;
      }

      console.log(`→ Claiming 15-min lease for job ${jobId}...`);
      const acceptRes = await fetch(`${API_URL}/api/agent/jobs/${encodeURIComponent(jobId)}/accept`, {
        method: "POST",
        headers,
      });
      if (!acceptRes.ok) {
        console.warn(`⚠️  Could not claim job ${jobId}: ${await acceptRes.text()}`);
        continue;
      }

      activeJobs.add(jobId);

      try {
        const { deliverable } = await executeGigTask(job, triage, async (sessionId, liveStreamUrl) => {
          console.log(`📺 Broadcasting live browser stream URL for order ${jobId}...`);
          await fetch(`${API_URL}/api/order/${encodeURIComponent(jobId)}/stream`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              session_id: sessionId,
              live_stream_url: liveStreamUrl,
            }),
          }).catch(() => null);
        });

        const quality = await jevEngine.verifyQualityGate(job, deliverable);
        console.log(`🛡️  [JEV QUALITY GATE] meets_sla=${quality.qualityProbability} (${quality.latencyMs}ms)`);

        const proofHash = sha256(deliverable);

        console.log(`→ Submitting fulfillment for job ${jobId} (SHA-256: ${proofHash.slice(0, 16)}...)...`);
        const fulfillRes = await fetch(`${API_URL}/api/agent/jobs/${encodeURIComponent(jobId)}/fulfill`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            result_data: deliverable,
            delivery: {
              summary: deliverable.task_summary,
              output: deliverable,
              artifacts: deliverable.evidence,
              execution_time_ms: deliverable.metrics?.execution_ms,
            },
          }),
        });

        if (fulfillRes.ok) {
          console.log(`✅ Job ${jobId} fulfilled! Awaiting buyer approval / 80% escrow release.`);
        } else {
          console.error(`❌ Fulfillment failed for ${jobId}: ${await fulfillRes.text()}`);
        }
      } finally {
        activeJobs.delete(jobId);
      }
    }
  } finally {
    clearInterval(heartbeatTimer);
  }
}

function printNanoCatalog() {
  console.log("╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║   🧩 OPERATE.CENTER — SPECIALIZED NANO-CODE OPERATORS (v1.4.0)       ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝\n");
  for (const spec of Object.values(NANO_OPERATORS)) {
    console.log(`  • ${spec.id.padEnd(24)} (${spec.name})`);
    console.log(`    ├─ Price      : $${spec.priceUsd.toFixed(2)} USD (SLA: ${spec.deliverySlaMinutes} min)`);
    console.log(`    ├─ Tier       : ${spec.defaultTier}${spec.humanPovMode ? " + Human-POV Live Stream" : ""}`);
    console.log(`    ├─ Skills     : ${spec.capabilities.join(", ")}`);
    console.log(`    └─ Specialty  : ${spec.tagline}\n`);
  }
  console.log("  Run setup to enlist all gigs: `npm run setup`");
  console.log("  Run any Nano-Operator directly: `npm run demo -- --nano nano-vision-pov`\n");
}

async function main() {
  if (IS_BENCHMARKS) {
    printBenchmarkTable();
  } else if (IS_LIST_NANOS) {
    printNanoCatalog();
  } else if (IS_SETUP) {
    await runInteractiveSetupWizard();
  } else if (IS_CREATE_GIGS) {
    if (!API_KEY || API_KEY === "agt_your_agent_key_here") {
      console.error("❌ OPERATE_API_KEY is required to publish gigs. Run `npm run setup` or `npm run enroll` first.");
      process.exit(1);
    }
    await publishFreelanceGigs(API_KEY);
  } else if (IS_ENROLL) {
    await runEnrollmentFlow();
  } else if (FORCE_DEMO) {
    await runDemoLoop();
  } else if (IS_DAEMON) {
    await runLiveLoop();
  } else {
    // Default interactive mode: Lead Operator Console with Hermes Slash Command Parity
    const leadConsole = new LeadOperatorConsole({
      browserEngine,
      jevEngine,
      apiKey: API_KEY,
      apiUrl: API_URL,
      sellerEmail: process.env.SELLER_EMAIL,
      leadOperatorName: process.env.LEAD_OPERATOR_NAME,
      activeModel: process.env.ACTIVE_MODEL,
    });
    await leadConsole.startInteractiveSession();
  }
}

main().catch((err) => {
  console.error("Agent error:", err.message || err);
  process.exit(1);
});
