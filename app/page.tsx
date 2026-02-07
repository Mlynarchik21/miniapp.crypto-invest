"use client";

import { useEffect, useMemo, useState } from "react";

type View =
  | { stage: "loading"; msg?: string }
  | { stage: "gate" }
  | { stage: "app"; userId: number };

function tg() {
  // @ts-ignore
  return typeof window !== "undefined" ? window.Telegram?.WebApp : null;
}

function getInitData() {
  return tg()?.initData || null;
}

function getStartAppSource() {
  // @ts-ignore
  const startParam = tg()?.initDataUnsafe?.start_param;
  return startParam ? String(startParam) : null;
}

export default function Page() {
  const [view, setView] = useState<View>({ stage: "loading" });

  // ✅ ТВОЯ приватная ссылка на канал
  const channelLink = useMemo(() => "https://t.me/+9Et87naJaKJmNDM6", []);

  async function check() {
    setView({ stage: "loading", msg: "Проверяем подписку…" });

    const initData = getInitData();
    const source = getStartAppSource();

    if (!initData) {
      setView({ stage: "gate" });
      return;
    }

    const r = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData, source })
    });

    const j = await r.json().catch(() => null);

    if (!j?.ok) {
      setView({ stage: "gate" });
      return;
    }

    if (j.subscribed) setView({ stage: "app", userId: j.user_id });
    else setView({ stage: "gate" });
  }

  useEffect(() => {
    const w = tg();
    w?.ready?.();
    w?.expand?.();
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        color: "rgba(255,255,255,0.92)",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        background: "#0B0F1A"
      }}
    >
      <div style={{ maxWidth: 520, margin: "0 auto", paddingTop: 10 }}>{children}</div>
    </div>
  );

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div
      style={{
        borderRadius: 18,
        padding: 16,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)"
      }}
    >
      {children}
    </div>
  );

  const Button = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "12px 14px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.92)",
        cursor: "pointer",
        fontSize: 15
      }}
    >
      {children}
    </button>
  );

  const Primary = ({ children }: { children: React.ReactNode }) => (
    <button
      style={{
        width: "100%",
        padding: "12px 14px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.16)",
        background: "linear-gradient(135deg, rgba(80,130,255,0.55), rgba(70,255,190,0.30))",
        color: "rgba(255,255,255,0.95)",
        cursor: "pointer",
        fontSize: 15
      }}
    >
      {children}
    </button>
  );

  if (view.stage === "loading") {
    return (
      <Shell>
        <div style={{ marginTop: 10, marginBottom: 12, opacity: 0.9 }}>
          <div style={{ fontSize: 18, fontWeight: 650 }}>CryptoInvest</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>Mini App</div>
        </div>

        <Card>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Загрузка</div>
          <div style={{ marginTop: 8, opacity: 0.75, lineHeight: 1.45 }}>
            {view.msg ?? "Подготавливаем приложение…"}
          </div>
        </Card>
      </Shell>
    );
  }

  if (view.stage === "gate") {
    return (
      <Shell>
        <div style={{ marginTop: 10, marginBottom: 12, opacity: 0.9 }}>
          <div style={{ fontSize: 18, fontWeight: 650 }}>CryptoInvest</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>Access</div>
        </div>

        <Card>
          <div style={{ fontSize: 17, fontWeight: 650 }}>Доступ закрыт</div>
          <div style={{ marginTop: 8, opacity: 0.75, lineHeight: 1.45 }}>
            Для доступа подпишись на канал и нажми «Проверить подписку».
          </div>

          <div style={{ height: 14 }} />

          <a href={channelLink} style={{ textDecoration: "none" }}>
            <Primary>Подписаться на канал</Primary>
          </a>

          <div style={{ height: 10 }} />

          <Button onClick={check}>Проверить подписку</Button>

          <div style={{ height: 12 }} />
          <div style={{ fontSize: 12, opacity: 0.55, lineHeight: 1.45 }}>
            Если только что подписался — подожди 2–5 секунд и нажми «Проверить» ещё раз.
          </div>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ marginTop: 10, marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 650 }}>CryptoInvest</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>Main</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.6 }}>ID: {view.userId}</div>
      </div>

      <Card>
        <div style={{ fontSize: 17, fontWeight: 650 }}>Открыто ✅</div>
        <div style={{ marginTop: 8, opacity: 0.75, lineHeight: 1.45 }}>
          Доступ подтверждён. Это основной экран приложения.
        </div>

        <div style={{ height: 14 }} />

        <Button onClick={check}>Перепроверить подписку</Button>

        <div style={{ height: 10 }} />

        <Button
          onClick={() => {
            tg()?.close?.();
          }}
        >
          Закрыть
        </Button>
      </Card>
    </Shell>
  );
}
