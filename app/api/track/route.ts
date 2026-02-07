import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

function verifyTelegramInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false as const, reason: "no_hash" };

  params.delete("hash");

  const arr: string[] = [];
  params.forEach((v, k) => arr.push(`${k}=${v}`));
  arr.sort();
  const dataCheckString = arr.join("\n");

  // ✅ правильный ключ для Telegram Mini Apps
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const hmac = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (hmac !== hash) return { ok: false as const, reason: "bad_hash" };

  const userStr = params.get("user");
  if (!userStr) return { ok: false as const, reason: "no_user" };

  let user: any;
  try {
    user = JSON.parse(userStr);
  } catch {
    return { ok: false as const, reason: "bad_user_json" };
  }

  if (!user?.id) return { ok: false as const, reason: "no_user_id" };

  return { ok: true as const, user };
}

async function upsertUser(
  user: { id: number; username?: string | null },
  action: "open" | "subscribe_click"
) {
  const supaUrl = process.env.SUPABASE_URL!;
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const now = new Date().toISOString();

  const payload: any = {
    user_id: Number(user.id),
    username: user.username ?? null,
    created_at: now // если уже есть — не важно, supabase merge оставит старое/перепишет (нам ок)
  };

  if (action === "open") payload.open_clicked_at = now;
  if (action === "subscribe_click") payload.subscribe_clicked_at = now;

  // merge-duplicates делает upsert по primary key
  const r = await fetch(`${supaUrl}/rest/v1/users?on_conflict=user_id`, {
    method: "POST",
    headers: {
      apikey: supaKey,
      Authorization: `Bearer ${supaKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(payload)
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`supabase_error ${r.status}: ${txt}`);
  }
}

export async function POST(req: Request) {
  try {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) return NextResponse.json({ ok: false, step: "env", error: "BOT_TOKEN missing" });

    const supaUrl = process.env.SUPABASE_URL;
    const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supaUrl || !supaKey) {
      return NextResponse.json({
        ok: false,
        step: "env",
        error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing"
      });
    }

    const body = await req.json().catch(() => null);
    const initData = body?.initData as string | undefined;
    const action = body?.action as "open" | "subscribe_click" | undefined;

    if (!initData) return NextResponse.json({ ok: false, step: "input", error: "no_initdata" });
    if (!action) return NextResponse.json({ ok: false, step: "input", error: "no_action" });

    const v = verifyTelegramInitData(initData, botToken);
    if (!v.ok) return NextResponse.json({ ok: false, step: "verify_initdata", error: v.reason });

    await upsertUser({ id: v.user.id, username: v.user.username }, action);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, step: "catch", error: String(e?.message ?? e) });
  }
}
