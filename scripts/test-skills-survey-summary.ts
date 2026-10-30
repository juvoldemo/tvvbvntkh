import assert from "node:assert/strict";
import { summarizeSurveyGroups } from "../lib/skills-survey-summary";
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
