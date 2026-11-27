// Lucian UX/UI Prompt #471 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#471
import { useState } from "react";
import { Search } from "lucide-react";
import styles from "./AccessSearch.module.css";

export default function AccessSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [pulse, setPulse] = useState(0);
  return <label className={styles.u471}>
    <span className={styles.field}>
      <Search className={styles.icon} size={18} aria-hidden="true" />
      <input type="search" aria-label="Tìm theo tên hoặc mã TVV" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Tìm theo tên hoặc mã TVV" onFocus={() => setPulse((current) => current + 1)} />
      {pulse > 0 && <span key={pulse} className={styles.ripple} aria-hidden="true" />}
    </span>
  </label>;
}
