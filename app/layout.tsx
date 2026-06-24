import type { Metadata } from "next";
import AccessLogger from "./AccessLogger";
import "./globals.css";

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
      <body>
        <AccessLogger />
        {children}
      </body>
    </html>
  );
}
