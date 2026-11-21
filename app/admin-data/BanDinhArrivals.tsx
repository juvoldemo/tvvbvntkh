"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import { BanDinhReport, BanDinhReportSummary } from "@/lib/ban-dinh";

type Arrival = { id: string; row: BanDinhReport; lane: number; delay: number };

export default function BanDinhArrivals({ reports, active }: { reports: BanDinhReportSummary | null; active: boolean }) {
  const known = useRef<Set<string> | null>(null);
  const sequence = useRef(0);
  const [arrivals, setArrivals] = useState<Arrival[]>([]);

  useEffect(() => {
    if (!active) { known.current = null; setArrivals([]); return; }
    if (!reports) return;
    const codes = new Set(reports.rows.map(row => row.advisorCode));
    if (known.current) {
      const added = reports.rows.filter(row => !known.current!.has(row.advisorCode))
        .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
        .map((row, index) => ({ id: `${row.advisorCode}-${++sequence.current}`, row, lane: (sequence.current % 6), delay: index * 1.1 }));
      if (added.length) setArrivals(current => [...current, ...added].slice(-60));
    }
    known.current = codes;
  }, [reports, active]);

  return <div className="ban-dinh-arrivals" aria-live="polite" aria-relevant="additions">
    {arrivals.map(arrival => <div key={arrival.id} className="ban-dinh-arrival" style={{
      left: `${4 + arrival.lane * 9}%`,
      animationDelay: `${arrival.delay}s`,
      "--arrival-drift": `${arrival.lane % 2 ? -4 : 4}vw`,
    } as CSSProperties} onAnimationEnd={() => setArrivals(current => current.filter(item => item.id !== arrival.id))}>
      {arrival.row.advisorName} - {arrival.row.groupName || "Chưa có nhóm"} - {arrival.row.consultations.toLocaleString("vi-VN")} cuộc tư vấn - {arrival.row.contracts.toLocaleString("vi-VN")} hợp đồng KTM
    </div>)}
  </div>;
}
