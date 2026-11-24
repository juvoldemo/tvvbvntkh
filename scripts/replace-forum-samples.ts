import { config } from "dotenv";
import { randomInt, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { getSupabaseAdmin } from "../lib/supabase";
import { forumDemoProfiles } from "../lib/forum-demo";
config({ path: ".env.local", quiet: true });

// Synthetic identities only: never attribute generated discussions to real members.
const discussions = [
  ["Lịch làm việc đầu tuần: mọi người ưu tiên việc gì?", "Sáng thứ Hai mình thường mất khá lâu để sắp lại lịch. Mọi người chọn việc cần làm trước theo mức độ gấp hay theo lịch hẹn đã xác nhận?", "Mình chốt ba việc chính từ tối Chủ nhật, sáng đầu tuần chỉ rà lại các cuộc hẹn.", "Mình để trống một khung giờ buổi chiều cho việc phát sinh. Lịch đỡ bị dồn hơn.", "Nếu khách đổi lịch thì bạn có chuyển sang làm việc tiếp theo luôn không?"],
  ["Khách đổi lịch sát giờ, nên phản hồi thế nào?", "Chiều nay mình chuẩn bị xong thì khách xin dời cuộc hẹn. Mình muốn giữ sự thoải mái cho khách nhưng vẫn chủ động lịch của mình. Có cách trả lời nào gọn và lịch sự không?", "Mình đưa hai khung giờ khác để khách chọn, tránh hỏi quá rộng là khi nào anh chị rảnh.", "Mình thường hỏi khách muốn đổi sang gọi điện ngắn hay hẹn lại trực tiếp.", "Theo mình cứ xác nhận việc đổi lịch trước, rồi mới đề xuất ngày mới."],
  ["Một câu hỏi mở giúp cuộc gặp bớt căng thẳng", "Mình đang tập mở đầu cuộc gặp bằng câu hỏi dễ trả lời, không đi ngay vào sản phẩm. Các bạn hay bắt đầu câu chuyện như thế nào?", "Mình hỏi điều gì khiến anh chị muốn tìm hiểu vào thời điểm này.", "Mình hỏi khách mong muốn nhận được điều gì sau buổi trao đổi hôm nay.", "Có người thích đi thẳng vào vấn đề. Mình thường hỏi xem họ có bao nhiêu thời gian trước."],
  ["Ghi chú sau cuộc gặp bằng sổ hay điện thoại?", "Mình thích viết sổ nhưng tìm lại thông tin hơi chậm. Ai có cách ghi chú đơn giản, dễ xem lại mà không ghi quá nhiều thông tin riêng tư của khách không?", "Mình chỉ ghi nhu cầu chính, việc đã hẹn và ngày liên hệ tiếp theo.", "Mình dùng mã khách trong ghi chú, không ghi các thông tin nhạy cảm lên ứng dụng cá nhân.", "Sổ vẫn tiện lúc trao đổi, cuối ngày mình chuyển phần việc cần làm vào lịch."],
  ["Làm sao để họp nhóm 30 phút mà vẫn đủ ý?", "Buổi họp gần đây hay kéo dài vì trao đổi nhiều việc phát sinh. Mình định gửi nội dung trước và giới hạn từng phần. Nhóm bạn làm cách nào?", "Nhóm mình dành 10 phút cập nhật, 15 phút tháo gỡ một vướng mắc, 5 phút chốt việc.", "Các câu hỏi ngoài chủ đề được ghi lại để trao đổi riêng sau cuộc họp.", "Nên có một người ghi rõ ai làm gì và hẹn lúc nào cập nhật."],
  ["Tuần đầu của thành viên mới nên học những gì?", "Nếu chỉ chọn ba việc cho tuần đầu, mọi người sẽ chọn gì? Mình sợ đưa quá nhiều tài liệu khiến bạn mới thấy quá tải.", "Mình ưu tiên hiểu quy trình, biết người hỗ trợ và thực hành một tình huống đơn giản.", "Bạn mới có người đồng hành sẽ đỡ ngại hỏi hơn là chỉ nhận một tập tài liệu.", "Theo mình nên hỏi lại cuối ngày xem bạn ấy còn vướng bước nào."],
  ["Có ai cùng luyện cách lắng nghe không?", "Mình nhận ra đôi khi mình nghĩ câu trả lời khi khách còn đang nói. Muốn luyện thói quen nghe hết rồi mới phản hồi, mọi người có bài tập nào không?", "Mình tập nhắc lại ý chính và hỏi xem mình hiểu đúng chưa.", "Luyện theo cặp rất hữu ích: một người kể chuyện trong hai phút, người còn lại chỉ nghe.", "Mình ghi một từ khóa thay vì chen vào. Đợi khách nói xong mới hỏi tiếp."],
  ["Chia mục tiêu tháng thành kế hoạch tuần", "Nhìn mục tiêu cả tháng mình hơi áp lực. Mình muốn chuyển thành những việc cụ thể có thể theo dõi mỗi tuần. Mọi người thường chia như thế nào?", "Mình bắt đầu từ số buổi có thể làm việc thực tế, rồi chia lịch liên hệ và cuộc hẹn.", "Nên có khoảng dự phòng cho tuần bận việc gia đình, đừng chia đều máy móc.", "Mình nhìn cả chất lượng trao đổi chứ không chỉ đếm số hoạt động."],
  ["Nhắc lịch hẹn trước bao lâu thì hợp lý?", "Mình thường nhắn xác nhận trước một ngày và nhắc nhẹ trước giờ gặp. Có khi khách thấy hơi nhiều tin nhắn. Các bạn đang làm thế nào?", "Mình hỏi khách thích nhận xác nhận qua kênh nào ngay lúc chốt lịch.", "Nếu đã xác nhận buổi sáng thì mình không nhắn lại nhiều lần trong ngày.", "Tin nhắn nên có giờ, địa điểm và cách báo nếu cần đổi lịch."],
  ["Cách giữ nhịp làm việc khi một tuần chưa thuận lợi", "Tuần này mình có vài cuộc hẹn chưa đi tới đâu nên hơi xuống tinh thần. Mình muốn nghe những cách nhỏ giúp mọi người lấy lại nhịp làm việc.", "Mình xem lại việc nào mình kiểm soát được và chọn một việc nhỏ để hoàn thành trước.", "Mình trao đổi với người đồng hành để có thêm góc nhìn, tránh tự nghĩ mãi một mình.", "Nghỉ một buổi đúng nghĩa cũng giúp mình quay lại tập trung hơn."],
  ["Tài liệu nhóm đang nằm rải rác, sắp lại từ đâu?", "Nhóm có nhiều phiên bản tài liệu trong các đoạn chat. Mình muốn gom về một chỗ để bạn mới tìm dễ hơn. Mọi người đặt tên và phân thư mục thế nào?", "Mình chia theo công việc, có thư mục tài liệu đang dùng và phần lưu bản cũ.", "Tên tệp có ngày cập nhật và người phụ trách. Tài liệu hết hiệu lực cần đánh dấu rõ.", "Một trang mục lục có link trực tiếp sẽ dễ dùng trên điện thoại hơn."],
  ["Chuẩn bị trước hội nghị khách hàng: hay sót việc gì?", "Mình đang lên danh sách chuẩn bị cho một buổi gặp mặt nhỏ. Ngoài xác nhận khách và kiểm tra địa điểm, mọi người thường kiểm tra thêm những gì?", "Nhớ kiểm tra âm thanh và đường đi trước, đặc biệt nếu có khách lớn tuổi.", "Mình phân công rõ người đón khách và người hỗ trợ các câu hỏi sau buổi gặp.", "Nên có phương án liên hệ khi khách đến muộn hoặc không tìm được địa điểm."],
  ["Mỗi ngày dành bao lâu để học lại kiến thức?", "Mình muốn duy trì việc học nhưng nếu đặt một tiếng mỗi ngày thì khó theo lâu. Ai đang có lịch học ngắn mà hiệu quả chia sẻ giúp mình với.", "Mình học 15 phút và tự viết lại ba ý bằng lời của mình.", "Mình chọn một câu hỏi thực tế trong tuần rồi tra tài liệu chính thức liên quan.", "Nhóm mình có buổi chia sẻ 20 phút, mỗi lần chỉ tập trung một nội dung."],
  ["Nhờ góp ý một cách giới thiệu bản thân ngắn gọn", "Mình đang tập giới thiệu trong khoảng 30 giây: mình là ai, có thể hỗ trợ gì và mong muốn hiểu nhu cầu của người đối diện. Nên bỏ bớt phần nào cho tự nhiên?", "Mình nghĩ nên bắt đầu bằng tên và lý do cuộc gặp, tránh kể quá nhiều thành tích.", "Câu cuối có thể là một lời mời khách chia sẻ mong muốn của họ.", "Bạn thử nói thành tiếng rồi bấm giờ, câu nào thấy khó nói thì rút ngắn."],
  ["Sau buổi tư vấn, theo dõi thế nào để không làm phiền?", "Mình muốn chủ động hỗ trợ nhưng không muốn khách cảm thấy bị thúc giục. Mọi người có thống nhất lịch liên hệ tiếp ngay trong cuộc gặp không?", "Mình hỏi rõ khi nào tiện để trao đổi tiếp và ghi lại đúng ngày đã thống nhất.", "Mỗi lần liên hệ nên giải quyết một điều khách còn cần, tránh chỉ hỏi đã quyết định chưa.", "Nếu khách muốn tạm dừng thì mình tôn trọng và để họ chủ động liên hệ lại."],
  ["Một thay đổi nhỏ giúp làm việc trên điện thoại tiện hơn", "Dạo này mình hay xử lý công việc khi di chuyển. Mọi người có mẹo nào để tìm lịch, tài liệu và ghi chú nhanh hơn mà không mở quá nhiều ứng dụng?", "Mình ghim thư mục hay dùng và để lịch công việc ở màn hình chính.", "Mình đặt tên ghi chú theo ngày và nội dung, tìm lại nhanh hơn nhiều.", "Mình tải sẵn tài liệu cần dùng trước khi đến chỗ mạng yếu."],
  ["Cuối ngày nên tổng kết những gì?", "Mình thử dành 10 phút trước khi kết thúc ngày làm việc để nhìn lại. Nếu chỉ ghi ba dòng, mọi người sẽ ghi những gì?", "Một việc đã xong, một việc còn vướng và một việc ưu tiên cho ngày mai.", "Mình thêm các lời hẹn cần giữ để tránh bỏ sót việc đã nhận với người khác.", "Mình ghi cả điều đã học được. Những tuần bận đọc lại rất có ích."],
  ["Khi khách hỏi điều mình chưa chắc, trả lời ra sao?", "Mình nghĩ thừa nhận cần kiểm tra lại sẽ tốt hơn trả lời vội. Mọi người dùng cách diễn đạt nào để vẫn giữ được sự tin tưởng?", "Mình nói phần này mình xin kiểm tra đúng tài liệu rồi phản hồi lại vào giờ cụ thể.", "Sau đó phải phản hồi đúng hẹn, kể cả lúc chưa có đủ thông tin cuối cùng.", "Mình lưu lại nguồn chính thức để khách có thể cùng kiểm tra."],
  ["Thực hành theo cặp: góp ý sao cho dễ tiếp thu?", "Nhóm mình sắp có buổi luyện tình huống. Mình muốn phần góp ý cụ thể và tích cực, tránh khiến bạn mới mất tự tin. Có khung góp ý nào đơn giản không?", "Mình nói một điểm làm tốt rồi chọn đúng một điểm để luyện lại.", "Nên nhắc hành vi cụ thể thay vì nhận xét chung là bạn chưa tự tin.", "Cho người thực hành tự nhận xét trước, thường họ cũng thấy chỗ cần sửa."],
  ["Làm việc cùng đồng nghiệp: bàn giao cần ghi gì?", "Có những việc hai người cùng hỗ trợ nên đôi lúc thông tin bị lệch nhau. Mọi người dùng mẫu bàn giao nào để rõ mà không dài dòng?", "Mình ghi việc đang ở bước nào, ai phụ trách tiếp và thời điểm cần cập nhật.", "Cần tách thông tin đã xác nhận khỏi phần đang chờ kiểm tra.", "Nếu có thay đổi lớn mình gọi trao đổi nhanh rồi cập nhật lại bằng chữ."],
  ["Lịch kín nhưng vẫn thấy chưa hiệu quả", "Mình có tuần rất bận nhưng cuối tuần nhìn lại chưa hoàn thành việc quan trọng. Có lẽ mình nhận nhiều việc nhỏ quá. Mọi người từng gặp chưa?", "Mình từng như vậy. Bây giờ mình dành sẵn một khung giờ cho việc quan trọng nhất.", "Mình thử ghi lại thời gian thực tế trong ba ngày để biết bị phân tán ở đâu.", "Nên rà xem có việc nào có thể gom làm cùng lúc hoặc nhờ hỗ trợ."],
  ["Một cuộc hẹn tốt có nhất thiết phải có kết quả ngay?", "Có cuộc gặp khách chia sẻ được nhiều nhu cầu nhưng chưa muốn quyết định. Theo mọi người nên đánh giá chất lượng buổi gặp dựa trên điều gì?", "Mình xem khách đã hiểu rõ hơn và các câu hỏi đã được trả lời đúng chưa.", "Nếu hai bên thống nhất được bước tiếp theo thì buổi gặp vẫn có giá trị.", "Mình không ép kết quả ngay nếu khách còn cần thời gian cân nhắc."],
  ["Gợi ý hoạt động chia sẻ kinh nghiệm cuối tuần", "Mình muốn buổi sinh hoạt nhóm bớt giống báo cáo. Đang nghĩ mỗi người kể một việc làm được và một điều muốn xin góp ý. Mọi người có cách tổ chức nào hay?", "Nhóm mình chọn một tình huống và cùng phân tích các hướng xử lý.", "Nên giới hạn thời gian chia sẻ để ai cũng có cơ hội nói.", "Có thể luân phiên người điều phối, bạn mới cũng được thử ở phần ngắn."],
  ["Cách sắp xếp tài liệu trước một cuộc gặp trực tiếp", "Mình hay mang nhiều tài liệu rồi mất thời gian tìm đúng trang. Đang muốn chuẩn bị gọn hơn theo nhu cầu của từng cuộc gặp. Mọi người làm sao?", "Mình chỉ chọn tài liệu phù hợp với nội dung đã hẹn, phần tham khảo khác để riêng.", "Mình đánh dấu trang cần giải thích nhưng luôn giữ đầy đủ tài liệu chính thức.", "Bản trên điện thoại nên có tên dễ tìm và mở thử trước để tránh lỗi mạng."],
  ["Thử thách nhỏ tuần tới: giữ một thói quen mới", "Mình chọn xác nhận lịch ngày mai trước khi kết thúc công việc hôm nay. Ai muốn thử cùng một thói quen nhỏ trong một tuần không? Cuối tuần quay lại chia sẻ kết quả nhé.", "Mình tham gia, chọn ghi chú ngay sau mỗi cuộc gặp thay vì để cuối ngày.", "Mình sẽ dành 15 phút buổi sáng cho việc quan trọng trước khi đọc các nhóm chat.", "Mình chọn dọn lại danh sách việc cần làm mỗi tối. Hy vọng tuần này duy trì được."],
];

async function main() {
  assert.ok(process.argv.includes("--replace-all"), "Use --replace-all to replace current discussions.");
  assert.equal(discussions.length, 25);
  const db = getSupabaseAdmin();
  async function all(table: string, optional = false) {
    const rows: any[] = [];
    for (let offset = 0; ; offset += 500) {
      let query = db.from(table).select("*").order(table === "forum_comment_reactions" ? "comment_id" : "id");
      if (table === "forum_comment_reactions") query = query.order("author_code");
      const { data, error } = await query.range(offset, offset + 499);
      if (error) { if (optional && ["42P01", "PGRST205"].includes(error.code)) return []; throw error; }
      rows.push(...(data || []));
      if (!data || data.length < 500) return rows;
    }
  }
  const resumeAt = process.argv.indexOf("--resume");
  if (resumeAt >= 0) {
    const directory = process.argv[resumeAt + 1];
    assert.match(directory, /^outputs\/forum\/replace-25-\d+$/);
    const backup = JSON.parse(await readFile(`${directory}/backup.json`, "utf8"));
    const samples = JSON.parse(await readFile(`${directory}/samples.json`, "utf8"));
    await finish(directory, backup.topics, samples.topics, samples.comments, samples.reactions);
    return;
  }
  const oldTopics = await all("forum_topics");
  const oldComments = await all("forum_comments");
  const oldReactions = await all("forum_comment_reactions");
  const oldNotifications = await all("forum_notifications", true);
  const directory = `outputs/forum/replace-25-${Date.now()}`;
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/backup.json`, JSON.stringify({ topics: oldTopics, comments: oldComments, reactions: oldReactions, notifications: oldNotifications }, null, 2));
  console.log(JSON.stringify({ existingTopics: oldTopics.length, existingComments: oldComments.length, backup: directory }));
  const codes = Object.keys(forumDemoProfiles).filter(code => code !== "FORUM_DEMO_EDITOR");
  const pick = <T,>(items: T[]) => items[randomInt(items.length)];
  const topics: any[] = [], comments: any[] = [], reactions: any[] = [];
  const now = Date.now();
  for (const [index, [title, question, ...answers]] of discussions.entries()) {
    const id = randomUUID(), author = pick(codes);
    const start = now - (26 - index) * 11 * 3600000 - randomInt(180) * 60000;
    const date = (step: number) => new Date(start + step * 60000).toISOString();
    topics.push({ id, author_code: author, anonymous: false, title, content: question, attachments: [], created_at: date(0), last_activity_at: date(0) });
    let minute = randomInt(8, 45);
    const local: any[] = [];
    for (const [a, answer] of answers.entries()) {
      const member = codes[(index + a + 1) % codes.length];
      const root = { id: randomUUID(), topic_id: id, parent_id: null, author_code: member, anonymous: randomInt(6) === 0, content: answer, attachments: [], created_at: date(minute) };
      local.push(root); minute += randomInt(13, 85);
      if (randomInt(4) !== 0) {
        local.push({ id: randomUUID(), topic_id: id, parent_id: root.id, author_code: author, anonymous: false,
          content: pick([`Cảm ơn bạn. Mình sẽ thử cách này trong tuần tới rồi quay lại chia sẻ kết quả.`, `Ý này hợp với điều mình đang vướng. Bạn thường duy trì việc đó hằng ngày hay chỉ khi cần?`, `Mình cũng từng thử nhưng chưa làm đều. Đọc chia sẻ của bạn thấy cần bắt đầu từ bước nhỏ hơn.`, `Mình ghi lại ý này nhé. Có lẽ nên thử trong vài ngày rồi điều chỉnh theo lịch thực tế.`]), attachments: [], created_at: date(minute) });
        minute += randomInt(5, 30);
      }
    }
    if (index % 3 === 0) local.push({ id: randomUUID(), topic_id: id, parent_id: null, author_code: codes[(index + 4) % codes.length], anonymous: false,
      content: pick(["Mình lưu lại chủ đề để cuối tuần đọc kỹ hơn. Cảm ơn mọi người đã chia sẻ cách làm cụ thể.", "Mình mới bắt đầu nên những ví dụ ngắn như thế này dễ áp dụng hơn nhiều.", "Mình nghĩ không cần áp dụng hết cùng lúc, chọn một cách phù hợp rồi theo dõi kết quả trước."]), sticker: index % 2 ? "👏" : null, attachments: [], created_at: date(minute) });
    comments.push(...local);
    for (const comment of local) {
      const voters = codes.filter(code => code !== comment.author_code).sort(() => randomInt(3) - 1).slice(0, randomInt(5));
      for (const voter of voters) reactions.push({ comment_id: comment.id, author_code: voter, reaction: randomInt(16) === 0 ? "dislike" : "like" });
    }
  }
  await writeFile(`${directory}/samples.json`, JSON.stringify({ topics, comments, reactions }, null, 2));
  // Prepare and verify the entire replacement before removing the old data.
  const insert = async (table: string, rows: any[]) => {
    if (!rows.length) return;
    const { error } = await db.from(table).insert(rows); if (error) throw error;
  };
  await insert("forum_topics", topics);
  for (const topic of topics) await insert("forum_comments", comments.filter(row => row.topic_id === topic.id));
  await insert("forum_comment_reactions", reactions);
  await finish(directory, oldTopics, topics, comments, reactions);

  async function finish(directory: string, oldTopics: any[], topics: any[], comments: any[], reactions: any[]) {
  const createdIds = topics.map(row => row.id);
  const { data: saved, error: verifyError } = await db.from("forum_topics").select("id,comment_count,last_activity_at").in("id", createdIds);
  if (verifyError) throw verifyError;
  assert.equal(saved?.length, 25);
  for (const topic of saved!) {
    const expected = comments.filter(row => row.topic_id === topic.id);
    assert.equal(topic.comment_count, expected.length);
    assert.equal(new Date(topic.last_activity_at).toISOString(), expected.map(row => row.created_at).sort().at(-1));
  }
  for (let i = 0; i < oldTopics.length; i += 100) {
    const ids = oldTopics.slice(i, i + 100).map(row => row.id);
    const removedComments = await db.from("forum_comments").delete().in("topic_id", ids);
    if (removedComments.error) throw removedComments.error;
    const removedTopics = await db.from("forum_topics").delete().in("id", ids);
    if (removedTopics.error) throw removedTopics.error;
  }
  const finalTopics = await all("forum_topics");
  const finalComments = await all("forum_comments");
  const finalReactions = await all("forum_comment_reactions");
  assert.equal(finalTopics.length, 25);
  assert.equal(finalComments.length, comments.length);
  assert.equal(finalReactions.length, reactions.length);
  assert.ok(finalTopics.every(row => createdIds.includes(row.id)));
  const summary = { topics: 25, comments: comments.length, replies: comments.filter(row => row.parent_id).length, reactions: reactions.length, deletedTopics: oldTopics.length, backup: directory, syntheticIdentities: true };
  await writeFile(`${directory}/summary.json`, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
