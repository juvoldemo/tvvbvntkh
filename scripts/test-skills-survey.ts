import assert from "node:assert/strict";
import { classifySurveyScore, evaluateSkillsSurvey, formatSurveyScore, SKILLS_SURVEY_POINTS } from "../lib/skills-survey-scoring";
import questions from "../lib/skills-survey-questions.json";

const expected = ["1423", "3142", "4213", "2341", "4123", "2413", "1423", "2341", "2341", "4123", "1423", "2413", "4123", "2413", "2413", "3421", "4123", "1423", "1423", "1432", "1432", "2431", "2431", "2143"];
assert.deepEqual(SKILLS_SURVEY_POINTS.map((row) => row.join("")), expected);
assert.equal(questions.length, 24);
assert(questions.every((question, index) => question.id === index + 1 && question.options.length === 4));
const answersForPoints = (point: number) => Object.fromEntries(SKILLS_SURVEY_POINTS.map((row, index) => [index + 1, row.indexOf(point)]));
for (const [point, total, score, label] of [[4, 96, 10, "Tốt"], [3, 72, 7.5, "Khá"], [2, 48, 5, "Cần củng cố"], [1, 24, 2.5, "Ưu tiên huấn luyện"]] as const) {
  const result = evaluateSkillsSurvey(answersForPoints(point))!;
  assert.equal(result.total, total);
  assert.equal(result.average, score);
  assert(result.skills.every((skill) => skill.score === score && skill.label === label));
  assert.equal(result.allEqual, true);
  assert.equal(result.strongest.length, 6);
  assert.equal(result.priorities.length, 6);
}
const allA = evaluateSkillsSurvey(Object.fromEntries(questions.map((q) => [q.id, 0])))!;
assert.deepEqual(allA.skills.map((skill) => skill.raw), [10, 9, 9, 11, 7, 7]);
assert.equal(allA.total, 53);
assert.equal(allA.average, 53 / 96 * 10);
assert.deepEqual(allA.strongest.map((skill) => skill.name), ["Hóa giải sự trì hoãn"]);
assert.deepEqual(allA.priorities.map((skill) => skill.name), ["Chốt hợp đồng", "Bàn giao & phục vụ"]);
assert.equal(formatSurveyScore(allA.average), "5,5");
const twoStrongest = answersForPoints(1);
for (let id = 1; id <= 8; id++) twoStrongest[id] = SKILLS_SURVEY_POINTS[id - 1].indexOf(4);
assert.deepEqual(evaluateSkillsSurvey(twoStrongest)!.strongest.map((skill) => skill.name), ["Khách hàng tiềm năng", "Thiết lập cuộc hẹn"]);
for (const [score, label] of [[3.99, "Ưu tiên huấn luyện"], [4, "Cần củng cố"], [5.99, "Cần củng cố"], [6, "Khá"], [7.99, "Khá"], [8, "Tốt"], [10, "Tốt"]] as const) assert.equal(classifySurveyScore(score).label, label);
assert.equal(evaluateSkillsSurvey({}), null);
const incomplete = answersForPoints(4);
delete incomplete[24];
assert.equal(evaluateSkillsSurvey(incomplete), null);
assert.equal(evaluateSkillsSurvey({ ...answersForPoints(4), 24: 4 }), null);
assert.equal(evaluateSkillsSurvey({ ...answersForPoints(4), 24: 1.5 }), null);
console.log("PASS: all 96 weights, six skill groups, averages, thresholds, ties and incomplete/invalid responses");
