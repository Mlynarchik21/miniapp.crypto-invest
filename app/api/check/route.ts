import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

function verifyTelegramInitData(
  initData: string,
  botToken: string
) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false };

  params.delete("hash");

  const pairs: string[] = [];
  params.forEach((v, k) =>
    pairs.push(`${k}=${v}`)
  );

  pairs.sort();
  const dataCheckString =
    pairs.join("\n");

  const secretKey = crypto
    .createHash("sha256")
    .update(botToken)
    .digest();

  const hmac = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (hmac !== hash)
    return { ok: false };

  const user = JSON.parse(
    params.get("user") || "{}"
  );

  return {
    ok: true,
    user
  };
}

async function getStatus(
  botToken: string,
  channelId: string,
  userId: number
) {
  const url =
    `https://api.telegram.org/bot${botToken}` +
    `/getChatMember?chat_id=${channelId}` +
    `&user_id=${userId}`;

  const r = await fetch(url);
  const j = await r.json();

  if (!j.ok) return null;

  return j.result.status;
}

function isSub(status: string) {
  return [
    "member",
    "administrator",
    "creator"
  ].includes(status);
}

export async function POST(req: Request) {
  const botToken =
    process.env.BOT_TOKEN!;
  const channelId =
    process.env.CHANNEL_ID!;

  const { initData } =
    await req.json();

  const v =
    verifyTelegramInitData(
      initData,
      botToken
    );

  if (!v.ok)
    return NextResponse.json({
      ok: false
    });

  const status =
    await getStatus(
      botToken,
      channelId,
      v.user.id
    );

  const subscribed =
    isSub(status);

  return NextResponse.json({
    ok: true,
    user_id: v.user.id,
    subscribed
  });
}
