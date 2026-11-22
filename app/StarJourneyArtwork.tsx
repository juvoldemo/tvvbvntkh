import { useId } from "react";
import { formatVnd } from "@/lib/format";

/** All coordinates share the artwork's canvas, so labels scale with the image. */
export default function StarJourneyArtwork({ row }: { row: any }) {
  const id = useId().replace(/:/g, "");
  const progress = Math.max(0, Math.min(100, Number(row.progress) || 0));
  const total = (Number(row.totalAfyp) || 0).toLocaleString("vi-VN", { maximumFractionDigits: 0 });
  const remaining = Number(row.remainingToNext) || 0;
  const next = remaining > 0 ? row.nextRank : "Đã đạt mốc cao nhất";
  const tickets = `${Number(row.currentTickets) || 0} vé`;
  return <section className="tvv-card tvv-star-artwork" aria-label="Hành trình Sao Việt">
    <svg viewBox="78 88 1894 860" role="img" aria-label={`Tổng doanh thu Sao Việt ${total}. ${tickets}. ${next}. Tiến độ ${progress.toFixed(1)}%.${remaining > 0 ? ` Còn ${formatVnd(remaining)}.` : ""}`}>
      <defs>
        <linearGradient id={`${id}-ticket`} x2="0" y2="1"><stop stopColor="#fff6b2"/><stop offset=".48" stopColor="#ffe47a"/><stop offset=".51" stopColor="#ffcb24"/><stop offset="1" stopColor="#ffdf48"/></linearGradient>
        <linearGradient id={`${id}-track`} x2="0" y2="1"><stop stopColor="#c3dfff"/><stop offset="1" stopColor="#83bcff"/></linearGradient>
        <linearGradient id={`${id}-fill`} x2="0" y2="1"><stop stopColor="#fff7a5"/><stop offset=".4" stopColor="#ffe85f"/><stop offset=".55" stopColor="#ffc600"/><stop offset="1" stopColor="#ffdf44"/></linearGradient>
        <clipPath id={`${id}-bar`}><rect x="151" y="737" width="1754" height="56" rx="28"/></clipPath>
        <clipPath id={`${id}-card`}><rect x="82" y="93" width="1884" height="849" rx="76"/></clipPath>
      </defs>
      <image href="/images/BG%20SV4.webp" width="2048" height="1153" clipPath={`url(#${id}-card)`}/>
      <rect x="82" y="93" width="1884" height="849" rx="76" fill="none" stroke="#9cddff" strokeWidth="3"/>
      {/* Live values are positioned in the blank areas of BG SV4. */}
      <rect x="1610" y="139" width="258" height="114" rx="57" fill={`url(#${id}-ticket)`}/>
      <text x="1739" y="216" textAnchor="middle" fill="#082033" fontSize="76" fontWeight="800">{tickets}</text>
      <text x="480" y="550" className="star-artwork-total" fill="#082573" fontSize={total.length > 17 ? 90 : 110} fontWeight="800">{total}</text>
      <text x="1890" y="691" textAnchor="end" fill="#082573" fontSize={String(next).length > 30 ? 56 : 64} fontWeight="700">{next}</text>
      {remaining > 0 && <text x="1890" y="873" textAnchor="end" fill="#082573" fontSize="54" fontWeight="600">Cần thêm <tspan fontWeight="800">{formatVnd(remaining)}</tspan></text>}
      <rect x="151" y="737" width="1754" height="56" rx="28" fill={`url(#${id}-track)`} stroke="#b6d9ff" strokeWidth="1"/>
      <g clipPath={`url(#${id}-bar)`}><rect x="151" y="737" width={1754 * progress / 100} height="56" rx="28" fill={`url(#${id}-fill)`} stroke="#fff0a0" strokeWidth="3"/></g>
      <text x="160" y="873" fill="#082573" fontSize="80" fontWeight="700">{progress.toFixed(1).replace(".0", "").replace(".", ",")}%</text>

    </svg>
  </section>;
}
