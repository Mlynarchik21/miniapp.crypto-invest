"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Screen = "loading" | "gate" | "courses";
type Phase = "loading" | "checking" | "done";

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

function Dots({ speedMs = 520 }: { speedMs?: number }) {
  const [n, setN] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setN((x) => (x % 3) + 1), speedMs);
    return () => clearInterval(t);
  }, [speedMs]);
  return (
    <span style={{ display: "inline-block", width: 18 }}>
      {Array.from({ length: n })
        .map(() => ".")
        .join("")}
    </span>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function Page() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState(2);
  const mounted = useRef(false);

  const channelLink = useMemo(
    () => "https://t.me/+UY4Pyf9PFpxjNWU6",
    []
  );

  // ===== Theme =====
  const BG = "#000000";
  const Text = "rgba(255,255,255,0.92)";
  const Muted = "rgba(255,255,255,0.60)";
  const Purple = "#8B5CF6";

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        color: Text,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        padding: 18
      }}
    >
      <div style={{ maxWidth: 520, margin: "0 auto" }}>{children}</div>
    </div>
  );

  const Btn = ({
    children,
    onClick,
    variant = "ghost"
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: "ghost" | "primary";
  }) => (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "12px 14px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          variant === "primary"
            ? `linear-gradient(135deg, rgba(139,92,246,0.95), rgba(139,92,246,0.35))`
            : "rgba(255,255,255,0.06)",
        color: "rgba(255,255,255,0.95)",
        cursor: "pointer",
        fontSize: 15
      }}
    >
      {children}
    </button>
  );

  function PhaseText() {
    const map: Record<Phase, string> = {
      loading: "Загружаем данные",
      checking: "Проверяем подписку",
      done: "Готово"
    };
    return (
      <div style={{ fontSize: 13, color: Muted }}>
        {map[phase]}
        {phase !== "done" ? <Dots /> : null}
      </div>
    );
  }

  // ===== Progress =====
  useEffect(() => {
    if (screen !== "loading") return;

    let raf = 0;
    let t0 = performance.now();

    const tick = (t: number) => {
      const dt = (t - t0) / 1000;
      t0 = t;

      setProgress((p) => {
        if (phase === "loading") return clamp(p + dt * 6.5, 2, 60);
        if (phase === "checking") return clamp(p + dt * 4.2, 60, 92);
        return clamp(p + dt * 18, 92, 100);
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [screen, phase]);

  async function checkSubscription() {
    setScreen("loading");
    setPhase("loading");

    await new Promise((r) => setTimeout(r, 900));
    setPhase("checking");

    const initData = getInitData();
    const source = getStartAppSource();

    await new Promise((r) => setTimeout(r, 1100));

    if (!initData) {
      setScreen("gate");
      return;
    }

    const r = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData, source })
    });

    const j = await r.json().catch(() => null);

    if (j?.subscribed) {
      setScreen("courses");
    } else {
      setScreen("gate");
    }
  }

  // ===== INIT + TRACK OPEN =====
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    const w = tg();
    w?.ready?.();
    w?.expand?.();

    // ✅ фиксируем Open
    const initData = (window as any)?.Telegram?.WebApp?.initData;

    if (initData) {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initData,
          action: "open"
        })
      }).catch(() => {});
    }

    checkSubscription();
  }, []);

  // ===== Loading =====
  if (screen === "loading") {
    return (
      <Shell>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
          <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 999,
                margin: "0 auto 18px",
                border: "4px solid rgba(139,92,246,0.14)",
                borderTopColor: Purple,
                animation: "spin 1.1s linear infinite"
              }}
            />

            <PhaseText />

            <div style={{ height: 18 }} />

            <div
              style={{
                width: "100%",
                height: 10,
                borderRadius: 999,
                background: "rgba(255,255,255,0.05)",
                overflow: "hidden"
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.round(progress)}%`,
                  background: `linear-gradient(90deg, rgba(139,92,246,0.95), rgba(255,255,255,0.18))`
                }}
              />
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  // ===== Gate =====
  if (screen === "gate") {
    return (
      <Shell>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
          <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 850 }}>Упс</div>

            <div style={{ marginTop: 10, fontSize: 14, color: Muted }}>
              Ты ещё не подписан на канал.
              <br />
              Подпишись и получи доступ к курсам.
            </div>

            <div style={{ height: 22 }} />

            {/* ✅ TRACK SUBSCRIBE CLICK */}
            <Btn
              variant="primary"
              onClick={() => {
                const initData =
                  (window as any)?.Telegram?.WebApp?.initData;

                if (initData) {
                  fetch("/api/track", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      initData,
                      action: "subscribe_click"
                    })
                  }).catch(() => {});
                }

                window.location.href = channelLink;
              }}
            >
              Подписаться
            </Btn>

            <div style={{ height: 10 }} />

            <Btn onClick={checkSubscription}>
              Проверить подписку
            </Btn>
          </div>
        </div>
      </Shell>
    );
  }

  // ===== Courses Stub =====
  return (
    <Shell>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center"
        }}
      >
        <div
          style={{
            maxWidth: 420,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            Курсов здесь нет
          </div>

          <div style={{ fontSize: 14, color: Muted, lineHeight: 1.7 }}>
            Это была проверка нашей маркетинговой стратегии.
            <br />
            Спасибо, что дошёл до этого шага.
          </div>

          <div
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.52)",
              lineHeight: 1.6
            }}
          >
            Приносим извинения за ожидания.
            <br />
            Скоро здесь появится настоящий контент.
          </div>

          <div style={{ width: "100%", maxWidth: 260 }}>
            <Btn
              variant="primary"
              onClick={() => {
                tg()?.close?.();
              }}
            >
              Закрыть приложение
            </Btn>
          </div>
        </div>
      </div>
    </Shell>
  );
}
