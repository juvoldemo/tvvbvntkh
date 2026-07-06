import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import AccessLogger from "./AccessLogger";
import "./globals.css";
import "./design-system.css";

const roboto = Roboto({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-roboto"
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
      <body className={`${roboto.variable} ${roboto.className}`}>
        <AccessLogger />
        {children}
      </body>
    </html>
  );
}
