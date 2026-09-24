import { dataResponse, routeResponse } from "@/lib/server/http";
import { getNovelOperations } from "@/lib/server/runtime";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_: Request, { params }: RouteContext) {
  return routeResponse(async () => {
    const { id } = await params;
    return dataResponse(await getNovelOperations().deleteRelation(id));
  });
}
