import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CLAUDE.md already guides agents; otherwise `next dev` regenerates AGENTS.md.
  agentRules: false,
};

export default nextConfig;
