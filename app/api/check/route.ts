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

function isSubscribed(status: string) {
  return status === "member" || status === "administrator" || status === "creator";
}

async function getChatMemberStatus(botToken: string, channelId: string, userId: number) {
  const url =
    `https://api.telegram.org/bot${botToken}/getChatMember` +
    `?chat_id=${encodeURIComponent(channelId)}` +
    `&user_id=${encodeURIComponent(String(userId))}`;

  const r = await fetch(url, { cache: "no-store" });
  const j = await r.json().catch(() => null);

  if (!j?.ok) {
    return { ok: false as const, description: j?.description ?? "unknown_error" };
  }

  return { ok: true as const, status: String(j.result?.status ?? "") };
}

export async function POST(req: Request) {
  try {
    const botToken = process.env.BOT_TOKEN;
    const channelId = process.env.CHANNEL_ID;

    if (!botToken || !channelId) {
      return NextResponse.json(
        { ok: false, step: "env", error: "env_missing", need: ["BOT_TOKEN", "CHANNEL_ID"] },
        { status: 200 }
      );
    }

    const body = await req.json().catch(() => null);
    const initData = body?.initData as string | undefined;

    if (!initData) {
      return NextResponse.json({ ok: false, step: "input", error: "no_initdata" }, { status: 200 });
    }

    const v = verifyTelegramInitData(initData, botToken);
    if (!v.ok) {
      return NextResponse.json(
        { ok: false, step: "verify_initdata", error: v.reason },
        { status: 200 }
      );
    }

    const userId = Number(v.user.id);

    const cm = await getChatMemberStatus(botToken, channelId, userId);
    if (!cm.ok) {
      return NextResponse.json(
        { ok: false, step: "getChatMember", error: cm.description, user_id: userId, channelId },
        { status: 200 }
      );
    }

    const subscribed = isSubscribed(cm.status);

    return NextResponse.json(
      {
        ok: true,
        step: "done",
        user_id: userId,
        status: cm.status,
        subscribed
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, step: "catch", error: String(e?.message ?? e) },
      { status: 200 }
    );
  }
}
