import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  devIndicators: false,

  // MAIN OPTIMIZATION: This is the most important setting
  // It dramatically reduces the module count for icon libraries and UI components
  experimental: {
    optimizePackageImports: ['lucide-react', '@/components/ui', 'recharts'],
  },

  webpack: (config, { isServer }) => {
    // Fix for non-server environments
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }

    // Optimize module resolution (speeds up compilation)
    config.resolve.extensions = ['.tsx', '.ts', '.jsx', '.js', '.json'];
    config.resolve.symlinks = false;

    // Better snapshot management (improves incremental builds)
    config.snapshot = {
      managedPaths: [/^(.+?[\\/]node_modules[\\/])/],
    };

    return config;
  },

  // Optimize on-demand entries (reduces memory usage)
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 2,
  },

  // Production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
};

export default nextConfig;