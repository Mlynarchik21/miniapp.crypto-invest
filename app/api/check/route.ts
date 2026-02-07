import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

function verifyTelegramInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false as const, reason: "no_hash" };

  params.delete("hash");

  const pairs: string[] = [];
  params.forEach((value, key) => pairs.push(`${key}=${value}`));
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

  return {
    ok: true as const,
    user: {
      id: Number(user.id),
      username: user.username ?? null,
      first_name: user.first_name ?? null,
      last_name: user.last_name ?? null
    }
  };
}

async function getChatMemberStatus(botToken: string, channelId: string, userId: number) {
  const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(
    channelId
  )}&user_id=${userId}`;

  const r = await fetch(url, { cache: "no-store" });
  const j = await r.json();

  if (!j?.ok) return { ok: false as const, reason: j?.description ?? "tg_error" };
  return { ok: true as const, status: String(j.result?.status ?? "") };
}

function isSubscribed(status: string) {
  return status === "member" || status === "administrator" || status === "creator";
}

// Заглушка: тут потом подключим БД/бота, сейчас просто возвращаем результат
function saveUserToLog(user: any) {
  console.log("USER_SAVE:", user);
}

export async function POST(req: Request) {
  try {
    const botToken = process.env.BOT_TOKEN;
    const channelId = process.env.CHANNEL_ID;

    if (!botToken || !channelId) {
      return NextResponse.json({ ok: false, error: "env_missing" }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    const initData = body?.initData as string | undefined;
    const source = (body?.source as string | undefined) ?? null;

    if (!initData) {
      return NextResponse.json({ ok: false, error: "no_initdata" }, { status: 400 });
    }

    const verified = verifyTelegramInitData(initData, botToken);
    if (!verified.ok) {
      return NextResponse.json({ ok: false, error: "bad_initdata", reason: verified.reason }, { status: 401 });
    }

    const userId = verified.user.id;

    const cm = await getChatMemberStatus(botToken, channelId, userId);
    if (!cm.ok) {
      return NextResponse.json({ ok: false, error: "getChatMember_failed", reason: cm.reason }, { status: 502 });
    }

    const subscribed = isSubscribed(cm.status);

    saveUserToLog({
      user_id: userId,
      subscribed,
      status: cm.status,
      username: verified.user.username,
      first_name: verified.user.first_name,
      last_name: verified.user.last_name,
      source
    });

    return NextResponse.json({
      ok: true,
      user_id: userId,
      subscribed,
      status: cm.status
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
