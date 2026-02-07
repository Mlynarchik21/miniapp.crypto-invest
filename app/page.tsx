"use client";

import { useEffect, useMemo, useState } from "react";

type Screen = "loading" | "gate" | "verified" | "courses";

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
  const [screen, setScreen] = useState<Screen>("loading");
  const [userId, setUserId] = useState<number | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  // ✅ ссылка на канал
  const channelLink = useMemo(() => "https://t.me/+UY4Pyf9PFpxjNWU6", []);

  async function checkSubscription() {
    setErrorText(null);
    setScreen("loading");

    const initData = getInitData();
    const source = getStartAppSource();

    if (!initData) {
      setErrorText("Открой Mini App через кнопку Open в боте.");
      setScreen("gate");
      return;
    }

    const r = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData, source })
    });

    const j = await r.json().catch(() => null);

    if (!j?.ok) {
      setErrorText("Проверка не прошла. Попробуй ещё раз.");
      setScreen("gate");
      return;
    }

    // ok === true
    setUserId(Number(j.user_id));

    if (j.subscribed) {
      // ✅ показываем "готово" и через 3 секунды открываем курсы
      setScreen("verified");
      setTimeout(() => setScreen("courses"), 3000);
    } else {
      setErrorText("Подписка не найдена. Подпишись и нажми «Проверить».");
      setScreen("gate");
    }
  }

  useEffect(() => {
    const w = tg();
    w?.ready?.();
    w?.expand?.();
    // стартовая попытка проверки
    checkSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== UI компоненты (простые) =====

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
      <div style={{ maxWidth: 560, margin: "0 auto", paddingTop: 10 }}>{children}</div>
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

  const Button = ({
    children,
    onClick,
    kind = "default"
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    kind?: "default" | "primary";
  }) => (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "12px 14px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.14)",
        background:
          kind === "primary"
            ? "linear-gradient(135deg, rgba(80,130,255,0.55), rgba(70,255,190,0.30))"
            : "rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.95)",
        cursor: "pointer",
        fontSize: 15
      }}
    >
      {children}
    </button>
  );

  const Muted = ({ children }: { children: React.ReactNode }) => (
    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65, lineHeight: 1.45 }}>{children}</div>
  );

  // ===== Screens =====

  if (screen === "loading") {
    return (
      <Shell>
        <Card>
          <div style={{ fontSize: 16, fontWeight: 700 }}>CryptoInvest</div>
          <div style={{ marginTop: 8, opacity: 0.78 }}>Проверяем доступ…</div>
          <Muted>Если ты уже подписан — сейчас откроется приложение.</Muted>
        </Card>
      </Shell>
    );
  }

  if (screen === "gate") {
    return (
      <Shell>
        <Card>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Доступ закрыт</div>
          <div style={{ marginTop: 8, opacity: 0.75, lineHeight: 1.45 }}>
            Подпишись на канал и нажми «Проверить».
          </div>

          <div style={{ height: 14 }} />

          <a href={channelLink} style={{ textDecoration: "none" }}>
            <Button kind="primary">Подписаться</Button>
          </a>

          <div style={{ height: 10 }} />

          <Button onClick={checkSubscription}>Проверить подписку</Button>

          {errorText ? (
            <div style={{ marginTop: 12, fontSize: 13, opacity: 0.85 }}>{errorText}</div>
          ) : null}

          <Muted>
            ID: {userId ?? "—"}
          </Muted>
        </Card>
      </Shell>
    );
  }

  if (screen === "verified") {
    return (
      <Shell>
        <Card>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Готово ✅</div>
          <div style={{ marginTop: 8, opacity: 0.75, lineHeight: 1.45 }}>
            Доступ подтверждён. Загружаем приложение с курсами…
          </div>

          <div style={{ height: 14 }} />

          <div
            style={{
              height: 10,
              borderRadius: 999,
              background: "rgba(255,255,255,0.10)",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                height: "100%",
                width: "100%",
                transformOrigin: "left",
                animation: "fill 3s linear forwards",
                background: "linear-gradient(90deg, rgba(80,130,255,0.9), rgba(70,255,190,0.9))"
              }}
            />
          </div>

          <style>{`
            @keyframes fill {
              from { transform: scaleX(0); }
              to { transform: scaleX(1); }
            }
          `}</style>

          <Muted>ID: {userId ?? "—"}</Muted>
        </Card>
      </Shell>
    );
  }

  // screen === "courses"  (макет)
  return (
    <Shell>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Курсы</div>
          <div style={{ fontSize: 12, opacity: 0.65 }}>Макет страницы</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.6 }}>ID: {userId ?? "—"}</div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <Card>
          <div style={{ fontSize: 16, fontWeight: 750 }}>Блок 1 — Введение</div>
          <div style={{ marginTop: 6, opacity: 0.75, lineHeight: 1.45 }}>
            Основы: интерфейс, терминология, риск-менеджмент.
          </div>
          <div style={{ height: 10 }} />
          <Button kind="primary" onClick={() => alert("Это макет. Контент подключим позже.")}>
            Открыть
          </Button>
        </Card>

        <Card>
          <div style={{ fontSize: 16, fontWeight: 750 }}>Блок 2 — Практика</div>
          <div style={{ marginTop: 6, opacity: 0.75, lineHeight: 1.45 }}>
            Примеры сделок, разбор ошибок, шаблон журнала.
          </div>
          <div style={{ height: 10 }} />
          <Button onClick={() => alert("Это макет. Контент подключим позже.")}>Открыть</Button>
        </Card>

        <Card>
          <div style={{ fontSize: 16, fontWeight: 750 }}>Блок 3 — Стратегии</div>
          <div style={{ marginTop: 6, opacity: 0.75, lineHeight: 1.45 }}>
            2–3 примера подходов и как их тестировать.
          </div>
          <div style={{ height: 10 }} />
          <Button onClick={() => alert("Это макет. Контент подключим позже.")}>Открыть</Button>
        </Card>

        <Button onClick={checkSubscription}>Перепроверить подписку</Button>

        <Button
          onClick={() => {
            tg()?.close?.();
          }}
        >
          Закрыть
        </Button>

        <Muted>
          Это макет интерфейса. Контент и логику “курсов” можно подключить позже.
        </Muted>
      </div>
    </Shell>
  );
}
