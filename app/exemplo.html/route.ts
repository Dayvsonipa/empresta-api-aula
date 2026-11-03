import { studentTemplate } from "@/lib/student-template";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return new Response(studentTemplate.replaceAll("__API_ORIGIN__", origin), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
