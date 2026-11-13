import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CLAUDE.md already guides agents; otherwise `next dev` regenerates AGENTS.md.
  agentRules: false,
  // Phones on the home network open the dev server by IP (party mode controller).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
};

export default nextConfig;
