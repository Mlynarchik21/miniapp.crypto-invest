import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const initData = body?.initData as string | undefined;

  if (!initData) {
    return NextResponse.json({ ok: false, error: "no_initData" }, { status: 200 });
  }

  const params = new URLSearchParams(initData);
  const keys: string[] = [];
  params.forEach((_, k) => keys.push(k));

  return NextResponse.json(
    {
      ok: true,
      initData_len: initData.length,
      keys: keys.sort(),
      has_hash: params.has("hash"),
      has_user: params.has("user")
    },
    { status: 200 }
  );
}
