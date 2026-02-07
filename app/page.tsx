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

  // ✅ НОВАЯ ссылка канала
  const channelLink = useMemo(
    () => "https://t.me/+UY4Pyf9PFpxjNWU6",
    []
  );

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

    if (j.subscribed)
      setView({ stage: "app", userId: j.user_id });
    else setView({ stage: "gate" });
  }

  useEffect(() => {
    const w = tg();
    w?.ready?.();
    w?.expand?.();
    check();
  }, []);

  // ===== UI =====

  const Shell = ({ children }: any) => (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        background: "#0B0F1A",
        color: "#fff",
        fontFamily: "system-ui"
      }}
    >
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        {children}
      </div>
    </div>
  );

  const Card = ({ children }: any) => (
    <div
      style={{
        borderRadius: 18,
        padding: 16,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)"
      }}
    >
      {children}
    </div>
  );

  const Btn = ({ children, onClick }: any) => (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: 12,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,.2)",
        background: "rgba(255,255,255,.08)",
        color: "#fff",
        cursor: "pointer"
      }}
    >
      {children}
    </button>
  );

  if (view.stage === "loading") {
    return (
      <Shell>
        <Card>
          Загрузка…
        </Card>
      </Shell>
    );
  }

  if (view.stage === "gate") {
    return (
      <Shell>
        <Card>
          <h3>Доступ закрыт</h3>

          <p>
            Подпишись на канал и нажми
            «Проверить».
          </p>

          <a
            href={channelLink}
            style={{ textDecoration: "none" }}
          >
            <Btn>Подписаться</Btn>
          </a>

          <div style={{ height: 10 }} />

          <Btn onClick={check}>
            Проверить подписку
          </Btn>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <Card>
        <h3>Доступ открыт ✅</h3>

        <p>ID: {view.userId}</p>

        <Btn onClick={check}>
          Перепроверить
        </Btn>
      </Card>
    </Shell>
  );
}
