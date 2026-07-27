import type { Metadata } from "next";
import { Roboto } from "next/font/google";

const roboto = Roboto({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
  variable: "--font-recruitment-roboto"
});

export const metadata: Metadata = {
  title: "Cổng tuyển dụng TVV | Bản đồ thu nhập",
  description: "Danh sách TVV dành cho Trưởng nhóm tuyển dụng"
};

export default function RecruitmentLayout({ children }: { children: React.ReactNode }) {
  return <div className={roboto.variable}>{children}</div>;
}
