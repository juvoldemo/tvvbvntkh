import { useId } from "react";
import { formatVnd } from "@/lib/format";

/** All coordinates share the artwork's canvas, so labels scale with the image. */
export default function StarJourneyArtwork({ row }: { row: any }) {
  const id = useId().replace(/:/g, "");
  const progress = Math.max(0, Math.min(100, Number(row.progress) || 0));
  const total = formatVnd(Number(row.totalAfyp) || 0);
  const remaining = Number(row.remainingToNext) || 0;
  const next = remaining > 0 ? row.nextRank : "Đã đạt mốc cao nhất";
  const isPlatinum = String(next).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("bach kim");
  const tickets = `${Number(row.currentTickets) || 0} vé`;
  return <section className="tvv-card tvv-star-artwork" aria-label="Hành trình Sao Việt">
    <svg viewBox="42 29 1965 1031" role="img" aria-label={`Tổng doanh thu Sao Việt ${total}. ${tickets}. ${next}. Tiến độ ${progress.toFixed(1)}%.${remaining > 0 ? ` Còn ${formatVnd(remaining)}.` : ""}`}>
      <defs>
        <linearGradient id={`${id}-ticket`} x2="0" y2="1"><stop stopColor="#fff6b2"/><stop offset=".48" stopColor="#ffe47a"/><stop offset=".51" stopColor="#ffcb24"/><stop offset="1" stopColor="#ffdf48"/></linearGradient>
        <linearGradient id={`${id}-track`} x2="0" y2="1"><stop stopColor="#b8edff"/><stop offset=".16" stopColor="#66bded"/><stop offset=".55" stopColor="#1871ba"/><stop offset="1" stopColor="#88d8ff"/></linearGradient>
        <linearGradient id={`${id}-fill`} x2="0" y2="1"><stop stopColor="#fff7a5"/><stop offset=".4" stopColor="#ffe85f"/><stop offset=".55" stopColor="#ffc600"/><stop offset="1" stopColor="#ffdf44"/></linearGradient>
        <clipPath id={`${id}-bar`}><rect x="121" y="705" width="1808" height="58" rx="29"/></clipPath>
        <clipPath id={`${id}-card`}><rect x="46" y="33" width="1957" height="1023" rx="101"/></clipPath>
      </defs>
      <image href="/images/BG%20SV3.png" width="2048" height="1153" clipPath={`url(#${id}-card)`}/>
      <rect x="46" y="33" width="1957" height="1023" rx="101" fill="none" stroke="#9cddff" strokeWidth="3"/>
      {/* Live values are positioned in the blank areas of BG SV3. */}
      <rect x="1681" y="95" width="258" height="114" rx="57" fill={`url(#${id}-ticket)`}/>
      <text x="1810" y="172" textAnchor="middle" fill="#151713" fontSize="70" fontWeight="800">{tickets}</text>
      <text x="204" y="474" className="star-artwork-gold star-artwork-total" fontSize={total.length > 17 ? 85 : 102} fontWeight="700">{total}</text>
      <text x="156" y="653" fill="#003b87" fontSize="52" fontWeight="700">Mốc tiếp theo</text>
      {isPlatinum ? <foreignObject x="800" y="580" width="1135" height="105">
        <div className="star-artwork-badge-row"><span className="star-artwork-platinum-badge">
          <svg viewBox="0 0 80 60" width="64" height="48" aria-hidden="true"><path d="m4 8 18 18L40 6l18 20L76 8 66 52H14Z" fill="#7d91a9" stroke="#526a84" strokeWidth="2"/></svg>
          {next}
        </span></div>
      </foreignObject> : <text x="1915" y="653" textAnchor="end" className="star-artwork-gold" fontSize={String(next).length > 30 ? 44 : 52} fontWeight="700">{next}</text>}
      <rect x="121" y="705" width="1808" height="58" rx="29" fill={`url(#${id}-track)`} stroke="#9be8ff" strokeWidth="3"/>
      <g clipPath={`url(#${id}-bar)`}><rect x="121" y="705" width={1808 * progress / 100} height="58" rx="29" fill={`url(#${id}-fill)`} stroke="#fff0a0" strokeWidth="3"/></g>
      <text x="137" y="845" fill="#003b87" fontSize="62" fontWeight="700">{progress.toFixed(1).replace(".0", "")}%</text>
      {remaining > 0 && <foreignObject x="800" y="792" width="1135" height="114">
        <div className="star-artwork-badge-row"><span className="star-artwork-remaining-badge"><span>Còn</span><strong>{formatVnd(remaining)}</strong></span></div>
      </foreignObject>}
    </svg>
  </section>;
}
