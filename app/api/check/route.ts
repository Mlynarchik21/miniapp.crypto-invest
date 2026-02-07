import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

function verifyTelegramInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false as const, reason: "no_hash" };

  params.delete("hash");

  const pairs: string[] = [];
  params.forEach((v, k) => pairs.push(`${k}=${v}`));
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const hmac = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (hmac !== hash) return { ok: false as const, reason: "bad_hash (BOT_TOKEN mismatch?)" };

  const userStr = params.get("user");
  if (!userStr) return { ok: false as const, reason: "no_user" };

  const user = JSON.parse(userStr);
  if (!user?.id) return { ok: false as const, reason: "no_user_id" };

  return { ok: true as const, user };
}

function isSubscribed(status: string) {
  return status === "member" || status === "administrator" || status === "creator";
}

export async function POST(req: Request) {
  try {
    const botToken = process.env.BOT_TOKEN;
    const channelId = process.env.CHANNEL_ID;

    if (!botToken || !channelId) {
      return NextResponse.json({ ok: false, step: "env", error: "env_missing" });
    }

    const body = await req.json().catch(() => null);
    const initData = body?.initData as string | undefined;

    if (!initData) {
      return NextResponse.json({ ok: false, step: "input", error: "no_initdata" });
    }

    const v = verifyTelegramInitData(initData, botToken);
    if (!v.ok) {
      return NextResponse.json({ ok: false, step: "verify_initdata", error: v.reason });
    }

    const userId = Number(v.user.id);

    const url =
      `https://api.telegram.org/bot${botToken}/getChatMember` +
      `?chat_id=${encodeURIComponent(channelId)}` +
      `&user_id=${encodeURIComponent(String(userId))}`;

    const r = await fetch(url, { cache: "no-store" });
    const j = await r.json().catch(() => null);

    if (!j?.ok) {
      return NextResponse.json({
        ok: false,
        step: "getChatMember",
        description: j?.description ?? "unknown",
        channelId,
        userId
      });
    }

    const status = String(j.result?.status ?? "");
    return NextResponse.json({
      ok: true,
      step: "done",
      user_id: userId,
      status,
      subscribed: isSubscribed(status),
      channelId
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, step: "catch", error: String(e?.message ?? e) });
  }
}
