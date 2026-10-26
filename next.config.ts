import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const config: NextConfig = {
  async redirects() {
    return [{ source: "/", destination: "/mn", permanent: false }];
  },
};
export default config;
