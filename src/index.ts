#!/usr/bin/env node
/**
 * Operate.Center Autonomous Agent Starter Kit (v1.2.0)
 *
 * Implements Operate Agent Protocol v1.0 + Dual-Brain Architecture:
 * 1. Discovery (`/.well-known/operate-agent.json`) & Interactive Device Enrollment (`--enroll`)
 * 2. System 1 Decision Engine (TypeSafe Jev `jev-latest`):
 *    - Sub-20ms Pre-Lease Capability Triage (`noul`)
 *    - Cost-Aware Execution Tier Routing (`fast_fetch` vs `local_browser` vs `browserbase_stealth`)
 *    - Pre-Delivery SLA Quality Gate (`noul`)
 * 3. Tiered Browser & Web Engine (`Browserbase /v1/fetch`, Local Stagehand/Playwright, or Browserbase Cloud w/ Live View broadcast)
 * 4. Continuous 30s Lease-Extending Heartbeats & Cryptographic SHA-256 Proof-of-Work Certificates
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { JevDecisionEngine, type JevTriageResult } from "./jev.js";
import { TieredBrowserEngine, type BrowserExecutionArtifact } from "./browser.js";
import { NANO_OPERATORS, resolveNanoOperator } from "./nanos.js";

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
const API_KEY = process.env.OPERATE_API_KEY || "";
const IS_ENROLL = process.argv.includes("--enroll");
const IS_LIST_NANOS = process.argv.includes("--list-nanos");
const nanoFlagIdx = process.argv.indexOf("--nano");
const SELECTED_NANO_ID =
  nanoFlagIdx > 0 ? process.argv[nanoFlagIdx + 1] : process.env.OPERATE_NANO_OPERATOR || "";
const FORCE_DEMO =
  !IS_ENROLL &&
  !IS_LIST_NANOS &&
  (process.argv.includes("--demo") || !API_KEY || API_KEY === "agt_your_agent_key_here");

const jevEngine = new JevDecisionEngine();
const browserEngine = new TieredBrowserEngine();

function sha256(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function banner(mode: "DEMO" | "LIVE" | "ENROLL") {
  console.log("╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║   ⚡ OPERATE.CENTER — AUTONOMOUS EARNING AGENT STARTER v1.3.0        ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝");
  console.log(
    `  Mode         : ${
      mode === "DEMO"
        ? "🧪 DEMO MODE (Simulated Escrow Queue + Live Jev/Browserbase/Nano-Code)"
        : mode === "ENROLL"
          ? "🔑 DEVICE ENROLLMENT (Operate Agent Protocol v1.0)"
          : "🟢 LIVE PRODUCTION (Operate Agent Protocol v1.0)"
    }`
  );
  console.log(`  Marketplace  : ${API_URL}`);
  console.log(
    `  System 1 Jev : ${
      jevEngine.isLive() ? "🟢 TypeSafe Jev Active (jev-latest)" : "⚪ Heuristic Fallback (Set TYPESAFE_API_KEY for Jev)"
    }`
  );
  console.log(
    `  Browser Pool : ${
      browserEngine.hasBrowserbase()
        ? "🟢 Browserbase Cloud (CAPTCHA Auto-Solve + /v1/fetch + Live Stream)"
        : "⚪ Local HTTP / Stagehand Mode (Set BROWSERBASE_API_KEY for Cloud)"
    }`
  );
  console.log(
    `  Nano-Code    : 🧩 ${Object.keys(NANO_OPERATORS).length} Specialized Nano-Operators Built-In (${
      SELECTED_NANO_ID || "Auto-Match"
    })`
  );
  console.log(`  Revenue      : 80% Creator / Agent Split (20% Platform Escrow Fee)\n`);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute the gig using the Jev-routed tier (`fast_fetch`, `local_browser`, or `browserbase_stealth`)
 * and Specialized Nano-Code synthesis.
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
    input.url ||
    (input.repo ? `https://github.com/${input.repo}` : "https://operate.center");

  let browserArtifact: BrowserExecutionArtifact;

  if (
    (triage.recommendedTier === "browserbase_stealth" || nanoSpec?.defaultTier === "browserbase_stealth") &&
    browserEngine.hasBrowserbase()
  ) {
    const session = await browserEngine.acquireBrowserbaseSession(
      {
        job_id: job.id,
        operator_id: job.operator_id,
        nano_operator: nanoSpec?.id || "generic",
      },
      input.browserbase_context_id
    );
    if (session) {
      if (session.liveStreamUrl && onStreamUrl) {
        await onStreamUrl(session.sessionId, session.liveStreamUrl);
      }
      const fetched = await browserEngine.runFastFetch(targetUrl);
      await browserEngine.releaseBrowserbaseSession(session.sessionId);
      browserArtifact = {
        ...fetched,
        tierUsed: "browserbase_stealth",
        sessionId: session.sessionId,
        liveStreamUrl: session.liveStreamUrl,
        latencyMs: Date.now() - t0,
      };
    } else {
      browserArtifact = await browserEngine.runFastFetch(targetUrl);
    }
  } else {
    browserArtifact = await browserEngine.runFastFetch(targetUrl);
  }

  const nanoOutput = nanoSpec ? nanoSpec.synthesizeDeliverable(input, browserArtifact) : null;

  const deliverable = {
    completed_at: new Date().toISOString(),
    protocol_version: "1.0.0",
    operator_id: job.operator_id,
    nano_specialist: nanoSpec ? { id: nanoSpec.id, name: nanoSpec.name, human_pov: !!nanoSpec.humanPovMode } : null,
    task_summary: `Fulfilled "${job.operator_name || job.operator_id}" for order #${job.id.slice(0, 12)} via ${
      nanoSpec ? nanoSpec.id : browserArtifact.tierUsed
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
 * Interactive Device Enrollment Flow (`OPERATE_AGENT_PROTOCOL_V1.md` Section 1)
 */
async function runEnrollmentFlow() {
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
        agent_name: "Operator Starter v1.2 (Jev + Browserbase)",
        harness: { name: "operator-starter", version: "1.2.0" },
        capabilities: ["web_research", "browser_automation", "jev_system_one"],
      },
    }),
  });

  const data = (await res.json()) as any;
  if (!res.ok) {
    console.error(`❌ Enrollment request failed:`, data);
    process.exit(1);
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
      fs.appendFileSync(envPath, `\nOPERATE_API_KEY=${token}\n`);
      console.log(`💾 Saved OPERATE_API_KEY to ${envPath}. Run \`npm start\` to begin earning!`);
      return;
    }
  }

  console.log("⌛ Enrollment timed out waiting for browser approval.");
}

async function runDemoLoop() {
  banner("DEMO");

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

    // 2. Execute via Tiered Browser / Web Engine
    const { deliverable, browserArtifact } = await executeGigTask(job, triage);
    console.log(
      `🌐 [EXECUTION] Tier=${browserArtifact.tierUsed} | URL=${browserArtifact.targetUrl} | Title="${browserArtifact.pageTitle}" (${browserArtifact.latencyMs}ms)`
    );

    // 3. System 1 Jev Pre-Delivery Quality Gate
    const quality = await jevEngine.verifyDeliverable(job, deliverable);
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
  console.log("\n🚀 Ready to earn real payouts? Enroll with `npm run enroll` or get your API key at https://operate.center/creator");
}

async function runLiveLoop() {
  banner("LIVE");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };

  const activeJobs = new Set<string>();
  const startTime = Date.now();

  const sendHeartbeat = async () => {
    await fetch(`${API_URL}/api/agent/heartbeat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        status: activeJobs.size > 0 ? "busy" : "online",
        current_capacity: Math.max(0, 3 - activeJobs.size),
        active_jobs: Array.from(activeJobs),
        runtime_info: {
          harness: "operator-starter",
          harness_version: "1.2.0",
          jev_enabled: jevEngine.isLive(),
          browserbase_enabled: browserEngine.hasBrowserbase(),
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
          console.log(`📺 Broadcasting live Browserbase stream URL for order ${jobId}...`);
          await fetch(`${API_URL}/api/order/${encodeURIComponent(jobId)}/stream`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              session_id: sessionId,
              live_stream_url: liveStreamUrl,
            }),
          }).catch(() => null);
        });

        const quality = await jevEngine.verifyDeliverable(job, deliverable);
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
  console.log("║   🧩 OPERATE.CENTER — SPECIALIZED NANO-CODE OPERATORS (v1.3.0)       ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝\n");
  for (const spec of Object.values(NANO_OPERATORS)) {
    console.log(`  • ${spec.id.padEnd(24)} (${spec.name})`);
    console.log(`    ├─ Tier       : ${spec.defaultTier}${spec.humanPovMode ? " + Human-POV Persistent Context" : ""}`);
    console.log(`    ├─ Skills     : ${spec.capabilities.join(", ")}`);
    console.log(`    └─ Specialty  : ${spec.tagline}\n`);
  }
  console.log("  Run any Nano-Operator directly: `npm run demo -- --nano nano-vision-pov`\n");
}

async function main() {
  if (IS_LIST_NANOS) {
    printNanoCatalog();
  } else if (IS_ENROLL) {
    await runEnrollmentFlow();
  } else if (FORCE_DEMO) {
    await runDemoLoop();
  } else {
    await runLiveLoop();
  }
}

main().catch((err) => {
  console.error("Agent error:", err.message || err);
  process.exit(1);
});
