/**
 * Skills Registry & Management Engine for Operator Starter v1.4
 *
 * Inspired by Nous Research Hermes Agent Skills System (`NousResearch/hermes-agent`):
 * - Progressive disclosure architecture (lightweight index at startup, full skill on invocation)
 * - Built-in slash commands (/skills, /skills browse, /skills install)
 * - Domain-specialized capabilities for the Lead Operator
 */

export interface OperatorSkill {
  id: string;
  name: string;
  description: string;
  version: string;
  category: "research" | "computer_use" | "coding" | "growth" | "integrations";
  installed: boolean;
  slashCommand: string;
  author: string;
  compatibleAgents: string[]; // e.g. ["hermes", "openclaw", "cursor", "claudecode", "codex", "standalone"]
  runtimePreference: "fast_fetch" | "steel_browser" | "lightpanda" | "local_playwright" | "microvm_sandbox";
  humanPovCapable: boolean;
}

export const RECOMMENDED_SKILLS: Record<string, OperatorSkill> = {
  "web-researcher": {
    id: "web-researcher",
    name: "Autonomous Web & SEO Researcher",
    description: "Deep competitor intelligence, SEO audit, Core Web Vitals, and pricing teardown using multi-runtime browser engines.",
    version: "1.4.0",
    category: "research",
    installed: true,
    slashCommand: "/research",
    author: "Operate Technology R&D LLC",
    compatibleAgents: ["hermes", "openclaw", "cursor", "claudecode", "codex", "standalone"],
    runtimePreference: "fast_fetch",
    humanPovCapable: true,
  },
  "human-pov-operator": {
    id: "human-pov-operator",
    name: "Human-POV Non-Headless Computer Use",
    description: "Drives web apps visually from a human POV in a visible browser or Steel Docker with live stream broadcasting — bypassing SaaS API paywalls.",
    version: "1.4.0",
    category: "computer_use",
    installed: true,
    slashCommand: "/computer-use",
    author: "Operate Technology R&D LLC",
    compatibleAgents: ["hermes", "openclaw", "cursor", "claudecode", "standalone"],
    runtimePreference: "steel_browser",
    humanPovCapable: true,
  },
  "github-auditor": {
    id: "github-auditor",
    name: "GitHub PR & Security Auditor",
    description: "Audits repository PRs, secret leaks, SSRF vectors, and dependency CVEs inside ephemeral sandboxes.",
    version: "1.4.0",
    category: "coding",
    installed: true,
    slashCommand: "/audit-code",
    author: "Operate Technology R&D LLC",
    compatibleAgents: ["hermes", "openclaw", "cursor", "claudecode", "codex", "standalone"],
    runtimePreference: "fast_fetch",
    humanPovCapable: false,
  },
  "social-publisher": {
    id: "social-publisher",
    name: "Viral X/Twitter Growth Operator",
    description: "High-converting X thread hooks, launch copy, and community engagement via visual human-like posting.",
    version: "1.4.0",
    category: "growth",
    installed: true,
    slashCommand: "/social-growth",
    author: "Operate Technology R&D LLC",
    compatibleAgents: ["hermes", "openclaw", "cursor", "claudecode", "standalone"],
    runtimePreference: "fast_fetch",
    humanPovCapable: true,
  },
  "hermes-bridge": {
    id: "hermes-bridge",
    name: "Nous Research Hermes Agent Bridge",
    description: "Native connector for Nous Research Hermes Agent via operate-hermes-plugin (`pip install operate-hermes-plugin`).",
    version: "1.1.2",
    category: "integrations",
    installed: false,
    slashCommand: "/hermes",
    author: "Nous Research & Operate.Center",
    compatibleAgents: ["hermes"],
    runtimePreference: "fast_fetch",
    humanPovCapable: false,
  },
  "mcp-bridge": {
    id: "mcp-bridge",
    name: "Model Context Protocol (MCP) Bridge",
    description: "Exposes Operate.Center tools to Cursor, Claude Code, Windsurf, and Claude Desktop via `operate-mcp`.",
    version: "1.1.0",
    category: "integrations",
    installed: true,
    slashCommand: "/mcp",
    author: "Operate Technology R&D LLC",
    compatibleAgents: ["cursor", "claudecode", "codex"],
    runtimePreference: "fast_fetch",
    humanPovCapable: false,
  },
  "microvm-sandbox": {
    id: "microvm-sandbox",
    name: "MicroVM Untrusted Code Sandbox",
    description: "Spins up Firecracker microVMs via Perplexity SPACE (github.com/perplexityai/SPACE) for untrusted script execution and repo isolation.",
    version: "1.4.0",
    category: "coding",
    installed: false,
    slashCommand: "/sandbox",
    author: "Operate Technology R&D LLC",
    compatibleAgents: ["hermes", "openclaw", "standalone"],
    runtimePreference: "microvm_sandbox",
    humanPovCapable: false,
  },
};

export class SkillsManager {
  private skills: Map<string, OperatorSkill> = new Map();

  constructor() {
    for (const [id, skill] of Object.entries(RECOMMENDED_SKILLS)) {
      this.skills.set(id, { ...skill });
    }
  }

  listInstalled(): OperatorSkill[] {
    return Array.from(this.skills.values()).filter((s) => s.installed);
  }

  listAll(): OperatorSkill[] {
    return Array.from(this.skills.values());
  }

  install(skillId: string): boolean {
    const clean = skillId.toLowerCase().trim();
    const resolvedId = clean === "code-sandbox" ? "microvm-sandbox" : clean;
    const skill = this.skills.get(resolvedId);
    if (skill) {
      skill.installed = true;
      return true;
    }
    return false;
  }

  get(skillId: string): OperatorSkill | undefined {
    const clean = skillId.toLowerCase().trim();
    const resolvedId = clean === "code-sandbox" ? "microvm-sandbox" : clean;
    return this.skills.get(resolvedId);
  }

  search(keyword: string): OperatorSkill[] {
    const q = keyword.toLowerCase();
    return Array.from(this.skills.values()).filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.slashCommand.toLowerCase().includes(q)
    );
  }
}
