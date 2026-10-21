import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a second test account run in another tab at 127.0.0.1:3000:
  // each address keeps its own sign-in, so one tab can be a venue and the
  // other talent while developing.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
