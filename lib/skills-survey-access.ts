export function canAccessSkillsSurvey(advisorCode: unknown) {
  return typeof advisorCode === "string" && advisorCode.trim().length > 0;
}
