import {
  dataResponse,
  readObject,
  routeResponse,
} from "@/lib/server/http";
import { getNovelOperations } from "@/lib/server/runtime";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  return routeResponse(async () => {
    const { id } = await params;
    const operations = getNovelOperations();
    const [item, relations] = await Promise.all([
      operations.getItem(id),
      operations.listRelations(id),
    ]);
    return dataResponse({ item, relations });
  });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  return routeResponse(async () => {
    const { id } = await params;
    const body = await readObject(request);
    const expectedUpdatedAt = String(body.expectedUpdatedAt ?? "");
    const { expectedUpdatedAt: _expected, ...input } = body;
    void _expected;
    return dataResponse(
      await getNovelOperations().updateItem(id, input, expectedUpdatedAt),
    );
  });
}

export async function DELETE(_: Request, { params }: RouteContext) {
  return routeResponse(async () => {
    const { id } = await params;
    return dataResponse(await getNovelOperations().deleteItem(id));
  });
}
