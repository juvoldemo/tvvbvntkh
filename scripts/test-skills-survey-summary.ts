import assert from "node:assert/strict";
import { summarizeSkillDistribution, summarizeSurveyGroups } from "../lib/skills-survey-summary";
import type { SkillsSurveyReport } from "../lib/skills-survey-reports";

const row = (groupName: string, total: number): SkillsSurveyReport => ({ advisorCode: String(total), advisorName: "Test", groupName, total, average: total / 96 * 10, skillScores: Array(6).fill(total / 96 * 10), answers: {}, classification: "", scoringVersion: "test", updatedAt: "2026-10-30T00:00:00Z" });
assert.deepEqual(summarizeSurveyGroups([]), []);
const groups = summarizeSurveyGroups([row("Nhóm A", 96), row("Nhóm A", 24), row("Nhóm B", 48), row("", 72)]);
const groupA = groups.find((group) => group.groupName === "Nhóm A")!;
assert.equal(groupA.count, 2);
assert.equal(groupA.total, 120);
assert.equal(groupA.averageTotal, 60);
assert.equal(groupA.average, 6.25);
assert.deepEqual(groupA.skillScores, Array(6).fill(6.25));
assert.equal(groupA.classification, "Khá");
assert.equal(groups.find((group) => group.groupName === "Nhóm B")!.average, 5);
assert.equal(groups.find((group) => group.groupName === "Chưa có nhóm")!.count, 1);
console.log("PASS: group counts, skill means, sum of points, mean total, average score and classification");
const scores = [2.5, 3.99, 4, 5.99, 6, 7.99, 8, 10];
const distribution = summarizeSkillDistribution(scores.map((score, index) => ({ ...row("Test", 24), advisorCode: String(index), skillScores: Array(6).fill(score) })));
assert.equal(distribution.length, 6);
for (const skill of distribution) {
  assert.deepEqual(skill.counts, { good: 2, fair: 2, reinforce: 2, priority: 2 });
  assert.equal(skill.total, 8);
}
const independent = summarizeSkillDistribution([{ ...row("Test", 24), skillScores: [2.5, 4, 6, 8, 10, 5] }]);
assert.equal(independent[0].counts.priority, 1);
assert.equal(independent[1].counts.reinforce, 1);
assert.equal(independent[2].counts.fair, 1);
assert.equal(independent[3].counts.good, 1);
assert(summarizeSkillDistribution([]).every((skill) => skill.total === 0));
console.log("PASS: score bands, exact boundaries before rounding, independent skills and empty distribution");
