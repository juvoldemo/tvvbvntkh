import type { Metadata, Viewport } from "next";
import AccessLogger from "./AccessLogger";
import "./globals.css";
import "./design-system.css";

export const metadata: Metadata = {
  title: "Dashboard Doanh thu Bao Viet Nhan tho Khanh Hoa",
  description: "Theo doi doanh thu AFYP/IP hang ngay",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TVV BVNT"
  },
  icons: {
    icon: "/Icon/Icon%20baoviet.png",
    apple: "/Icon/Icon%20baoviet.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#f7faff"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <meta charSet="UTF-8" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TVV BVNT" />
      </head>
      <body>
        <AccessLogger />
        {children}
      </body>
    </html>
  );
}
