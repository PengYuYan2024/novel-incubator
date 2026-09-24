import {
  dataResponse,
  readObject,
  routeResponse,
} from "@/lib/server/http";
import { getNovelOperations } from "@/lib/server/runtime";
import { DomainError } from "@/lib/server/errors";

export async function GET(request: Request) {
  return routeResponse(async () => {
    const itemId = new URL(request.url).searchParams.get("itemId")?.trim();
    if (!itemId) throw new DomainError("VALIDATION_ERROR", "缺少内容编号");
    return dataResponse(await getNovelOperations().listRelations(itemId));
  });
}

export async function POST(request: Request) {
  return routeResponse(async () =>
    dataResponse(await getNovelOperations().createRelation(await readObject(request)), 201),
  );
}
