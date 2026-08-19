/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  async headers() {
    const cacheHeaders = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }];
    return ["images", "Icon", "Template", "invitations", "competitions", "minhhoa2", "tuyen-ngang", "BVNT là ai"]
      .map((folder) => ({ source: `/${folder}/:path*`, headers: cacheHeaders }));
  },
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
