import {
  dataResponse,
  readObject,
  routeResponse,
} from "@/lib/server/http";
import { getNovelOperations } from "@/lib/server/runtime";

export async function GET() {
  return routeResponse(async () => dataResponse(await getNovelOperations().listProjects()));
}

export async function POST(request: Request) {
  return routeResponse(async () =>
    dataResponse(await getNovelOperations().createProject(await readObject(request)), 201),
  );
}
