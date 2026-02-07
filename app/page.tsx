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
  return <span style={{ display: "inline-block", width: 18 }}>{Array.from({ length: n }).map(() => ".").join("")}</span>;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function Page() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState(2);
  const [userId, setUserId] = useState<number | null>(null);

  const [gateHint, setGateHint] = useState<string | null>(null);

  // ✅ ссылка на канал
  const channelLink = useMemo(() => "https://t.me/+UY4Pyf9PFpxjNWU6", []);

  const mounted = useRef(false);

  // ===== Theme =====
  const BG = "#000000";
  const Text = "rgba(255,255,255,0.92)";
  const Muted = "rgba(255,255,255,0.60)";
  const Muted2 = "rgba(255,255,255,0.45)";
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
        fontSize: 15,
        letterSpacing: 0.2,
        transition: "transform 120ms ease, filter 120ms ease",
        filter: "saturate(1.02)"
      }}
      onMouseDown={(e) => ((e.currentTarget.style.transform = "scale(0.99)"), (e.currentTarget.style.filter = "saturate(1.1)"))}
      onMouseUp={(e) => ((e.currentTarget.style.transform = "scale(1)"), (e.currentTarget.style.filter = "saturate(1.02)"))}
      onMouseLeave={(e) => ((e.currentTarget.style.transform = "scale(1)"), (e.currentTarget.style.filter = "saturate(1.02)"))}
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
      <div style={{ fontSize: 13, color: Muted, letterSpacing: 0.2 }}>
        {map[phase]}
        {phase !== "done" ? <Dots /> : null}
      </div>
    );
  }

  // ===== smoother, longer progress =====
  useEffect(() => {
    if (screen !== "loading") return;

    let raf = 0;
    let t0 = performance.now();

    const tick = (t: number) => {
      const dt = (t - t0) / 1000;
      t0 = t;

      setProgress((p) => {
        // более длинные стадии
        if (phase === "loading") return clamp(p + dt * 6.5, 2, 60);   // медленно до 60%
        if (phase === "checking") return clamp(p + dt * 4.2, 60, 92); // ещё медленнее до 92%
        return clamp(p + dt * 18, 92, 100);                            // мягко в 100%
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [screen, phase]);

  async function checkSubscription() {
    setScreen("loading");
    setPhase("loading");
    setGateHint(null);

    // Даем пользователю увидеть анимацию
    await new Promise((r) => setTimeout(r, 900));
    setPhase("checking");

    const initData = getInitData();
    const source = getStartAppSource();

    // ещё немного времени на "checking" — чтобы анимация выглядела дороже
    await new Promise((r) => setTimeout(r, 1100));

    if (!initData) {
      setPhase("done");
      setProgress(100);
      await new Promise((r) => setTimeout(r, 550));
      setGateHint("Похоже, приложение открылось без данных Telegram. Нажми Open внутри бота и попробуй снова.");
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
      setPhase("done");
      setProgress(100);
      await new Promise((r) => setTimeout(r, 550));
      setGateHint("Не получилось подтвердить доступ с первого раза. Давай попробуем ещё раз.");
      setScreen("gate");
      return;
    }

    setUserId(Number(j.user_id));

    if (j.subscribed) {
      setPhase("done");
      setProgress(100);
      await new Promise((r) => setTimeout(r, 650));
      setScreen("courses");
      return;
    }

    setPhase("done");
    setProgress(100);
    await new Promise((r) => setTimeout(r, 550));
    setGateHint(null);
    setScreen("gate");
  }

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    const w = tg();
    w?.ready?.();
    w?.expand?.();

    checkSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Loading Screen =====
  if (screen === "loading") {
    return (
      <Shell>
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center"
          }}
        >
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
                  background: `linear-gradient(90deg, rgba(139,92,246,0.95), rgba(255,255,255,0.18))`,
                  boxShadow: "0 0 22px rgba(139,92,246,0.25)",
                  transition: "width 180ms linear"
                }}
              />
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: Muted2 }}>{Math.round(progress)}%</div>

            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      </Shell>
    );
  }

  // ===== Gate Screen (center, modern, no card) =====
  if (screen === "gate") {
    return (
      <Shell>
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center"
          }}
        >
          <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 850, letterSpacing: 0.2 }}>Упс</div>

            <div style={{ marginTop: 10, fontSize: 14, color: Muted, lineHeight: 1.6 }}>
              Ты, похоже, ещё не подписался на наш канал.
              <br />
              Ничего страшного — сейчас быстро исправим 🙂
            </div>

            <div style={{ marginTop: 14, fontSize: 14, color: Muted, lineHeight: 1.6 }}>
              Курсы уже ждут тебя — осталось совсем чуть-чуть.
            </div>

            {gateHint ? (
              <div style={{ marginTop: 14, fontSize: 13, color: "rgba(255,255,255,0.52)", lineHeight: 1.55 }}>
                {gateHint}
              </div>
            ) : null}

            <div style={{ height: 22 }} />

            <a href={channelLink} style={{ textDecoration: "none" }}>
              <Btn variant="primary">Подписаться</Btn>
            </a>

            <div style={{ height: 10 }} />

            <Btn onClick={checkSubscription}>Проверить подписку</Btn>

            <div style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.32)" }}>
              ID: {userId ?? "—"}
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  // ===== Courses mock (strict, minimal) =====
  return (
    <Shell>
      <div style={{ paddingTop: 18, paddingBottom: 8, display: "flex", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 850, letterSpacing: 0.2 }}>Курсы</div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: Muted2 }}>ID: {userId ?? "—"}</div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {[
          { title: "Введение", desc: "Старт, база и правила." },
          { title: "Практика", desc: "Задачи, примеры, разбор." },
          { title: "Стратегии", desc: "Подходы и тестирование." }
        ].map((c) => (
          <div
            key={c.title}
            style={{
              borderRadius: 18,
              padding: 16,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)"
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 850, letterSpacing: 0.2 }}>{c.title}</div>
            <div style={{ marginTop: 6, fontSize: 13, color: Muted, lineHeight: 1.5 }}>{c.desc}</div>

            <div style={{ height: 12 }} />

            <Btn
              variant="primary"
              onClick={() => {
                alert("Это макет. Контент подключим позже.");
              }}
            >
              Открыть
            </Btn>
          </div>
        ))}

        <Btn onClick={checkSubscription}>Перепроверить подписку</Btn>

        <Btn
          onClick={() => {
            tg()?.close?.();
          }}
        >
          Закрыть
        </Btn>
      </div>
    </Shell>
  );
}
