/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/api/archive/**/*": ["./Kho lưu trữ/**/*"],
      "/api/admin/archive/**/*": ["./Kho lưu trữ/**/*"]
    },
    serverActions: {
      bodySizeLimit: "20mb"
    }
  }
};

export default nextConfig;
