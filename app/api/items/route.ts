import {
  dataResponse,
  parseItemFilters,
  readObject,
  routeResponse,
} from "@/lib/server/http";
import { getNovelOperations } from "@/lib/server/runtime";

export async function GET(request: Request) {
  return routeResponse(async () => {
    const filters = parseItemFilters(new URL(request.url));
    return dataResponse(await getNovelOperations().listItems(filters));
  });
}

export async function POST(request: Request) {
  return routeResponse(async () =>
    dataResponse(await getNovelOperations().createItem(await readObject(request)), 201),
  );
}
