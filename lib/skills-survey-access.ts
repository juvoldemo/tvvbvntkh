export function canAccessSkillsSurvey(advisorCode: unknown) {
  return String(advisorCode ?? "").trim().toUpperCase() === "ADMIN";
}
