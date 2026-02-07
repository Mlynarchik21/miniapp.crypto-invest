function verifyTelegramInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false as const, reason: "no_hash" };

  params.delete("hash");

  const dataCheckArr: string[] = [];
  params.forEach((value, key) => {
    dataCheckArr.push(`${key}=${value}`);
  });

  dataCheckArr.sort();
  const dataCheckString = dataCheckArr.join("\n");

  // ✅ ПРАВИЛЬНЫЙ secret_key
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const hmac = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (hmac !== hash) {
    return { ok: false as const, reason: "bad_hash" };
  }

  const user = JSON.parse(params.get("user") || "{}");

  return { ok: true as const, user };
}
