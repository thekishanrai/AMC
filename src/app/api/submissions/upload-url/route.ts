import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { UPLOAD_FORMS, uploadProblem } from "@/lib/uploads";

export const runtime = "nodejs";

// Files never pass through this function (Vercel caps bodies at 4.5 MB).
// It validates the request and hands back a one-time signed upload URL; the
// browser then uploads straight to Supabase Storage.
export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Uploads are temporarily unavailable." }, { status: 503 });
  const body = await request.json().catch(() => null) as { formType?: string; fileName?: string; type?: string; size?: number } | null;
  const formType = String(body?.formType ?? "");
  if (!(UPLOAD_FORMS as readonly string[]).includes(formType)) return NextResponse.json({ error: "Unknown form." }, { status: 400 });
  const size = Number(body?.size ?? 0), type = String(body?.type ?? "");
  const problem = !size ? "Empty file." : uploadProblem({ size, type });
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  // Rate limit: at most 10 upload URLs per IP per 15 minutes.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipHash = createHash("sha256").update(`${serviceKey}:${ip}`).digest("hex").slice(0, 16);
  const day = new Date().toISOString().slice(0, 10);
  const { data: recent } = await supabase.storage.from("form-attachments").list(`${formType}/${day}`, { search: ipHash, limit: 100 });
  const since = Date.now() - 15 * 60_000;
  if ((recent ?? []).filter((o) => o.created_at && Date.parse(o.created_at) > since).length >= 10) return NextResponse.json({ error: "Too many uploads. Try again in 15 minutes." }, { status: 429 });

  const safeName = String(body?.fileName ?? "file").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80) || "file";
  const path = `${formType}/${day}/${ipHash}-${randomUUID()}-${safeName}`;
  const { data, error } = await supabase.storage.from("form-attachments").createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: "Could not start the upload." }, { status: 500 });
  return NextResponse.json({ path: data.path, token: data.token });
}
