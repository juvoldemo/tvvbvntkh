// Keep the deadline active while reading the body as well as waiting for headers.
export async function requestInvitationSettings(init: RequestInit = {}, timeoutMs = 45000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch("/api/admin/invitation-settings", { ...init, signal: controller.signal });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(result?.error || (response.status === 401
        ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        : "Máy chủ chưa xử lý được yêu cầu. Vui lòng thử lại."));
    }
    if (result === null) throw new Error("Máy chủ trả về dữ liệu không hợp lệ. Vui lòng thử lại.");
    return result;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("Máy chủ phản hồi quá lâu. Chưa xác nhận được thay đổi đã lưu; vui lòng thử lại. Nội dung đang chỉnh vẫn được giữ nguyên.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
