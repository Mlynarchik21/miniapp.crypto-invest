import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const botToken = process.env.BOT_TOKEN;

  if (!botToken) {
    return NextResponse.json({ ok: false, error: "BOT_TOKEN missing" }, { status: 500 });
  }

  const r = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, { cache: "no-store" });
  const j = await r.json().catch(() => null);

  return NextResponse.json({
    ok: true,
    getMe: j
  });
}
