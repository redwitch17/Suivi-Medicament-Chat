import React, { useState, useEffect, useCallback } from "react";

// --- Helpers -----------------------------------------------------------

const pad = (n) => String(n).padStart(2, "0");

const toKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const startOfDay = (d) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

const dayLabel = (date) =>
  date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");

const STORAGE_KEY = "chat-medoc-historique";

// Cat mood based on state
function CatFace({ mood }) {
  // mood: 'happy' | 'waiting' | 'sleepy'
  const palettes = {
    happy: { fur: "#E8A34D", inner: "#FFF6E9", cheek: "#F5C99B" },
    waiting: { fur: "#8C8378", inner: "#EFEAE2", cheek: "#D8CFC2" },
    sleepy: { fur: "#6B6459", inner: "#E4DDD1", cheek: "#C7BCA9" },
  };
  const p = palettes[mood];

  return (
    <svg viewBox="0 0 200 180" width="120" height="108" role="img" aria-label="Chat">
      {/* ears */}
      <polygon points="35,55 15,10 70,45" fill={p.fur} />
      <polygon points="165,55 185,10 130,45" fill={p.fur} />
      <polygon points="38,50 27,22 58,42" fill={p.cheek} />
      <polygon points="162,50 173,22 142,42" fill={p.cheek} />
      {/* head */}
      <ellipse cx="100" cy="105" rx="82" ry="72" fill={p.fur} />
      {/* face patch */}
      <ellipse cx="100" cy="120" rx="55" ry="42" fill={p.inner} />

      {mood === "happy" && (
        <>
          <path d="M70 95 Q78 85 86 95" stroke="#3A342B" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M114 95 Q122 85 130 95" stroke="#3A342B" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M85 130 Q100 145 115 130" stroke="#3A342B" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      )}
      {mood === "waiting" && (
        <>
          <circle cx="78" cy="98" r="6" fill="#3A342B" />
          <circle cx="122" cy="98" r="6" fill="#3A342B" />
          <path d="M88 132 Q100 128 112 132" stroke="#3A342B" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      )}
      {mood === "sleepy" && (
        <>
          <path d="M68 98 Q78 102 88 98" stroke="#3A342B" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M112 98 Q122 102 132 98" stroke="#3A342B" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M92 133 Q100 130 108 133" stroke="#3A342B" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* nose + whiskers */}
      <polygon points="100,112 94,120 106,120" fill="#C97B5C" />
      <line x1="20" y1="108" x2="65" y2="104" stroke="#3A342B" strokeWidth="2" />
      <line x1="20" y1="120" x2="65" y2="118" stroke="#3A342B" strokeWidth="2" />
      <line x1="180" y1="108" x2="135" y2="104" stroke="#3A342B" strokeWidth="2" />
      <line x1="180" y1="120" x2="135" y2="118" stroke="#3A342B" strokeWidth="2" />
    </svg>
  );
}

export default function MedocTracker() {
  const [history, setHistory] = useState({}); // { "2026-07-19": true }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [today] = useState(startOfDay(new Date()));

  const todayKey = toKey(today);
  const takenToday = !!history[todayKey];

  // Load from storage
  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY, false);
        if (result && result.value) {
          setHistory(JSON.parse(result.value));
        }
      } catch (e) {
        // key not found yet is normal on first use
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next) => {
    setHistory(next);

    const attempt = async (tryNumber) => {
      try {
        const result = await window.storage.set(STORAGE_KEY, JSON.stringify(next), false);
        if (result) {
          setError(null);
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    };

    let ok = await attempt(1);
    if (!ok) {
      await new Promise((r) => setTimeout(r, 400));
      ok = await attempt(2);
    }
    if (!ok) {
      await new Promise((r) => setTimeout(r, 900));
      ok = await attempt(3);
    }
    if (!ok) {
      setError(
        "La sauvegarde ne fonctionne pas dans cet environnement — ta coche du jour reste affichée mais ne sera pas gardée si tu recharges l'appli."
      );
    }
  }, []);

  const toggleToday = () => {
    const next = { ...history };
    if (next[todayKey]) delete next[todayKey];
    else next[todayKey] = true;
    persist(next);
  };

  // Build last 7 days for the strip
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  // Current streak (consecutive days ending today or yesterday)
  const streak = (() => {
    let count = 0;
    let cursor = new Date(today);
    // if today not taken yet, streak counts up to yesterday
    if (!history[toKey(cursor)]) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (history[toKey(cursor)]) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  })();

  const mood = takenToday ? "happy" : new Date().getHours() >= 20 ? "sleepy" : "waiting";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #F6EFE4 0%, #EFE4D2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily:
          "'Avenir Next', 'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "#FFFDF9",
          borderRadius: 28,
          padding: "28px 24px 24px",
          boxShadow: "0 12px 32px rgba(90, 70, 40, 0.15)",
          border: "1px solid #EADFCB",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <div
            style={{
              fontSize: 13,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#A8875F",
              fontWeight: 600,
            }}
          >
            {today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", margin: "8px 0 4px" }}>
          <CatFace mood={mood} />
        </div>

        <div
          style={{
            textAlign: "center",
            fontSize: 20,
            fontWeight: 700,
            color: "#4A3F30",
            margin: "4px 0 2px",
          }}
        >
          {loading
            ? "Réveil du chat…"
            : takenToday
            ? "Bravo, médicament pris !"
            : "Pas encore pris aujourd'hui"}
        </div>
        <div style={{ textAlign: "center", fontSize: 14, color: "#9C8D76", marginBottom: 20 }}>
          {takenToday
            ? "Le chat peut se rendormir tranquille."
            : "Le chat attend son petit rituel du matin."}
        </div>

        <button
          onClick={toggleToday}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 16,
            border: "none",
            fontSize: 16,
            fontWeight: 700,
            cursor: loading ? "default" : "pointer",
            background: takenToday ? "#EFE4D2" : "#D98E4A",
            color: takenToday ? "#4A3F30" : "#FFFDF9",
            transition: "background 0.2s ease",
          }}
        >
          {takenToday ? "↺ Annuler (pas pris finalement)" : "✓ J'ai pris mon médicament"}
        </button>

        {error && (
          <div style={{ color: "#B4472A", fontSize: 13, marginTop: 10, textAlign: "center" }}>
            {error}
          </div>
        )}

        {/* Streak */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            margin: "22px 0 14px",
          }}
        >
          <span style={{ fontSize: 22 }}>🐾</span>
          <span style={{ fontSize: 15, color: "#6B5B41", fontWeight: 600 }}>
            {streak === 0
              ? "Pas encore de série en cours"
              : `${streak} jour${streak > 1 ? "s" : ""} de suite`}
          </span>
        </div>

        {/* 7-day strip */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
          {days.map((d) => {
            const key = toKey(d);
            const done = !!history[key];
            const isToday = key === todayKey;
            return (
              <div
                key={key}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: isToday ? "#B4682A" : "#B0A48D",
                    fontWeight: isToday ? 700 : 500,
                    textTransform: "uppercase",
                  }}
                >
                  {dayLabel(d)}
                </div>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    background: done ? "#D98E4A" : "#EFE9DC",
                    color: done ? "#FFFDF9" : "#C9BEA8",
                    border: isToday ? "2px solid #B4682A" : "2px solid transparent",
                  }}
                >
                  {done ? "🐟" : ""}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
