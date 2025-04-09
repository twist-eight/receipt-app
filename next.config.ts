import type { NextConfig } from "next";
import type { Configuration } from "webpack";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Supabaseのストレージドメインを許可リストに追加
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },

  webpack(config: Configuration) {
    // config.module を初期化
    if (!config.module) {
      config.module = { rules: [] };
    }

    // rules も未定義の可能性があるため初期化
    if (!config.module.rules) {
      config.module.rules = [];
    }

    config.module.rules.push({
      test: /pdf\.worker\.js$/,
      type: "asset/resource",
    });

    return config;
  },
};

export default nextConfig;
