export const discussionGroups = [
  { slug: "khach-hang-tiem-nang", name: "Khách hàng tiềm năng" },
  { slug: "thiet-lap-cuoc-hen", name: "Thiết lập cuộc hẹn" },
  { slug: "tiep-can-tu-van", name: "Tiếp cận & tư vấn" },
  { slug: "hoa-giai-su-tri-hoan", name: "Hóa giải sự trì hoãn" },
  { slug: "chot-hop-dong", name: "Chốt hợp đồng" },
  { slug: "ban-giao-phuc-vu", name: "Bàn giao & phục vụ" }
] as const;

export const discussionQuestions = [
  { title: "BẮT BỆNH", text: "Chị Lan đã làm chưa tốt hoặc bỏ sót điều gì trong mỗi bước bán hàng?" },
  { title: "TÌM NGUYÊN NHÂN", text: "Sai sót đó ảnh hưởng như thế nào đến kết quả và các bước bán hàng khác?" },
  { title: "KÊ ĐƠN", text: "Nếu là chị Lan, Anh/Chị sẽ thay đổi điều gì?" }
] as const;

export const findDiscussionGroup = (slug: string) => discussionGroups.find(group => group.slug === slug);
