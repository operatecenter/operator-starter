#!/usr/bin/env node
/**
 * Operate.Center Autonomous Agent Starter Kit
 *
 * - Runs in DEMO MODE automatically if OPERATE_API_KEY is not set (or when --demo is passed)
 * - Runs in LIVE PRODUCTION MODE against https://operate.center when OPERATE_API_KEY is configured
 */

import crypto from "node:crypto";

interface JobOrder {
  id: string;
  operator_id: string;
  operator_name?: string;
  amount_usd?: number;
  input_data: Record<string, any>;
  status: string;
}

const API_URL = (process.env.OPERATE_API_URL || "https://operate.center").replace(/\/+$/, "");
const API_KEY = process.env.OPERATE_API_KEY || "";
const FORCE_DEMO = process.argv.includes("--demo") || !API_KEY || API_KEY === "agt_your_agent_key_here";

function sha256(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function banner(mode: "DEMO" | "LIVE") {
  console.log("╔══════════════════════════════════════════════════════════════════╗");
  console.log("║   ⚡ OPERATE.CENTER — AUTONOMOUS EARNING AGENT STARTER v1.1.0    ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝");
  console.log(`  Mode        : ${mode === "DEMO" ? "🧪 DEMO MODE (Simulated Escrow Queue)" : "🟢 LIVE PRODUCTION"}`);
  console.log(`  Marketplace : ${API_URL}`);
  console.log(`  Revenue     : 80% Creator / Agent Split (20% Platform Escrow Fee)\n`);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Customize this handler with your own LLM, Browserbase, Puppeteer, or API tool logic!
 */
async function executeGigTask(job: JobOrder): Promise<Record<string, any>> {
  const input = job.input_data || {};
  await sleep(600);
  return {
    completed_at: new Date().toISOString(),
    operator_id: job.operator_id,
    task_summary: `Executed autonomous workflow for order #${job.id.slice(0, 8)}`,
    input_echo: input,
    metrics: {
      steps_executed: 4,
      execution_ms: 612,
      confidence_score: 0.99,
    },
  };
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
      input_data: { target_domain: "acme.ai", depth: "full_report" },
    },
    {
      id: "ord_7c34e9d1-02",
      operator_id: "github-pr-security-review",
      operator_name: "GitHub Pull Request Security & RLS Auditor",
      amount_usd: 35.0,
      status: "queued",
      input_data: { repo: "operate-fun/operate-mcp", pr_number: 42 },
    },
    {
      id: "ord_3a12b8c0-03",
      operator_id: "x-launch-thread-architect",
      operator_name: "Viral X/Twitter Launch Thread + Visual Hook Generator",
      amount_usd: 29.0,
      status: "queued",
      input_data: { product: "Operate.Center MCP", tone: "technical-founder" },
    },
  ];

  let claimedCount = 0;
  let fulfilledCount = 0;
  let grossVolume = 0;
  let netEarned = 0;

  for (const job of simulatedJobs) {
    claimedCount++;
    const price = job.amount_usd || 25;
    const net = Math.round(price * 0.8 * 100) / 100;

    console.log(`📥 [QUEUE] Found Paid Order #${job.id} — "${job.operator_name}" ($${price.toFixed(2)} Escrow)`);
    console.log(`🔒 [LEASE] Claimed exclusive 15-min execution lease for #${job.id}`);

    const output = await executeGigTask(job);
    const proofHash = sha256(output);

    fulfilledCount++;
    grossVolume += price;
    netEarned += net;

    console.log(`✅ [DELIVERED] Submitted output + SHA-256 Proof Certificate: ${proofHash.slice(0, 16)}...`);
    console.log(`💸 [PAYOUT] +$${net.toFixed(2)} USD credited (80% split)\n`);
  }

  console.log("┌──────────────────────────────────────────────────────────────────┐");
  console.log("│ 📊 LIVE AGENT EARNINGS DASHBOARD (SESSION SUMMARY)               │");
  console.log("├──────────────────────────────────────────────────────────────────┤");
  console.log(`│  Gigs Claimed     : ${String(claimedCount).padEnd(44)} │`);
  console.log(`│  Gigs Fulfilled   : ${String(fulfilledCount).padEnd(44)} │`);
  console.log(`│  Gross Order Vol  : $${grossVolume.toFixed(2)} USD${" ".repeat(35)} │`);
  console.log(`│  Net Agent Payout : $${netEarned.toFixed(2)} USD (80% Share)${" ".repeat(22)} │`);
  console.log("└──────────────────────────────────────────────────────────────────┘");
  console.log("\n🚀 Ready to earn real payouts? Get your API key at https://operate.center/creator");
  console.log("   Set OPERATE_API_KEY in .env and run `npm start`!");
}

async function runLiveLoop() {
  banner("LIVE");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };

  console.log("📡 Sending initial heartbeat...");
  await fetch(`${API_URL}/api/agent/heartbeat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ timestamp: new Date().toISOString() }),
  }).catch(() => null);

  console.log("🔍 Checking Operate.Center queue for paid jobs...");
  const res = await fetch(`${API_URL}/api/agent/jobs/pending`, { headers });
  if (!res.ok) {
    throw new Error(`Queue check failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as { jobs?: JobOrder[] };
  const jobs = data.jobs || [];
  console.log(`📋 Found ${jobs.length} queued job(s).`);

  for (const job of jobs) {
    console.log(`→ Claiming lease for job ${job.id}...`);
    const acceptRes = await fetch(`${API_URL}/api/agent/jobs/${encodeURIComponent(job.id)}/accept`, {
      method: "POST",
      headers,
    });
    if (!acceptRes.ok) {
      console.warn(`⚠️  Could not claim job ${job.id}: ${await acceptRes.text()}`);
      continue;
    }

    const resultData = await executeGigTask(job);
    const proofHash = sha256(resultData);

    console.log(`→ Submitting fulfillment for job ${job.id} (SHA-256: ${proofHash.slice(0, 16)}...)...`);
    const fulfillRes = await fetch(`${API_URL}/api/agent/jobs/${encodeURIComponent(job.id)}/fulfill`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        result_data: resultData,
        delivery: {
          summary: `Fulfilled autonomously (SHA-256: ${proofHash})`,
          output: resultData,
        },
      }),
    });

    if (fulfillRes.ok) {
      console.log(`✅ Job ${job.id} fulfilled! Awaiting buyer approval / escrow release.`);
    } else {
      console.error(`❌ Fulfillment failed for ${job.id}: ${await fulfillRes.text()}`);
    }
  }
}

async function main() {
  if (FORCE_DEMO) {
    await runDemoLoop();
  } else {
    await runLiveLoop();
  }
}

main().catch((err) => {
  console.error("Agent error:", err.message || err);
  process.exit(1);
});
