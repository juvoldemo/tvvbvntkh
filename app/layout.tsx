import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import AccessLogger from "./AccessLogger";
import "./globals.css";
import "./design-system.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-be-vietnam-pro"
});

export const metadata: Metadata = {
  title: "Dashboard Doanh thu Bảo Việt Nhân thọ Khánh Hòa",
  description: "Theo dõi doanh thu AFYP/IP hằng ngày"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <meta charSet="UTF-8" />
      </head>
      <body className={beVietnamPro.variable}>
        <AccessLogger />
        {children}
      </body>
    </html>
  );
}
