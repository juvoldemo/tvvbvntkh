// Columns follow the original A, B, C, D order. Each consecutive four
// questions assess one skill; do not shuffle without updating this mapping.
export const SKILLS_SURVEY_POINTS: readonly (readonly number[])[] = [
  [1, 4, 2, 3], [3, 1, 4, 2], [4, 2, 1, 3], [2, 3, 4, 1],
  [4, 1, 2, 3], [2, 4, 1, 3], [1, 4, 2, 3], [2, 3, 4, 1],
  [2, 3, 4, 1], [4, 1, 2, 3], [1, 4, 2, 3], [2, 4, 1, 3],
  [4, 1, 2, 3], [2, 4, 1, 3], [2, 4, 1, 3], [3, 4, 2, 1],
  [4, 1, 2, 3], [1, 4, 2, 3], [1, 4, 2, 3], [1, 4, 3, 2],
  [1, 4, 3, 2], [2, 4, 3, 1], [2, 4, 3, 1], [2, 1, 4, 3]
];

export const SURVEY_SKILLS = [
  { name: "Khách hàng tiềm năng", strength: "Có thể phát huy khả năng nhận diện và phát triển khách hàng.", priority: "Nên thực hành phân nhóm khách hàng, tìm hiểu nhu cầu và lập kế hoạch mở rộng danh sách hằng tuần." },
  { name: "Thiết lập cuộc hẹn", strength: "Có thể phát huy khả năng kết nối và thống nhất cuộc hẹn phù hợp với khách hàng.", priority: "Nên thực hành nêu mục đích cuộc gặp, gợi ý thời gian cụ thể và xác nhận lại lịch hẹn." },
  { name: "Tiếp cận & tư vấn", strength: "Có thể phát huy khả năng tìm hiểu nhu cầu và giải thích giải pháp theo hoàn cảnh khách hàng.", priority: "Nên thực hành đặt câu hỏi về nhu cầu, lắng nghe và minh họa giải pháp bằng tình huống gần gũi với khách hàng." },
  { name: "Hóa giải sự trì hoãn", strength: "Có thể phát huy khả năng lắng nghe và làm rõ những băn khoăn của khách hàng.", priority: "Nên thực hành khai thác nguyên nhân khách hàng do dự, đặt câu hỏi và xử lý các tình huống thực tế." },
  { name: "Chốt hợp đồng", strength: "Có thể phát huy khả năng nhận diện sự sẵn sàng và hỗ trợ khách hàng đưa ra quyết định phù hợp.", priority: "Nên thực hành xác nhận mức độ sẵn sàng, rà soát khả năng duy trì và thống nhất bước tiếp theo với khách hàng." },
  { name: "Bàn giao & phục vụ", strength: "Có thể phát huy khả năng hướng dẫn hợp đồng và chăm sóc khách hàng sau khi tham gia.", priority: "Nên thực hành hướng dẫn các nội dung quan trọng của hợp đồng, chăm sóc đúng nhu cầu và phối hợp phản hồi chính xác." }
] as const;

export function classifySurveyScore(score: number) {
  if (score >= 8) return { label: "Tốt", tone: "good" } as const;
  if (score >= 6) return { label: "Khá", tone: "fair" } as const;
  if (score >= 4) return { label: "Cần củng cố", tone: "reinforce" } as const;
  return { label: "Ưu tiên huấn luyện", tone: "priority" } as const;
}

export function evaluateSkillsSurvey(answers: Readonly<Record<number, number>>) {
  const points = SKILLS_SURVEY_POINTS.map((row, index) => {
    const choice = answers[index + 1];
    if (!Number.isInteger(choice) || choice < 0 || choice > 3) return null;
    return row[choice];
  });
  if (points.some((point) => point === null)) return null;
  const validPoints = points as number[];
  const skills = SURVEY_SKILLS.map((skill, index) => {
    const raw = validPoints.slice(index * 4, index * 4 + 4).reduce((sum, point) => sum + point, 0);
    const score = raw / 16 * 10;
    return { ...skill, firstQuestion: index * 4 + 1, lastQuestion: index * 4 + 4, raw, score, ...classifySurveyScore(score) };
  });
  const total = validPoints.reduce((sum, point) => sum + point, 0);
  const average = total / 96 * 10;
  const highest = Math.max(...skills.map((skill) => skill.raw));
  const lowest = Math.min(...skills.map((skill) => skill.raw));
  return {
    skills, total, average, classification: classifySurveyScore(average),
    strongest: skills.filter((skill) => skill.raw === highest),
    priorities: skills.filter((skill) => skill.raw === lowest),
    allEqual: highest === lowest
  };
}

export function formatSurveyScore(score: number) {
  return score.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
