import type { Metadata } from "next";
import Discussion from "./Discussion";

export const metadata: Metadata = {
  title: "Hỏi đáp • Thảo luận tình huống chị Lan",
  description: "Thảo luận theo 6 bước bán hàng: bắt bệnh, tìm nguyên nhân và kê đơn."
};

export default function DiscussionPage() {
  return <Discussion />;
}
