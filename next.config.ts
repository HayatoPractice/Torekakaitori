import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AGENTS.mdはこのプロジェクトの🔒不変層ファイル（社長承認必須）。
  // next devが自動追記する機能は無効化し、意図しない変更が入らないようにする。
  agentRules: false,
};

export default nextConfig;
