import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Ticket, Mic2, Volume2, Music2, PartyPopper, Sparkles, Gift, Star,
  Flame, MapPin, ArrowRight, Zap, Trophy, Guitar, Drum, Headphones, Radio, Speaker, Disc3,
} from "lucide-react";

// --- Connexion Supabase ---------------------------------------------------
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://TON-PROJET.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "TA_CLE_ANON_PUBLIC";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PRODUCTS = [
  { code: "cr5", label: "CR5", obj: 6 },
  { code: "35pp", label: "35PP", obj: 20 },
  { code: "35out", label: "35 OUT", obj: 7 },
  { code: "crbr", label: "CR BR", obj: 13 },
  { code: "chees", label: "CHEES", obj: 9 },
  { code: "aptc", label: "APTC", obj: 6 },
  { code: "pcot", label: "PCOT", obj: 17 },
  { code: "mas500", label: "MAS 500", obj: 12 },
  { code: "fdlfap", label: "FDL FAP", obj: 6 },
  { code: "opti", label: "OPTI", obj: 4 },
  { code: "miniboules", label: "MINI", obj: 7 },
  { code: "fdl125", label: "FDL 125", obj: 5 },
  { code: "ftlac", label: "FTLAC", obj: 15 },
  { code: "pansur", label: "PAN SUR", obj: 3 },
  { code: "desch", label: "DES CH", obj: 8 },
  { code: "desalk", label: "DES SAL", obj: 13 },
  { code: "leed20", label: "LEED 20", obj: 5 },
  { code: "breb", label: "BREB", obj: 7 },
  { code: "ronbio", label: "RONBIO", obj: 5 },
  { code: "roit", label: "ROIT", obj: 6 },
];

const CLIENTS = ["NOR","GU","DOM","LVR","CRFG","DC","MON","BL","BODA","GUST","PRO","TGT","BUIS","LEFT","ODE","FRAIS","LGC","CRP","SY","INDP"];

const TOTAL_OBJECTIVE = PRODUCTS.reduce((s, p) => s + p.obj, 0);
const MONTH_LABEL = "Septembre";
const STORAGE_PLACEMENTS_KEY = "capdn-festival-placements-septembre";
const STORAGE_ACTIVITY_KEY = "capdn-festival-activity-septembre";

const NIGHT = "#0B0620";
const NIGHT2 = "#170C36";
const NIGHT3 = "#20124A";
const GLASS_BORDER = "rgba(255,255,255,0.10)";
const MAGENTA = "#FF2E9A";
const AMBER = "#FFC93C";
const TEAL = "#22E6C5";
const VIOLET = "#9B6BFF";
const PAPER = "#FBF3E4";
const INK = "#1A1035";
const INK_SOFT = "#6B5D95";
const TEXT = "#F5EFFF";
const TEXT_MUTED = "#B6A6DE";
const START_STAGE = { label: "Avant-scène", value: 0 };

const MILESTONES = [
  { value: 50, label: "Olympia", venue: "Olympia", icon: Mic2, reward: "Blind test équipe Teams", color: MAGENTA, emoji: "🎤" },
  { value: 100, label: "Zénith", venue: "Zénith", icon: Volume2, reward: "Un jeu à gratter chacun", color: TEAL, emoji: "🔊" },
  { value: 150, label: "Accor Arena", venue: "Accor Arena", icon: Music2, reward: "Un mot personnalisé par Audrey", color: VIOLET, emoji: "🎶" },
  { value: 174, label: "Stade de France", venue: "Stade de France", icon: Trophy, reward: "Afterwork offert", color: AMBER, emoji: "🏟️" },
];

async function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function withRetries(fn, attempts = 3, baseDelayMs = 500) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e) { lastError = e; if (i < attempts - 1) await wait(baseDelayMs * (i + 1)); }
  }
  throw lastError;
}

function useSharedJSON(key, fallback, onError) {
  const [value, setValue] = useState(fallback);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const { data, error } = await withRetries(
          () => supabase.from("kv").select("value").eq("key", key).maybeSingle(),
          2, 500
        );
        if (error) throw error;
        if (active) setValue(data?.value ?? fallback);
      } catch (e) {
        if (active) setValue(fallback);
      } finally {
        if (active) setLoaded(true);
      }
    })();

    const channel = supabase
      .channel(`kv-${key}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kv", filter: `key=eq.${key}` },
        (payload) => {
          if (active && payload.new && payload.new.value !== undefined) {
            setValue(payload.new.value);
          }
        }
      )
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const persist = async (next) => {
    setValue(next);
    try {
      const { error } = await withRetries(
        () => supabase.from("kv").upsert({ key, value: next }, { onConflict: "key" }),
        4, 600
      );
      if (error) throw error;
    } catch (e) {
      onError && onError({
        message: "Échec de la sauvegarde après plusieurs tentatives : " + (e?.message || "erreur inconnue"),
        retry: () => persist(next),
      });
    }
  };

  return [value, persist, loaded];
}

function computeTotals(placements) {
  const byProduct = {};
  for (const p of PRODUCTS) {
    byProduct[p.code] = CLIENTS.reduce((count, c) => (placements[`${p.code}|${c}`]?.checked ? count + 1 : count), 0);
  }
  const total = Object.values(byProduct).reduce((a, b) => a + b, 0);
  return { byProduct, total };
}

function AuroraField() {
  const blobs = [
    { top: "-10%", left: "5%", size: 380, color: MAGENTA, dur: "22s", delay: "0s" },
    { top: "5%", left: "60%", size: 420, color: TEAL, dur: "26s", delay: "-6s" },
    { top: "55%", left: "80%", size: 340, color: VIOLET, dur: "20s", delay: "-3s" },
    { top: "65%", left: "-8%", size: 360, color: AMBER, dur: "24s", delay: "-10s" },
  ];
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {blobs.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full aurora-blob"
          style={{
            top: b.top, left: b.left, width: b.size, height: b.size, background: b.color,
            filter: "blur(90px)", opacity: 0.22, animationDuration: b.dur, animationDelay: b.delay,
          }}
        />
      ))}
    </div>
  );
}

function ConfettiField({ count = 16 }) {
  const particles = useMemo(() => {
    const colors = [TEAL, MAGENTA, AMBER, VIOLET];
    return Array.from({ length: count }).map((_, i) => ({
      left: (i * 6.3 + (i % 3) * 11) % 100,
      size: 3 + (i % 3) * 2,
      color: colors[i % colors.length],
      delay: (i % 8) * 0.7,
      duration: 7 + (i % 5) * 1.3,
    }));
  }, [count]);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full confetti-particle"
          style={{
            left: `${p.left}%`, bottom: -10, width: p.size, height: p.size, background: p.color,
            boxShadow: `0 0 6px ${p.color}`, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function BigRing({ pct, total, objective }) {
  const size = 208;
  const stroke = 16;
  const orbitDots = [
    { radius: size / 2 + 4, dur: "9s", size: 8, color: TEAL },
    { radius: size / 2 + 4, dur: "13s", size: 6, color: MAGENTA, reverse: true },
  ];
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {orbitDots.map((o, i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{ animation: `orbit ${o.dur} linear infinite ${o.reverse ? "reverse" : "normal"}` }}
        >
          <div
            className="absolute rounded-full"
            style={{
              top: -o.size / 2, left: "50%", marginLeft: -o.size / 2, width: o.size, height: o.size,
              background: o.color, boxShadow: `0 0 10px ${o.color}`,
            }}
          />
        </div>
      ))}
      <div
        className="absolute inset-0 rounded-full ring-pulse"
        style={{
          background: `conic-gradient(${TEAL} 0%, ${MAGENTA} ${pct}%, rgba(255,255,255,0.08) ${pct}% 100%)`,
        }}
      />
      <div
        className="absolute rounded-full flex flex-col items-center justify-center"
        style={{ inset: stroke, background: NIGHT2, border: `1px solid ${GLASS_BORDER}` }}
      >
        <div className="mono-font font-bold" style={{ fontSize: 44, color: TEXT, lineHeight: 1 }}>{total}</div>
        <div className="mono-font text-xs mt-1" style={{ color: TEXT_MUTED }}>sur {objective} pts</div>
      </div>
    </div>
  );
}

function TicketStub({ milestone, reached, isNext }) {
  const Icon = milestone.icon;
  const c = milestone.color;
  return (
    <div
      className={`relative flex-shrink-0 rounded-2xl overflow-visible ticket-in ${isNext ? "ticket-next" : ""}`}
      style={{
        width: 180,
        background: reached ? `linear-gradient(160deg, ${NIGHT3}, ${NIGHT2})` : "rgba(255,255,255,0.03)",
        border: `1.5px solid ${reached ? c : GLASS_BORDER}`,
        boxShadow: reached ? `0 0 22px ${c}55` : "none",
        opacity: reached ? 1 : 0.55,
      }}
    >
      {reached && (
        <div
          className="absolute -top-2 -right-2 rounded-full flex items-center justify-center twinkle"
          style={{ width: 26, height: 26, background: c, boxShadow: `0 0 10px ${c}` }}
        >
          <Star size={13} color={NIGHT} fill={NIGHT} />
        </div>
      )}
      <div className="px-3 pt-3 pb-2">
        <div className="rounded-full inline-flex items-center justify-center mb-1.5" style={{ width: 30, height: 30, background: `${c}22`, border: `1px solid ${c}55` }}>
          <Icon size={15} color={c} />
        </div>
        <div className="poster-font text-base leading-tight" style={{ color: TEXT }}>{milestone.label}</div>
        <div className="mono-font text-[11px] font-semibold" style={{ color: TEXT_MUTED }}>{milestone.value} pts</div>
      </div>
      {milestone.reward && (
        <div className="px-3 pb-3 pt-2" style={{ borderTop: `1.5px dashed ${GLASS_BORDER}` }}>
          <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: c }}>Récompense</div>
          <div className="text-xs font-semibold" style={{ color: TEXT }}>{milestone.reward}</div>
        </div>
      )}
    </div>
  );
}

const INSTRUMENT_ICONS = [Guitar, Drum, Headphones, Mic2, Music2, Radio, Disc3, Volume2, Speaker, PartyPopper];

function InstrumentBadge({ product, achieved, index }) {
  const done = achieved >= product.obj;
  const pct = Math.min(100, (achieved / product.obj) * 100);
  const Icon = INSTRUMENT_ICONS[index % INSTRUMENT_ICONS.length];
  const rot = Math.round(Math.sin(index * 1.7) * 16);
  const offsetY = Math.round(Math.sin(index * 2.3) * 20) + 26;
  const size = 42 + (index % 5) * 9;
  const dur = 2.6 + (index % 5) * 0.45;
  const lit = Math.max(0.3, pct / 100);
  const color = done ? AMBER : TEAL;

  return (
    <div style={{ marginTop: offsetY, width: size + 34 }} className="flex-shrink-0">
      <div
        className="badge-sway flex flex-col items-center flex-shrink-0"
        style={{ "--rot": `${rot}deg`, animationDuration: `${dur}s`, animationDelay: `${(index % 7) * 0.22}s` }}
      >
        <div className="relative flex items-center justify-center" style={{ width: size + 26, height: size + 26 }}>
          <div
            className="absolute rounded-full"
            style={{
              width: size * (0.9 + pct / 130), height: size * (0.9 + pct / 130),
              background: color, filter: `blur(${done ? 18 : 12}px)`, opacity: done ? 0.55 : 0.28 * lit,
            }}
          />
          <Icon
            size={size}
            color={color}
            strokeWidth={done ? 2.3 : 1.8}
            className={done ? "twinkle" : ""}
            style={{ opacity: lit, filter: `drop-shadow(0 0 ${done ? 14 : 6}px ${color}${done ? "" : "88"})` }}
          />
          {done && (
            <div
              className="stamp-badge absolute -top-1 -right-1 rounded-full flex items-center justify-center"
              style={{ width: 22, height: 22, background: AMBER, boxShadow: `0 0 10px ${AMBER}` }}
            >
              <Star size={11} color={NIGHT} fill={NIGHT} />
            </div>
          )}
        </div>
        <div
          className="mono-font text-[10px] font-bold px-2 py-1 rounded-full -mt-1 text-center leading-tight"
          style={{
            background: done ? `${AMBER}22` : "rgba(255,255,255,0.06)",
            border: `1px solid ${done ? AMBER : GLASS_BORDER}`,
            color: TEXT,
          }}
        >
          {product.label}
          <div style={{ opacity: 0.65, fontWeight: 500 }}>{achieved}/{product.obj}</div>
        </div>
      </div>
    </div>
  );
}

function Burst({ originX, originY, color, count, spread, size, delayMs }) {
  const [live, setLive] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLive(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  const particles = useMemo(() => {
    const colors = [color, TEAL, MAGENTA, AMBER, VIOLET];
    return Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2 + (delayMs / 100);
      const dist = spread + (i % 6) * 26;
      return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, color: colors[i % colors.length], sz: size + (i % 4) * 4 };
    });
  }, [count, spread, size, color, delayMs]);
  return (
    <div className="absolute" style={{ left: originX, top: originY }}>
      <div
        className="absolute rounded-full"
        style={{
          left: -40, top: -40, width: 80, height: 80, background: color,
          filter: "blur(20px)", opacity: live ? 0 : 0.9, transition: "opacity 500ms ease-out",
        }}
      />
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.sz, height: p.sz, background: p.color, boxShadow: `0 0 18px 4px ${p.color}`,
            transform: live ? `translate(${p.x}px, ${p.y}px) scale(0.15)` : "translate(0,0) scale(1.3)",
            opacity: live ? 0 : 1,
            transition: `transform 1900ms cubic-bezier(.13,.7,.25,1), opacity 1900ms ease-out`,
          }}
        />
      ))}
    </div>
  );
}

function ConfettiRain({ count = 30, colorA, colorB, big }) {
  const drops = useMemo(() => Array.from({ length: count }).map((_, i) => ({
    left: (i * 3.7 + (i % 5) * 9) % 100,
    color: i % 2 === 0 ? colorA : colorB,
    delay: (i % 12) * 0.18,
    duration: (big ? 3.2 : 2.4) + (i % 6) * 0.35,
    size: (big ? 8 : 5) + (i % 3) * 4,
  })), [count, colorA, colorB, big]);
  return (
    <>
      {drops.map((d, i) => (
        <div
          key={i}
          className="absolute rounded-sm confetti-fall"
          style={{ left: `${d.left}%`, top: -20, width: d.size, height: d.size * 1.6, background: d.color, boxShadow: `0 0 8px ${d.color}88`, animationDuration: `${d.duration}s`, animationDelay: `${d.delay}s` }}
        />
      ))}
    </>
  );
}

function ConfettiCannons({ colorA, colorB, count = 46 }) {
  const shots = useMemo(() => {
    const colors = [colorA, colorB, TEAL, MAGENTA, AMBER, VIOLET];
    return Array.from({ length: count }).map((_, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const angle = 55 + (i % 9) * 4;
      const power = 480 + (i % 7) * 60;
      const rad = (angle * Math.PI) / 180;
      const x = side * Math.cos(rad) * power;
      const y = -Math.sin(rad) * power;
      return { side, x, y, color: colors[i % colors.length], size: 6 + (i % 4) * 3, delay: (i % 10) * 40 };
    });
  }, [colorA, colorB, count]);
  return (
    <>
      {shots.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-sm cannon-shot"
          style={{
            bottom: 10, left: s.side < 0 ? -10 : "auto", right: s.side > 0 ? -10 : "auto",
            width: s.size, height: s.size, background: s.color, boxShadow: `0 0 12px ${s.color}`,
            animationDelay: `${s.delay}ms`,
            "--dx": `${s.x}px`, "--dy": `${s.y}px`,
          }}
        />
      ))}
    </>
  );
}

function SunburstFlash({ color }) {
  return (
    <div
      className="absolute rounded-full sunburst-scale"
      style={{
        top: "50%", left: "50%", width: 40, height: 40, marginLeft: -20, marginTop: -20,
        background: `repeating-conic-gradient(${color}AA 0deg 8deg, transparent 8deg 20deg)`,
      }}
    />
  );
}

function ExplosionOverlay({ milestone, onDone }) {
  const isFinal = milestone.value === 174;
  const duration = isFinal ? 9000 : 6200;

  useEffect(() => {
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wavePositions = [
    { x: "50%", y: "38%" }, { x: "20%", y: "26%" }, { x: "80%", y: "26%" },
    { x: "32%", y: "55%" }, { x: "68%", y: "55%" }, { x: "50%", y: "68%" },
    { x: "15%", y: "45%" }, { x: "85%", y: "45%" },
  ];
  const waveCount = isFinal ? 5 : 3;
  const bursts = [];
  for (let w = 0; w < waveCount; w++) {
    wavePositions.forEach((pos, i) => {
      bursts.push({
        x: pos.x, y: pos.y,
        spread: isFinal ? 220 + (i % 3) * 40 : 170 + (i % 3) * 30,
        count: isFinal ? 34 : 24,
        size: isFinal ? 9 : 7,
        delay: w * (isFinal ? 900 : 850) + i * 90,
      });
    });
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden screen-shake">
      <div className="absolute inset-0" style={{ background: `${NIGHT}CC`, backdropFilter: "blur(3px)" }} />
      <div className="absolute inset-0 cam-flash" style={{ background: "#FFFFFF" }} />
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(circle at 50% 45%, ${milestone.color}55, transparent 65%)`, animation: `flashIn ${isFinal ? 2200 : 1500}ms ease-out forwards` }}
      />
      <SunburstFlash color={milestone.color} />

      <ConfettiCannons colorA={milestone.color} colorB={AMBER} count={isFinal ? 70 : 46} />
      <ConfettiRain count={isFinal ? 70 : 42} colorA={milestone.color} colorB={AMBER} big={isFinal} />

      {bursts.map((b, i) => (
        <Burst key={i} originX={b.x} originY={b.y} color={milestone.color} count={b.count} spread={b.spread} size={b.size} delayMs={b.delay} />
      ))}

      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div
          className="relative flex flex-col items-center gap-3 px-10 py-8 sm:px-16 sm:py-12 rounded-3xl explosion-pop"
          style={{ background: `linear-gradient(160deg, ${NIGHT3}, ${NIGHT2})`, border: `3px solid ${milestone.color}`, boxShadow: `0 0 120px ${milestone.color}CC, 0 0 260px ${milestone.color}66` }}
        >
          <div className="banner-bounce" style={{ fontSize: isFinal ? 96 : 68 }}>{milestone.emoji}</div>
          <div
            className={`poster-font text-center leading-tight ${isFinal ? "gradient-title" : ""}`}
            style={{ fontSize: isFinal ? "clamp(2.2rem,7vw,4.2rem)" : "clamp(1.8rem,5vw,3rem)", color: isFinal ? undefined : TEXT, textShadow: isFinal ? "none" : `0 0 30px ${milestone.color}` }}
          >
            {isFinal ? "FESTIVAL COMPLET !" : `${milestone.venue} DÉBLOQUÉ !`}
          </div>
          <div
            className="flex items-center gap-2 px-5 py-2.5 rounded-full mt-1"
            style={{ background: `${milestone.color}22`, border: `2px solid ${milestone.color}` }}
          >
            <span className="text-lg">🎁</span>
            <span className="text-base sm:text-xl font-bold" style={{ color: TEXT }}>{milestone.reward}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [flash, setFlash] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [explosion, setExplosion] = useState(null);
  const prevTotalRef = useRef(null);

  const [placements, setPlacements, placementsLoaded] = useSharedJSON(STORAGE_PLACEMENTS_KEY, {}, setSaveError);
  const [activity, setActivity] = useSharedJSON(STORAGE_ACTIVITY_KEY, [], setSaveError);

  const { byProduct: achievedByProduct, total: totalAchieved } = useMemo(() => computeTotals(placements), [placements]);

  useEffect(() => {
    if (!placementsLoaded) return;
    if (prevTotalRef.current === null) {
      prevTotalRef.current = totalAchieved;
      return;
    }
    const prev = prevTotalRef.current;
    const crossed = MILESTONES.filter((m) => prev < m.value && totalAchieved >= m.value);
    if (crossed.length > 0) {
      setExplosion(crossed[crossed.length - 1]);
    }
    prevTotalRef.current = totalAchieved;
  }, [totalAchieved, placementsLoaded]);

  async function toggleCell(productCode, clientCode) {
    const key = `${productCode}|${clientCode}`;
    const next = { ...placements };
    const wasChecked = !!next[key]?.checked;

    if (wasChecked) {
      delete next[key];
    } else {
      next[key] = { checked: true, at: new Date().toISOString() };
      setFlash(key);
      setTimeout(() => setFlash(null), 550);
      setActivity([{ product: productCode, client: clientCode, at: new Date().toISOString() }, ...activity].slice(0, 50));
    }
    setPlacements(next);
  }

  const pct = Math.min(100, (totalAchieved
