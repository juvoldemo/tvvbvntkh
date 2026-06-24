import styles from "./LeaderboardPoster.module.css";
import { groupLeaderName } from "@/lib/group-leaders";

export type LeaderboardPosterRow = {
  rank: number;
  banName: string;
  groupName: string;
  afyp: number;
  ip: number;
  contractCount: number;
  agentCount: number;
  afypShare: number;
  averageAfypPerContract: number;
};

function formatMillion(value: number) {
  return (Number(value || 0) / 1_000_000).toLocaleString("vi-VN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}

function formatPercent(value: number) {
  return Number(value || 0).toLocaleString("vi-VN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }) + "%";
}

function Rank({ rank }: { rank: number }) {
  if (rank > 3) return <span className={styles.rank}>{rank}</span>;
  const tone = rank === 1 ? styles.gold : rank === 2 ? styles.silver : styles.bronze;
  return <span className={`${styles.medal} ${tone}`}>{rank}</span>;
}

export default function LeaderboardPoster({
  month,
  rows
}: {
  month: string;
  rows: LeaderboardPosterRow[];
}) {
  const [year, monthNumber] = month.slice(0, 7).split("-");
  const posterRows = rows.filter(
    (row) => row.groupName.trim().toLocaleLowerCase("vi-VN") !== "banca"
  ).map((row, index) => ({ ...row, rank: index + 1 }));
  const height = Math.max(900, 294 + 64 + posterRows.length * 58 + 100);

  return (
    <div className={styles.poster} style={{ height }}>
      <div className={styles.sparkles} />
      <header className={styles.hero}>
        <div className={styles.laurel}>★</div>
        <div className={styles.titles}>
          <h1>BẢNG VÀNG</h1>
          <h2>DOANH THU NHÓM</h2>
          <p>{Number(monthNumber)}/{year}</p>
        </div>
        <div className={styles.growth}>
          <div className={styles.bars}><i /><i /><i /><i /></div>
          <div className={styles.arrow}>↗</div>
        </div>
      </header>

      <div className={styles.tableFrame}>
        <table className={styles.table}>
          <colgroup>
            <col style={{ width: "72px" }} />
            <col style={{ width: "205px" }} />
            <col style={{ width: "365px" }} />
            <col style={{ width: "145px" }} />
            <col style={{ width: "75px" }} />
            <col style={{ width: "75px" }} />
            <col style={{ width: "145px" }} />
            <col style={{ width: "135px" }} />
          </colgroup>
          <thead>
            <tr>
              <th>#</th>
              <th>NHÓM</th>
              <th>TRƯỞNG NHÓM</th>
              <th>AFYP<br />(triệu)</th>
              <th>HĐ</th>
              <th>TVV</th>
              <th>TỶ TRỌNG</th>
              <th>BQ/HĐ<br />(triệu)</th>
            </tr>
          </thead>
          <tbody>
            {posterRows.map((row) => (
              <tr key={`${row.rank}-${row.banName}-${row.groupName}`}>
                <td className={styles.rankCell}><Rank rank={row.rank} /></td>
                <td className={styles.nameCell}>{row.groupName}</td>
                <td className={styles.nameCell}>{groupLeaderName(row.groupName)}</td>
                <td className={styles.moneyCell}>{formatMillion(row.afyp)}</td>
                <td className={styles.countCell}>{row.contractCount}</td>
                <td className={styles.countCell}>{row.agentCount}</td>
                <td className={styles.percentCell}>{formatPercent(row.afypShare)}</td>
                <td className={styles.moneyCell}>{formatMillion(row.averageAfypPerContract)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className={styles.footer}>
        <span><b>↗</b> Đơn vị: triệu đồng</span>
        <span><b>★</b> Chúc mừng các nhóm xuất sắc!</span>
      </footer>
    </div>
  );
}
