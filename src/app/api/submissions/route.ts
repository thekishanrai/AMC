import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const allowedTypes = new Set(["request-location", "share-feedback", "report-bug", "contact"]);
const allowedFileTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime"]);
const formTables = {
  "request-location": { table: "location_requests", required: ["place", "map", "type", "why", "contact"] },
  "share-feedback": { table: "feedback_submissions", required: ["surface", "feeling", "feedback"] },
  "report-bug": { table: "bug_reports", required: ["area", "actual"] },
  contact: { table: "contact_messages", required: ["reason", "name", "contact", "subject", "message"] },
} as const;

function clean(value: FormDataEntryValue) {
  return String(value).trim().slice(0, 5000);
}

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Submissions are temporarily unavailable." }, { status: 503 });

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 6_000_000) return NextResponse.json({ error: "That upload is too large." }, { status: 413 });

  const data = await request.formData();
  if (clean(data.get("website") ?? "")) return NextResponse.json({ ok: true }); // honeypot
  const formType = clean(data.get("form_type") ?? "");
  if (!allowedTypes.has(formType)) return NextResponse.json({ error: "Unknown form." }, { status: 400 });

  const fields: Record<string, string> = {};
  for (const [key, value] of data.entries()) {
    if (key === "form_type" || key === "attachment" || key === "website" || typeof value !== "string") continue;
    fields[key] = clean(value);
  }
  const config = formTables[formType as keyof typeof formTables];
  if (config.required.some((key) => !fields[key])) return NextResponse.json({ error: "Please fill every required field." }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipHash = createHash("sha256").update(`${serviceKey}:${ip}`).digest("hex");
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { count, error: countError } = await supabase.from(config.table).select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since);
  if (countError) return NextResponse.json({ error: "Could not submit right now." }, { status: 500 });
  if ((count ?? 0) >= 5) return NextResponse.json({ error: "Too many messages. Try again in 15 minutes." }, { status: 429 });

  const attachment = data.get("attachment");
  let attachmentInfo: { path?: string; name?: string; type?: string; size?: number } = {};
  if (attachment instanceof File && attachment.size > 0) {
    if (attachment.size > 5_242_880 || !allowedFileTypes.has(attachment.type)) return NextResponse.json({ error: "Use an image or short video under 5 MB." }, { status: 400 });
    const safeName = attachment.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100);
    const path = `${formType}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName}`;
    const bytes = Buffer.from(await attachment.arrayBuffer());
    const { error } = await supabase.storage.from("form-attachments").upload(path, bytes, { contentType: attachment.type, upsert: false });
    if (error) return NextResponse.json({ error: "The attachment could not be uploaded." }, { status: 500 });
    attachmentInfo = { path, name: attachment.name.slice(0, 180), type: attachment.type, size: attachment.size };
  }

  const common = {
    page_path: clean(data.get("page_path") ?? "").slice(0, 500),
    user_agent: (request.headers.get("user-agent") ?? "").slice(0, 500),
    ip_hash: ipHash,
  };
  const attachmentColumns = {
    attachment_path: attachmentInfo.path ?? null,
    attachment_name: attachmentInfo.name ?? null,
    attachment_type: attachmentInfo.type ?? null,
    attachment_size: attachmentInfo.size ?? null,
  };
  const rowByType = {
    "request-location": { place_name: fields.place, map_link_or_area: fields.map, place_type: fields.type, reason: fields.why, contact: fields.contact, ...attachmentColumns, ...common },
    "share-feedback": { surface: fields.surface, feeling: fields.feeling, feedback: fields.feedback, page_link: fields.page || null, contact: fields.contact || null, ...common },
    "report-bug": { broken_area: fields.area, actual_behavior: fields.actual, expected_behavior: fields.expected || null, device_browser: fields.device || null, contact: fields.contact || null, ...attachmentColumns, ...common },
    contact: { reason: fields.reason, sender_name: fields.name, contact: fields.contact, subject: fields.subject, message: fields.message, ...common },
  };
  // The runtime table is validated through the closed formTables map above;
  // casting here avoids Supabase's dynamic-table generic collapsing to one row shape.
  const { error } = await supabase.from(config.table).insert(rowByType[formType as keyof typeof rowByType] as never);
  if (error) return NextResponse.json({ error: "Could not save your message." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
