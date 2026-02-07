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

function Dots({ speedMs = 450 }: { speedMs?: number }) {
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
  const [progress, setProgress] = useState(6);
  const [userId, setUserId] = useState<number | null>(null);

  const [gateHint, setGateHint] = useState<string | null>(null);

  // ✅ твоя ссылка на канал
  const channelLink = useMemo(() => "https://t.me/+UY4Pyf9PFpxjNWU6", []);

  const mounted = useRef(false);

  // ===== UI helpers =====
  const BG = "#000000";
  const CardBG = "rgba(255,255,255,0.05)";
  const Border = "rgba(255,255,255,0.10)";
  const Text = "rgba(255,255,255,0.92)";
  const Muted = "rgba(255,255,255,0.60)";
  const Purple = "#8B5CF6"; // фиолетовый акцент

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
      <div style={{ maxWidth: 520, margin: "0 auto", paddingTop: 10 }}>{children}</div>
    </div>
  );

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div
      style={{
        borderRadius: 18,
        padding: 16,
        background: CardBG,
        border: `1px solid ${Border}`,
        boxShadow: "0 14px 40px rgba(0,0,0,0.55)"
      }}
    >
      {children}
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
        border: `1px solid ${variant === "primary" ? "rgba(139,92,246,0.55)" : Border}`,
        background:
          variant === "primary"
            ? `linear-gradient(135deg, rgba(139,92,246,0.85), rgba(139,92,246,0.35))`
            : "rgba(255,255,255,0.06)",
        color: "rgba(255,255,255,0.95)",
        cursor: "pointer",
        fontSize: 15,
        letterSpacing: 0.2
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
      <div style={{ fontSize: 13, color: Muted, letterSpacing: 0.2 }}>
        {map[phase]}
        {phase !== "done" ? <Dots /> : null}
      </div>
    );
  }

  // ===== Loading animation logic =====
  useEffect(() => {
    // прогресс мягко растёт сам, без резких скачков
    if (screen !== "loading") return;
    let raf = 0;
    let t0 = performance.now();

    const tick = (t: number) => {
      const dt = (t - t0) / 1000;
      t0 = t;

      setProgress((p) => {
        // пока "loading" — растём до 55
        if (phase === "loading") return clamp(p + dt * 14, 6, 55);
        // пока "checking" — растём до 88
        if (phase === "checking") return clamp(p + dt * 10, 55, 88);
        // done — до 100
        return clamp(p + dt * 40, 88, 100);
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [screen, phase]);

  async function checkSubscription() {
    // 1) стадия загрузки (короткая)
    setScreen("loading");
    setPhase("loading");
    setGateHint(null);

    // небольшая пауза чтобы анимация “успела начаться”
    await new Promise((r) => setTimeout(r, 450));
    setPhase("checking");

    const initData = getInitData();
    const source = getStartAppSource();

    if (!initData) {
      // без лишнего текста: просто переводим в gate
      setPhase("done");
      setProgress(100);
      await new Promise((r) => setTimeout(r, 250));
      setGateHint("Открой Mini App через кнопку Open в боте.");
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
      await new Promise((r) => setTimeout(r, 250));
      setGateHint("Проверка не прошла. Нажми «Проверить» ещё раз.");
      setScreen("gate");
      return;
    }

    setUserId(Number(j.user_id));

    if (j.subscribed) {
      // плавно добиваем прогресс и идём дальше
      setPhase("done");
      setProgress(100);
      await new Promise((r) => setTimeout(r, 350));
      setScreen("courses");
      return;
    }

    // не подписан
    setPhase("done");
    setProgress(100);
    await new Promise((r) => setTimeout(r, 250));
    setGateHint("Курсы уже ждут тебя — осталось совсем чуть-чуть 🙂");
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

  // ===== Screens =====

  if (screen === "loading") {
    return (
      <Shell>
        <div style={{ textAlign: "center", paddingTop: 80 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              margin: "0 auto 18px",
              border: "4px solid rgba(139,92,246,0.18)",
              borderTopColor: Purple,
              animation: "spin 0.9s linear infinite"
            }}
          />
          <PhaseText />

          <div style={{ height: 18 }} />

          <div
            style={{
              width: "100%",
              maxWidth: 420,
              margin: "0 auto",
              height: 10,
              borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${Border}`,
              overflow: "hidden"
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.round(progress)}%`,
                background: `linear-gradient(90deg, rgba(139,92,246,0.95), rgba(139,92,246,0.35))`,
                boxShadow: "0 0 18px rgba(139,92,246,0.35)",
                transition: "width 120ms linear"
              }}
            />
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
            {Math.round(progress)}%
          </div>

          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </Shell>
    );
  }

  if (screen === "gate") {
    return (
      <Shell>
        <Card>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.2 }}>Доступ</div>
          <div style={{ marginTop: 8, color: Muted, lineHeight: 1.5, fontSize: 13 }}>
            {gateHint ?? "Подпишись на канал и нажми «Проверить»."}
          </div>

          <div style={{ height: 14 }} />

          <a href={channelLink} style={{ textDecoration: "none" }}>
            <Btn variant="primary">Подписаться</Btn>
          </a>

          <div style={{ height: 10 }} />

          <Btn onClick={checkSubscription}>Проверить подписку</Btn>

          <div style={{ marginTop: 12, fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
            ID: {userId ?? "—"}
          </div>
        </Card>
      </Shell>
    );
  }

  // ===== Courses mock =====
  return (
    <Shell>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 850, letterSpacing: 0.2 }}>Курсы</div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.45)" }}>ID: {userId ?? "—"}</div>
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
              background: CardBG,
              border: `1px solid ${Border}`
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 0.2 }}>{c.title}</div>
            <div style={{ marginTop: 6, fontSize: 13, color: Muted, lineHeight: 1.45 }}>{c.desc}</div>

            <div style={{ height: 12 }} />

            <Btn
              variant="primary"
              onClick={() => {
                // макет
                alert("Макет курса. Контент подключим позже.");
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
