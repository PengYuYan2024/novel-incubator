import { dataResponse, routeResponse } from "@/lib/server/http";
import { getNovelOperations } from "@/lib/server/runtime";

export async function POST(request: Request) {
  return routeResponse(async () => {
    const buffer = await request.arrayBuffer();
    const value = JSON.parse(new TextDecoder().decode(buffer)) as unknown;
    return dataResponse(
      await getNovelOperations().preflightBackup(value, buffer.byteLength),
    );
  });
}
