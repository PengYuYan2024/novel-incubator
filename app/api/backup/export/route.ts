import { dataResponse, routeResponse } from "@/lib/server/http";
import { getNovelOperations } from "@/lib/server/runtime";

export async function GET() {
  return routeResponse(async () => dataResponse(await getNovelOperations().exportBackup()));
}
