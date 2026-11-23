import { config } from "dotenv";
import { readFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { getSupabaseAdmin } from "../lib/supabase";
import { presentForumRows, FORUM_BUCKET } from "../lib/forum-server";
import { FORUM_FILE_LIMIT } from "../lib/forum";

config({ path: ".env.local", quiet: true });
const posts = [
  {
    title: "[Bài mẫu] Cùng chia sẻ cách duy trì hoạt động tư vấn mỗi ngày",
    content: "Đây là bài đăng mẫu để minh họa chức năng diễn đàn. Tên người phản hồi là nhân vật giả lập.\n\nMình mở chủ đề để mọi người chia sẻ cách sắp xếp hoạt động tư vấn hằng ngày: tìm kiếm khách hàng, chuẩn bị cuộc hẹn và theo dõi sau tư vấn.\n\nBạn thường dành thời gian cho từng việc như thế nào? Điều gì giúp bạn giữ nhịp làm việc đều đặn? Ảnh đính kèm là tài liệu đang có trên website để minh họa cuộc thảo luận.",
    image: "Thưởng năng suất tháng.png",
    replies: [
      "Mình thường lên danh sách công việc từ tối hôm trước. Buổi sáng ưu tiên liên hệ khách hàng, buổi chiều dành cho các cuộc hẹn đã xác nhận.",
      "Mình chia việc thành ba nhóm: cần làm hôm nay, đang chờ khách hàng và cần theo dõi thêm. Nhờ vậy mình ít bỏ sót lịch hẹn.",
      "Trước mỗi cuộc gặp, mình chuẩn bị vài câu hỏi về nhu cầu và mục tiêu của khách hàng. Mọi người có thể chia sẻ thêm cách chuẩn bị không?",
      "Mình ghi lại điều đã trao đổi ngay sau cuộc hẹn và hẹn thời điểm liên hệ tiếp theo. Cách này giúp cuộc trò chuyện sau liền mạch hơn.",
      "Nhóm mình dành một khoảng ngắn cuối tuần để cùng nhìn lại hoạt động, chia sẻ cách làm hiệu quả và hỗ trợ các trường hợp còn vướng.",
      "Mình từng lập lịch quá dày nên khó theo sát. Hiện tại mình để thêm khoảng trống giữa các cuộc hẹn để chuẩn bị và ghi chú.",
      "Mình còn ngại bắt đầu cuộc gọi đầu tiên trong ngày. Có bạn nào có cách khởi động để tự tin hơn không?",
      "Mình thấy ghi nhận những việc nhỏ đã hoàn thành cũng giúp giữ động lực. Mọi người có thể chia sẻ thêm cách duy trì thói quen này không?"
    ]
  },
  {
    title: "[Bài mẫu] Kinh nghiệm đồng hành và hỗ trợ thành viên mới trong nhóm",
    content: "Nội dung thảo luận mẫu; các phản hồi bên dưới dùng nhân vật giả lập.\n\nKhi một thành viên mới tham gia, điều gì giúp bạn ấy nhanh chóng làm quen với công việc và cảm thấy được hỗ trợ?\n\nMời mọi người chia sẻ cách hướng dẫn tuần đầu, tổ chức thực hành và duy trì trao đổi trong nhóm. Ảnh đính kèm là tài liệu minh họa từ website, không thay thế nội dung chính sách chính thức.",
    image: "Thưởng phát triển hệ thống.png",
    replies: [
      "Mình thường bắt đầu bằng một buổi làm quen ngắn, giới thiệu người có thể hỗ trợ từng nội dung để thành viên mới biết nên hỏi ai.",
      "Nhóm mình có danh sách việc cần làm trong tuần đầu và tài liệu tham khảo. Mỗi ngày chỉ tập trung một vài nội dung để dễ tiếp thu.",
      "Mình thấy thực hành theo tình huống rất hữu ích. Một người đóng vai khách hàng, một người tư vấn rồi cả nhóm góp ý cụ thể.",
      "Thành viên mới nên có một người đồng hành để trao đổi khi cần. Mình ưu tiên phản hồi sớm các câu hỏi nhỏ thay vì chờ đến buổi họp.",
      "Nhóm mình tổng hợp những câu hỏi thường gặp vào một chỗ. Mỗi người có thể bổ sung ví dụ để tài liệu sát với công việc hơn.",
      "Lúc mới vào mình từng ngại hỏi vì sợ làm phiền. Nếu nhóm có một khoảng trao đổi cố định mỗi ngày thì mình sẽ dễ mở lời hơn.",
      "Mình muốn có thêm ví dụ về cách giới thiệu bản thân trong cuộc hẹn đầu. Mọi người có thể chia sẻ khung nói chuyện tham khảo không?",
      "Mình nghĩ nên hỏi thành viên mới đang vướng ở bước nào rồi cùng xử lý từng việc. Theo sát từng bước sẽ giúp bạn ấy tự tin hơn."
    ]
  },
  {
    title: "[Bài mẫu] Lập kế hoạch quý: làm sao chia mục tiêu thành việc cụ thể?",
    content: "Bài viết và phản hồi là dữ liệu mẫu để trải nghiệm giao diện diễn đàn.\n\nThay vì chỉ nhìn mục tiêu cuối quý, mình muốn chia kế hoạch thành từng tuần với những việc có thể theo dõi được.\n\nBạn đang theo dõi hoạt động bằng sổ, bảng tính hay lịch điện thoại? Khi kế hoạch thay đổi, bạn thường điều chỉnh ra sao? Cùng chia sẻ cách làm và ví dụ thực tế nhé. Tài liệu ảnh đi kèm chỉ dùng minh họa.",
    image: "Thưởng Quý.png",
    replies: [
      "Mình bắt đầu từ lịch làm việc thực tế trong quý rồi chia kế hoạch theo tuần. Mình dành thêm thời gian cho các việc phát sinh.",
      "Mình dùng lịch điện thoại cho cuộc hẹn và bảng tính cho các việc cần theo dõi. Cuối ngày mình cập nhật để hôm sau biết nên ưu tiên việc nào.",
      "Mình tách kết quả mong muốn khỏi hoạt động cần thực hiện. Khi nhìn lại, mình dễ thấy bước nào đang cần hỗ trợ hơn.",
      "Mỗi tuần mình chỉ chọn vài ưu tiên chính. Nếu có thay đổi, mình sắp xếp lại lịch và báo sớm cho người liên quan.",
      "Nhóm mình xem lại kế hoạch vào đầu tuần, trao đổi các vướng mắc và thống nhất việc cần phối hợp thay vì chỉ nhắc đến con số cuối kỳ.",
      "Mình từng đặt kế hoạch quá lạc quan nên dễ nản khi lệch tiến độ. Bây giờ mình rà lại dựa trên thời gian và nguồn lực thực tế.",
      "Mình muốn tìm một mẫu bảng theo dõi đơn giản trên điện thoại. Chỉ cần các cột việc cần làm, ngày hẹn và trạng thái là đủ.",
      "Mình thấy việc nhìn lại điều đã học được trong tuần cũng quan trọng. Mỗi tuần nhóm có thể ghi lại một điều muốn cải thiện cho tuần tiếp theo."
    ]
  }
];
const topicId = (post: number) => `f0de0000-0000-4000-8000-${String(post + 1).padStart(12, "0")}`;
const commentId = (post: number, reply: number) => `f0de0001-0000-4000-8000-${String(post * 8 + reply + 1).padStart(12, "0")}`;
const imageId = (post: number) => `f0de0002-0000-4000-8000-${String(post + 1).padStart(12, "0")}`;

async function main() {
  const db = getSupabaseAdmin();
  const ids = posts.map((_, index) => topicId(index));
  const { error: schemaError } = await db.from("forum_topics").select("id").limit(0);
  if (schemaError) throw new Error("Cần chạy supabase/forum.sql trước khi tạo bài mẫu.");
  const { data: accounts, error: accountsError } = await db.from("authorized_users")
    .select("advisor_code,full_name,group_name").not("group_name", "is", null).neq("group_name", "")
    .order("advisor_code").limit(100);
  if (accountsError) throw accountsError;
  const members = (accounts || []).filter(account => account.full_name?.trim() && !/ADMIN|TEST|DEMO/i.test(account.advisor_code)).slice(0, 8);
  assert.equal(members.length, 8, "Cần ít nhất 8 tài khoản thành viên thật có sẵn trong hệ thống.");
  const memberNames = new Set(members.map(member => member.full_name));
  const start = Date.now() - 50 * 60 * 1000;
  for (const [index, post] of posts.entries()) {
    const image = await readFile(path.join(process.cwd(), "public", post.image));
    assert.ok(image.length < FORUM_FILE_LIMIT);
    const attachment = { id: imageId(index), path: imageId(index), name: post.image, size: image.length, mime: "image/png" };
    const { error: uploadError } = await db.storage.from(FORUM_BUCKET).upload(attachment.path, image, { contentType: "image/png", upsert: true });
    if (uploadError) throw uploadError;
    const { data: existing, error: lookupError } = await db.from("forum_topics").select("id").eq("id", ids[index]).maybeSingle();
    if (lookupError) throw lookupError;
    if (!existing) {
      const created = new Date(start + index * 12 * 60 * 1000).toISOString();
      const { error } = await db.from("forum_topics").insert({ id: ids[index], author_code: "FORUM_DEMO_EDITOR", anonymous: false, title: post.title, content: post.content, attachments: [attachment], created_at: created, last_activity_at: created });
      if (error) throw error;
    }
    const description = post.content.replace(/Tên người phản hồi là nhân vật giả lập\./g, "")
      .replace(/các phản hồi bên dưới dùng nhân vật giả lập\./g, "")
      .replace(/Bài viết và phản hồi là dữ liệu mẫu để trải nghiệm giao diện diễn đàn\./g, "");
    const { error: descriptionError } = await db.from("forum_topics").update({
      content: `Lưu ý: các phản hồi là nội dung mẫu minh họa giao diện, được gán cho tài khoản có sẵn trong hệ thống; không phải nội dung do các thành viên tự đăng.\n\n${description.trim()}`
    }).eq("id", ids[index]).eq("author_code", "FORUM_DEMO_EDITOR");
    if (descriptionError) throw descriptionError;
    for (const [replyIndex, content] of post.replies.entries()) {
      const id = commentId(index, replyIndex);
      const { data: existingComment, error: commentLookupError } = await db.from("forum_comments").select("id").eq("id", id).maybeSingle();
      if (commentLookupError) throw commentLookupError;
      if (existingComment) {
        const { error } = await db.from("forum_comments").update({ author_code: members[replyIndex].advisor_code, attachments: [], content })
          .eq("id", id).eq("topic_id", ids[index]);
        if (error) throw error;
        continue;
      }
      const { error } = await db.from("forum_comments").insert({ id, topic_id: ids[index], parent_id: null,
        author_code: members[replyIndex].advisor_code, anonymous: replyIndex >= 5,
        content, sticker: replyIndex === 4 ? "👏" : null, attachments: [],
        created_at: new Date(start + (index * 12 + replyIndex + 1) * 60 * 1000).toISOString() });
      if (error) throw error;
    }
  }
  const { data: topics, error: topicsError } = await db.from("forum_topics").select("*").in("id", ids);
  if (topicsError) throw topicsError;
  assert.equal(topics?.length, 3);
  for (const topic of topics!) {
    const { data: comments, error } = await db.from("forum_comments").select("*").eq("topic_id", topic.id);
    if (error) throw error;
    assert.equal(comments?.length, 8);
    assert.equal(comments!.filter(comment => !comment.anonymous).length, 5);
    assert.equal(comments!.filter(comment => comment.anonymous).length, 3);
    assert.equal(new Set(comments!.map(comment => comment.author_code)).size, 8);
    assert.ok(comments!.every(comment => comment.attachments.length === 0));
    assert.ok(comments!.every(comment => members.some(member => member.advisor_code === comment.author_code)));
    assert.equal(topic.comment_count, 8, "Trigger must update discussion count");
    assert.equal(topic.last_activity_at, comments!.map(comment => comment.created_at).sort().at(-1));
    const visible = await presentForumRows(comments!, topic.id);
    assert.ok(visible.filter(comment => !comment.author.anonymous).every(comment => memberNames.has(comment.author.name)));
    assert.ok(visible.filter(comment => comment.author.anonymous).every(comment => /^Ẩn danh \d{4}$/.test(comment.author.name) && !comment.author.group && !comment.author.avatar));
    const { data: downloaded, error: downloadError } = await db.storage.from(FORUM_BUCKET).download(topic.attachments[0].path);
    if (downloadError) throw downloadError;
    assert.ok(downloaded && downloaded.size === topic.attachments[0].size);
    console.log(JSON.stringify({ title: topic.title, namedReplies: 5, anonymousReplies: 3, replyImages: 0, realAccountsVerified: true, countVerified: true }));
  }
  console.log("Created and verified 3 demo topics, 24 replies, 3 private image assets. Running again does not duplicate these records.");
}
main().catch(error => { console.error(error instanceof Error ? error.message : JSON.stringify(error)); process.exitCode = 1; });
