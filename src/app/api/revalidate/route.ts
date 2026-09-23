import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

// Call after editing spots or spot_photos so the site shows the change now
// instead of within the hour:
//   curl -X POST https://antimondayclub.com/api/revalidate -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>"
// Reuses the server-only service-role key so no extra secret is needed.
export async function POST(req: Request) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const auth = req.headers.get("authorization") ?? "";
  if (!key || auth !== `Bearer ${key}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  revalidateTag("spots", "max");
  return NextResponse.json({ revalidated: true, at: new Date().toISOString() });
}
