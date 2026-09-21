import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "amc_location";
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.lat !== "number" ||
    typeof body.lng !== "number" ||
    typeof body.label !== "string"
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  // Next's cookie serializer already percent-encodes the value it's given —
  // encoding it here too would double-encode it and break the client's decode.
  response.cookies.set(COOKIE_NAME, JSON.stringify({ lat: body.lat, lng: body.lng, label: body.label }), {
    maxAge: MAX_AGE,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
