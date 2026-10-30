import type { SkillsSurveyReport } from "./skills-survey-reports";
import { classifySurveyScore } from "./skills-survey-scoring";

export function summarizeSurveyGroups(reports: readonly SkillsSurveyReport[]) {
  const groups = new Map<string, SkillsSurveyReport[]>();
  for (const report of reports) {
    const name = report.groupName.trim();
    const rows = groups.get(name) ?? [];
    rows.push(report);
    groups.set(name, rows);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b, "vi")).map(([groupName, rows]) => {
    const count = rows.length;
    const total = rows.reduce((sum, row) => sum + row.total, 0);
    const average = rows.reduce((sum, row) => sum + row.average, 0) / count;
    return {
      groupName: groupName || "Chưa có nhóm", count, total, averageTotal: total / count, average,
      skillScores: Array.from({ length: 6 }, (_, index) => rows.reduce((sum, row) => sum + row.skillScores[index], 0) / count),
      classification: classifySurveyScore(average).label
    };
  });
}
