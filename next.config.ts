import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const config: NextConfig = {
  allowedDevOrigins: (process.env.AJET_LAN_HOSTS ?? "").split(",").filter(Boolean),
  async redirects() {
    return [{ source: "/", destination: "/mn", permanent: false }];
  },
};
export default config;
