import { dataResponse, routeResponse } from "@/lib/server/http";
import { getNovelOperations } from "@/lib/server/runtime";
import { DomainError } from "@/lib/server/errors";

export async function GET(request: Request) {
  return routeResponse(async () => {
    const parameters = new URL(request.url).searchParams;
    const todayStart = parameters.get("todayStart") ?? undefined;
    const todayEnd = parameters.get("todayEnd") ?? undefined;
    const valid = (value: string | undefined) => (
      !value || Number.isFinite(Date.parse(value))
    );
    if (!valid(todayStart) || !valid(todayEnd) || Boolean(todayStart) !== Boolean(todayEnd)) {
      throw new DomainError("VALIDATION_ERROR", "今日统计时间范围无效");
    }
    if (todayStart && todayEnd && todayStart >= todayEnd) {
      throw new DomainError("VALIDATION_ERROR", "今日统计结束时间必须晚于开始时间");
    }
    return dataResponse(await getNovelOperations().dashboard(todayStart, todayEnd));
  });
}
