/**
 * Interactive Lead Operator Setup Wizard for Operator Starter v1.4
 *
 * Full environmental setup guiding the seller to:
 * 1. Configure Seller Identity & Lead Operator Profile
 * 2. Configure Intelligence Provider & Model (Anthropic, OpenAI, Gemini, DeepSeek, Groq, Ollama Local $0)
 * 3. Choose Browser & Computer-Use Runtime & Human-POV Non-Headless Mode
 * 4. Link Existing Agents (Hermes Agent, Cursor, Claude Code, OpenClaw, Codex, Grokbot, Dots, Muse)
 * 5. Browse and Install Recommended Skills
 * 6. Enroll Device & Automatically Enlist 5 Marketplace Freelance Gigs
 */

import readline from "node:readline";
import fs from "node:fs";
import path from "node:path";
import { RUNTIME_BENCHMARKS, type BrowserRuntimeType, TieredBrowserEngine } from "./browser.js";
import { AVAILABLE_MODELS } from "./console.js";
import { RECOMMENDED_SKILLS, SkillsManager } from "./skills.js";
import { NANO_OPERATORS, toOperatorManifest } from "./nanos.js";

function askQuestion(rl: readline.Interface, query: string, defaultValue = ""): Promise<string> {
  const prompt = defaultValue ? `${query} [Default: ${defaultValue}]: ` : `${query}: `;
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

export async function runInteractiveSetupWizard(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.clear();
  console.log("╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║ ⚡ OPERATE.CENTER — LEAD OPERATOR INITIAL SETUP WIZARD (v1.4)         ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝\n");
  console.log("Welcome! This wizard sets up a dedicated Lead Operator for your seller account.");
  console.log("Your Lead Operator acts as your commercial representative on Operate.Center:");
  console.log("  • Publishes & manages freelance services on the marketplace");
  console.log("  • Interacts with buyers and negotiates project specifications");
  console.log("  • Streams browser/computer viewports live for visual transparency");
  console.log("  • Executes tasks, submits SHA-256 proof deliverables, and deposits 80% payouts.\n");

  const envConfig: Record<string, string> = {};

  // === STEP 1: Seller & Lead Operator Profile ===
  console.log("────────────────────────────────────────────────────────────────────────");
  console.log("📋 STEP 1: Seller Identity & Lead Operator Profile");
  console.log("────────────────────────────────────────────────────────────────────────");
  const sellerEmail = await askQuestion(rl, "Enter Seller Email or account handle", process.env.SELLER_EMAIL || "seller@operate.center");
  const operatorName = await askQuestion(rl, "Enter Lead Operator Name", process.env.LEAD_OPERATOR_NAME || "Atlas Lead Operator");
  const operateApiUrl = await askQuestion(rl, "Operate.Center API URL", process.env.OPERATE_API_URL || "https://operate.center");

  envConfig.SELLER_EMAIL = sellerEmail;
  envConfig.LEAD_OPERATOR_NAME = operatorName;
  envConfig.OPERATE_API_URL = operateApiUrl;

  // === STEP 2: Intelligence & LLM Provider ===
  console.log("\n────────────────────────────────────────────────────────────────────────");
  console.log("🧠 STEP 2: Intelligence & Model Provider Selection");
  console.log("────────────────────────────────────────────────────────────────────────");
  console.log("Select the primary reasoning model for your Lead Operator:\n");
  console.log("  1) 🦅 Ollama / Hermes 3 (Llama 3.1 8B by Nous Research) — [100% Free Local, Zero Keys]");
  console.log("  2) 💻 Ollama / Qwen 2.5 Coder (7B/14B/32B) — [100% Free Local, Zero Keys]");
  console.log("  3) 🎭 Anthropic / Claude 3.7 Sonnet (Hybrid Thinking) — [Top Tier Computer Use]");
  console.log("  4) 🎭 Anthropic / Claude 3.5 Sonnet — [Fast & Deterministic Code/Tool Use]");
  console.log("  5) 🌐 OpenAI / GPT-4o (Omni) — [High Multimodal Throughput]");
  console.log("  6) 💡 OpenAI / o3-mini — [Fast Mathematical & Reasoning Model, Low Cost]");
  console.log("  7) ⚡ Google / Gemini 2.0 Flash — [1M+ Context, Sub-Second]");
  console.log("  8) 🔬 DeepSeek / R1 — [Competitive Open Reasoning]");
  console.log("  9) 🚀 TypeSafe Jev — [Sub-20ms System 1 Calibrated Decisions]");

  const modelChoice = await askQuestion(rl, "Choose model option [1-9]", "1");
  let selectedModel = "ollama/hermes-3-llama-3.1-8b";

  switch (modelChoice) {
    case "2":
      selectedModel = "ollama/qwen2.5-coder";
      break;
    case "3":
      selectedModel = "anthropic/claude-3-7-sonnet";
      envConfig.ANTHROPIC_API_KEY = await askQuestion(rl, "Enter ANTHROPIC_API_KEY", process.env.ANTHROPIC_API_KEY || "");
      break;
    case "4":
      selectedModel = "anthropic/claude-3-5-sonnet";
      envConfig.ANTHROPIC_API_KEY = await askQuestion(rl, "Enter ANTHROPIC_API_KEY", process.env.ANTHROPIC_API_KEY || "");
      break;
    case "5":
      selectedModel = "openai/gpt-4o";
      envConfig.OPENAI_API_KEY = await askQuestion(rl, "Enter OPENAI_API_KEY", process.env.OPENAI_API_KEY || "");
      break;
    case "6":
      selectedModel = "openai/o3-mini";
      envConfig.OPENAI_API_KEY = await askQuestion(rl, "Enter OPENAI_API_KEY", process.env.OPENAI_API_KEY || "");
      break;
    case "7":
      selectedModel = "google/gemini-2.0-flash";
      envConfig.GOOGLE_API_KEY = await askQuestion(rl, "Enter GOOGLE_API_KEY", process.env.GOOGLE_API_KEY || "");
      break;
    case "8":
      selectedModel = "deepseek/deepseek-r1";
      envConfig.DEEPSEEK_API_KEY = await askQuestion(rl, "Enter DEEPSEEK_API_KEY", process.env.DEEPSEEK_API_KEY || "");
      break;
    case "9":
      selectedModel = "typesafe/jev-latest";
      envConfig.TYPESAFE_API_KEY = await askQuestion(rl, "Enter TYPESAFE_API_KEY", process.env.TYPESAFE_API_KEY || "");
      break;
    default:
      selectedModel = "ollama/hermes-3-llama-3.1-8b";
      envConfig.OLLAMA_HOST = await askQuestion(rl, "Enter Ollama Host URL", process.env.OLLAMA_HOST || "http://localhost:11434");
      break;
  }
  envConfig.ACTIVE_MODEL = selectedModel;
  console.log(`\n✅ Model configured: ${selectedModel}`);

  // === STEP 3: Browser & Computer-Use Runtime & Human-POV ===
  console.log("\n────────────────────────────────────────────────────────────────────────");
  console.log("🖥️  STEP 3: Browser & Computer-Use Runtime & Human-POV Mode");
  console.log("────────────────────────────────────────────────────────────────────────");
  console.log("Select how your Lead Operator spins up browsers and virtual environments:\n");
  console.log("  1) 👁️  Local Headed Chromium [Human-POV Non-Headless, Visible Screen, $0]");
  console.log("  2) 🐳 Steel Browser (Self-Hosted Docker w/ Built-in Live View UI, $0)");
  console.log("  3) ⚡ Lightpanda (Zig Headless Engine, <15ms, 15MB RAM, 10x Lighter, $0)");
  console.log("  4) 🔒 MicroVM Sandbox (Perplexity SPACE / Firecracker for Untrusted Code, $0)");
  console.log("  5) 🤖 Browser-Use (Python / CDP Agent Loop for Multi-Step Navigation, $0)");
  console.log("  6) ☁️  Browserbase Cloud (Managed Fleet w/ Residential Proxies & Auto-CAPTCHA)");
  console.log("  7) 📄 Native Fast-Fetch (<10ms, $0, Zero Keys, Markdown/HTML heuristics)");

  const runtimeChoice = await askQuestion(rl, "Choose runtime option [1-7]", "1");
  let selectedRuntime: BrowserRuntimeType = "local_playwright";

  switch (runtimeChoice) {
    case "2":
      selectedRuntime = "steel_browser";
      envConfig.STEEL_API_URL = await askQuestion(rl, "Enter Steel Browser API URL", process.env.STEEL_API_URL || "http://localhost:3000");
      break;
    case "3":
      selectedRuntime = "lightpanda";
      envConfig.LIGHTPANDA_CDP_URL = await askQuestion(rl, "Enter Lightpanda CDP URL", process.env.LIGHTPANDA_CDP_URL || "http://localhost:9222");
      break;
    case "4":
      selectedRuntime = "microvm_sandbox";
      envConfig.SPACE_API_URL = await askQuestion(rl, "Enter Perplexity SPACE API URL", process.env.SPACE_API_URL || "http://localhost:8080");
      break;
    case "5":
      selectedRuntime = "browser_use";
      break;
    case "6":
      selectedRuntime = "browserbase_cloud";
      envConfig.BROWSERBASE_API_KEY = await askQuestion(rl, "Enter BROWSERBASE_API_KEY", process.env.BROWSERBASE_API_KEY || "");
      envConfig.BROWSERBASE_PROJECT_ID = await askQuestion(rl, "Enter BROWSERBASE_PROJECT_ID", process.env.BROWSERBASE_PROJECT_ID || "");
      break;
    case "7":
      selectedRuntime = "fast_fetch";
      break;
    default:
      selectedRuntime = "local_playwright";
      break;
  }
  envConfig.BROWSER_RUNTIME = selectedRuntime;

  const humanPovChoice = await askQuestion(rl, "Enable Human-POV Non-Headless Mode? (natural typing, visual viewport) (Y/n)", "Y");
  envConfig.HUMAN_POV = humanPovChoice.toLowerCase().startsWith("n") ? "false" : "true";
  envConfig.HEADED_BROWSER = envConfig.HUMAN_POV === "true" && selectedRuntime === "local_playwright" ? "true" : "false";

  // === STEP 4: Link Existing Agents & Harnesses ===
  console.log("\n────────────────────────────────────────────────────────────────────────");
  console.log("🔗 STEP 4: Link Existing Agents & Ecosystem Harnesses");
  console.log("────────────────────────────────────────────────────────────────────────");
  console.log("Do you already use an existing AI agent framework that you want to connect?");
  console.log("  1) None — Run Operator-Starter as my full standalone Lead Operator");
  console.log("  2) 🦅 Nous Research Hermes Agent (Link via operate-hermes-plugin)");
  console.log("  3) 💻 Cursor IDE / Windsurf (Link via operate-mcp Model Context Protocol)");
  console.log("  4) 🤖 Claude Code & Claude Desktop (Link via operate-mcp)");
  console.log("  5) 🐾 OpenClaw / AutoGen / CrewAI / Codex / Grokbot / Dots / Muse (REST Bridge)");

  const agentLinkChoice = await askQuestion(rl, "Choose integration option [1-5]", "1");

  if (agentLinkChoice === "2") {
    console.log("\n🦅 Hermes Agent Linking Instructions:");
    console.log("   Run: `pip install operate-hermes-plugin`");
    console.log("   Then in ~/.hermes/config.yaml add:");
    console.log("   plugins:\n     operate-center:\n       enabled: true\n       env:\n         OPERATE_API_KEY: <will_be_generated_next>");
    envConfig.LINKED_AGENT = "hermes";
  } else if (agentLinkChoice === "3" || agentLinkChoice === "4") {
    const mcpConfig = {
      mcpServers: {
        operate: {
          command: "npx",
          args: ["-y", "operate-mcp@latest"],
          env: { OPERATE_API_KEY: process.env.OPERATE_API_KEY || "agt_your_agent_key_here" },
        },
      },
    };
    if (agentLinkChoice === "3") {
      try {
        const cursorDir = path.resolve(process.cwd(), ".cursor");
        if (!fs.existsSync(cursorDir)) fs.mkdirSync(cursorDir, { recursive: true });
        fs.writeFileSync(path.join(cursorDir, "mcp.json"), JSON.stringify(mcpConfig, null, 2), "utf8");
        console.log(`\n💾 Generated ready-to-use .cursor/mcp.json targeting operate-mcp.`);
      } catch {
        // Fallback
      }
    }
    console.log("\n💻 MCP Configuration snippet (ready for .cursor/mcp.json or claude_desktop_config.json):");
    console.log(`   ${JSON.stringify(mcpConfig, null, 2)}`);
    envConfig.LINKED_AGENT = agentLinkChoice === "3" ? "cursor" : "claudecode";
  } else if (agentLinkChoice === "5") {
    console.log("\n🐾 OpenClaw / Framework REST Bridge enabled.");
    envConfig.LINKED_AGENT = "openclaw_custom";
  } else {
    envConfig.LINKED_AGENT = "standalone";
  }

  // === STEP 5: Skills Selection ===
  console.log("\n────────────────────────────────────────────────────────────────────────");
  console.log("🧩 STEP 5: Skills Selection (Hermes Progressive Disclosure Style)");
  console.log("────────────────────────────────────────────────────────────────────────");
  console.log("Recommended Skills to install for your Lead Operator:");
  for (const skill of Object.values(RECOMMENDED_SKILLS)) {
    console.log(`  • ${skill.id.padEnd(22)} — ${skill.name} (${skill.slashCommand})`);
  }
  const installAllSkills = await askQuestion(rl, "Install all recommended skills? (Y/n)", "Y");
  envConfig.INSTALLED_SKILLS = installAllSkills.toLowerCase().startsWith("n") ? "web-researcher,human-pov-operator" : Object.keys(RECOMMENDED_SKILLS).join(",");

  // === STEP 6: Device Enrollment & Automatic Gig Publishing ===
  console.log("\n────────────────────────────────────────────────────────────────────────");
  console.log("🔑 STEP 6: Marketplace Authentication & Autonomous Gig Enlistment");
  console.log("────────────────────────────────────────────────────────────────────────");

  let token = process.env.OPERATE_API_KEY || "";

  if (!token || token === "agt_your_agent_key_here") {
    console.log("Initiating Operate Agent Protocol device enrollment...");
    try {
      const enrollRes = await fetch(`${operateApiUrl}/api/agent/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creator_email: sellerEmail,
          manifest: {
            agent_name: `${operatorName} (Lead Operator)`,
            harness: { name: "operator-starter", version: "1.4.0" },
            capabilities: ["lead_operator", "human_pov_browser", "autonomous_freelance", selectedRuntime],
          },
        }),
      });

      if (enrollRes.ok) {
        const enrollData = (await enrollRes.json()) as any;
        const code = enrollData.enrollment_code;
        const approvalUrl = enrollData.approval_url || `${operateApiUrl}/creator/approve/${code}`;
        console.log(`\n🔗 Please approve your Lead Operator in your browser:`);
        console.log(`   👉 ${approvalUrl}\n`);
        console.log(`⏳ Waiting for approval (Code: ${code})...`);

        for (let i = 0; i < 60; i++) {
          await new Promise((r) => setTimeout(r, 4000));
          const statusRes = await fetch(`${operateApiUrl}/api/agent/enroll/status?code=${encodeURIComponent(code)}`);
          if (statusRes.ok) {
            const statusData = (await statusRes.json()) as any;
            const mintedToken = statusData?.credential?.credential_key || statusData?.agent_token;
            if (statusData.status === "approved" && mintedToken) {
              token = mintedToken;
              console.log(`\n🎉 Approved! Scoped API Key Minted: ${token.slice(0, 12)}...`);
              break;
            }
          }
        }
      }
    } catch (err: any) {
      console.log(`⚠️  Enrollment auto-poll skipped (${err.message}). Using manual key or demo mode.`);
    }
  }

  if (token) {
    envConfig.OPERATE_API_KEY = token;
  }

  // Save everything to .env
  const envPath = path.resolve(process.cwd(), ".env");
  let envFileContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

  for (const [k, v] of Object.entries(envConfig)) {
    if (v === undefined || v === null) continue;
    const regex = new RegExp(`^${k}=.*`, "m");
    if (regex.test(envFileContent)) {
      envFileContent = envFileContent.replace(regex, `${k}=${v}`);
    } else {
      envFileContent += `\n${k}=${v}`;
    }
    process.env[k] = v;
  }
  fs.writeFileSync(envPath, envFileContent.trim() + "\n", "utf8");
  console.log(`\n💾 Saved all settings to ${envPath}`);

  // Automatically publish all 5 freelance gigs
  if (token) {
    console.log("\n🚀 Publishing 5 freelance gigs to Operate.Center on behalf of " + sellerEmail + "...");
    for (const spec of Object.values(NANO_OPERATORS)) {
      try {
        const gigRes = await fetch(`${operateApiUrl}/api/agent/gig`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ operator_manifest: toOperatorManifest(spec) }),
        });
        if (gigRes.ok) {
          const gigData = (await gigRes.json()) as any;
          console.log(`  ✅ Published "${spec.name}" ($${spec.priceUsd.toFixed(2)}) -> ${gigData.gig_url || `${operateApiUrl}/marketplace/${gigData.gig_id}`}`);
        }
      } catch {
        // Non-fatal
      }
    }
  }

  rl.close();

  console.log("\n╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║ 🎉 LEAD OPERATOR SETUP COMPLETE!                                      ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝");
  console.log(`  Lead Operator: ${operatorName}`);
  console.log(`  Seller Email : ${sellerEmail}`);
  console.log(`  Model        : ${selectedModel}`);
  console.log(`  Runtime      : ${selectedRuntime.toUpperCase()} (Human-POV: ${envConfig.HUMAN_POV})`);
  console.log("\nLaunching Lead Operator Console with Hermes Slash Command Parity...\n");
}
