import type { SkillsSurveyReport } from "./skills-survey-reports";
import { classifySurveyScore, SURVEY_SKILLS } from "./skills-survey-scoring";

export const SURVEY_SCORE_BANDS = [
  { tone: "good", label: "Tốt", range: "8,0 – 10" },
  { tone: "fair", label: "Khá", range: "6,0 – dưới 8,0" },
  { tone: "reinforce", label: "Cần củng cố", range: "4,0 – dưới 6,0" },
  { tone: "priority", label: "Ưu tiên huấn luyện", range: "Dưới 4,0" }
] as const;

export function summarizeSkillDistribution(reports: readonly SkillsSurveyReport[]) {
  return SURVEY_SKILLS.map((skill, index) => {
    const counts = { good: 0, fair: 0, reinforce: 0, priority: 0 };
    for (const report of reports) {
      const score = report.skillScores[index];
      if (Number.isFinite(score) && score >= 0 && score <= 10) counts[classifySurveyScore(score).tone]++;
    }
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    return { name: skill.name, counts, total };
  });
}

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
