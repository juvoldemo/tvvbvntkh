import { NextRequest } from "next/server";
import { isAdminRequest } from "./admin-auth";
import { userCodeFromRequest } from "./user-auth";
import { BanDinhSettings } from "./ban-dinh";

export function canViewBanDinh(request: NextRequest, settings: BanDinhSettings) {
  return settings.visible && (!settings.adminOnly || isAdminRequest(request) || userCodeFromRequest(request) === "ADMIN");
}
