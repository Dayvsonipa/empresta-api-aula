import { handleRequest } from "@/lib/api";
import { getQuery } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
async function handler(request: Request) {
  return handleRequest(request, getQuery);
}
export {
  handler as GET,
  handler as POST,
  handler as PATCH,
  handler as DELETE,
  handler as OPTIONS,
  handler as PUT,
};
