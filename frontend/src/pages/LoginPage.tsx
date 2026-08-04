import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, User, Lock, Shield, CheckCircle } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   WORLD MAP — drawn to an offscreen mask canvas using Canvas 2D paths, then
   sampled per dot.  Coordinates use a 1000×500 Mercator projection space:
     x = (longitude + 180) / 360 × 1000
     y = (90  − latitude)  / 180 × 500
   ═══════════════════════════════════════════════════════════════════════════ */

const SHAPES: number[][][] = [
  /* North America */
  [[35,198],[70,108],[112,68],[170,52],[224,44],[302,54],[356,74],
   [356,88],[320,100],[358,120],[340,140],[312,156],[284,186],
   [264,202],[258,226],[190,232],[170,214],[168,186],[150,156],
   [148,120],[128,100],[98,90],[68,90]],
  /* South America */
  [[196,234],[166,264],[140,300],[130,350],[148,402],[186,446],
   [218,466],[256,460],[296,436],[304,374],[290,320],[278,266],
   [250,240],[220,232]],
  /* Greenland */
  [[282,22],[322,10],[372,16],[404,36],[404,72],[374,96],
   [324,100],[282,78],[266,50]],
  /* Europe + Scandinavia bump */
  [[448,48],[472,34],[488,22],[510,28],[522,22],[530,42],
   [556,34],[578,48],[576,72],[554,96],[520,112],[500,122],
   [472,112],[448,96],[438,64]],
  /* Africa */
  [[440,142],[428,172],[422,216],[428,268],[450,318],[470,368],
   [504,432],[526,448],[558,432],[590,382],[594,326],[590,274],
   [576,222],[564,172],[554,148],[524,134],[490,134]],
  /* Asia (main landmass) */
  [[578,32],[634,16],[724,16],[824,32],[908,48],[968,68],
   [1000,96],[994,132],[950,168],[920,186],[882,196],[844,220],
   [800,222],[752,210],[730,232],[700,248],[668,236],[650,216],
   [678,188],[680,162],[652,136],[630,112],[628,86],[610,62],[590,42]],
  /* Indian subcontinent */
  [[612,200],[632,186],[652,216],[638,260],[622,272],[602,248],[600,218]],
  /* Southeast Asia peninsula */
  [[702,248],[720,270],[712,302],[692,312],[680,290],[680,262]],
  /* Japan (main island) */
  [[892,140],[902,128],[914,126],[920,140],[912,160],[896,162]],
  /* Australia */
  [[770,298],[820,285],[878,290],[934,312],[958,358],[946,398],
   [916,420],[830,420],[784,398],[758,356],[758,320]],
  /* UK (simplified) */
  [[444,72],[450,58],[462,54],[470,68],[462,82],[450,86]],
  /* Iceland */
  [[424,56],[436,50],[448,54],[446,68],[434,72],[422,66]],
];

/* Build a small offscreen mask once — white = land, black = ocean */
function buildMask(): { px: Uint8ClampedArray; w: number; h: number } {
  const w = 600, h = 300;
  const mc = document.createElement("canvas");
  mc.width = w; mc.height = h;
  const mx = mc.getContext("2d")!;
  mx.fillStyle = "#ffffff";
  SHAPES.forEach(pts => {
    mx.beginPath();
    mx.moveTo(pts[0][0] * w / 1000, pts[0][1] * h / 500);
    for (let i = 1; i < pts.length; i++)
      mx.lineTo(pts[i][0] * w / 1000, pts[i][1] * h / 500);
    mx.closePath();
    mx.fill();
  });
  return { px: mx.getImageData(0, 0, w, h).data, w, h };
}

const LAND_MASK = buildMask();

function isLand(fx: number, fy: number): boolean {
  const px = Math.min(LAND_MASK.w - 1, Math.floor(fx * LAND_MASK.w));
  const py = Math.min(LAND_MASK.h - 1, Math.floor(fy * LAND_MASK.h));
  return LAND_MASK.px[(py * LAND_MASK.w + px) * 4] > 128;
}

/* Render all dots to an offscreen canvas — called once per resize */
function buildDotLayer(W: number, H: number): HTMLCanvasElement {
  const bg = document.createElement("canvas");
  bg.width = W; bg.height = H;
  const bx = bg.getContext("2d")!;
  const sp = 17;
  for (let x = sp / 2; x < W; x += sp) {
    for (let y = sp / 2; y < H; y += sp) {
      const land = isLand(x / W, y / H);
      bx.beginPath();
      bx.arc(x, y, land ? 1.5 : 0.85, 0, Math.PI * 2);
      /* land = silver-gray-blue like the reference; ocean = barely visible */
      bx.fillStyle = land ? "rgba(150,175,208,0.42)" : "rgba(48,68,108,0.09)";
      bx.fill();
    }
  }
  return bg;
}

/* ── Red network nodes — placed on real landmasses ───────────────────────── */
const NODES = [
  { fx: 0.12, fy: 0.37, r: 5, pr: 18 }, // US west coast
  { fx: 0.22, fy: 0.30, r: 4, pr: 14 }, // US east coast
  { fx: 0.20, fy: 0.64, r: 4, pr: 13 }, // South America (Brazil)
  { fx: 0.50, fy: 0.19, r: 5, pr: 16 }, // Western Europe
  { fx: 0.54, fy: 0.50, r: 4, pr: 12 }, // East Africa
  { fx: 0.64, fy: 0.20, r: 6, pr: 20 }, // Middle East / Gulf
  { fx: 0.80, fy: 0.30, r: 5, pr: 16 }, // East Asia (China)
  { fx: 0.90, fy: 0.28, r: 4, pr: 13 }, // Japan
  { fx: 0.84, fy: 0.68, r: 4, pr: 12 }, // Australia
  { fx: 0.59, fy: 0.41, r: 3, pr:  9 }, // India
];

function WorldMapCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dotLayer: HTMLCanvasElement;

    const rebuild = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      dotLayer = buildDotLayer(canvas.width, canvas.height);
    };
    rebuild();
    window.addEventListener("resize", rebuild);

    let raf: number, t = 0;

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      /* 1 — static world-map dots */
      ctx.drawImage(dotLayer, 0, 0);

      /* 2 — animated connecting lines */
      for (let i = 0; i < NODES.length; i++) {
        for (let j = i + 1; j < NODES.length; j++) {
          const a = NODES[i], b = NODES[j];
          const d = Math.hypot(b.fx - a.fx, b.fy - a.fy);
          if (d < 0.42) {
            const alpha = (1 - d / 0.42) * 0.40 * (0.5 + 0.5 * Math.sin(t * 0.85 + i));
            ctx.strokeStyle = `rgba(220,38,38,${alpha})`;
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(a.fx * W, a.fy * H);
            ctx.lineTo(b.fx * W, b.fy * H);
            ctx.stroke();
          }
        }
      }

      /* 3 — red pulsing nodes */
      NODES.forEach((n, i) => {
        const pulse = (Math.sin(t * 1.3 + i * 1.4) + 1) / 2;
        const px = n.fx * W, py = n.fy * H;

        /* outer glow */
        const g = ctx.createRadialGradient(px, py, n.r * 0.4, px, py, n.r + n.pr * pulse);
        g.addColorStop(0, `rgba(220,38,38,${0.26 * (1 - pulse)})`);
        g.addColorStop(1, "rgba(220,38,38,0)");
        ctx.beginPath();
        ctx.arc(px, py, n.r + n.pr * pulse, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();

        /* core dot */
        ctx.beginPath();
        ctx.arc(px, py, n.r, 0, Math.PI * 2);
        ctx.fillStyle = "#dc2626";
        ctx.fill();

        /* bright centre */
        ctx.beginPath();
        ctx.arc(px, py, n.r * 0.42, 0, Math.PI * 2);
        ctx.fillStyle = "#ff5a5a";
        ctx.fill();
      });

      t += 0.016;
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", rebuild); };
  }, []);

  return <canvas ref={ref} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />;
}

/* ── Side info panels ────────────────────────────────────────────────────── */
function ThreatPanel() {
  return (
    <div style={{
      position: "absolute", left: 44, top: "50%", transform: "translateY(-50%)",
      background: "rgba(4,8,18,0.88)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10, padding: "18px 22px", minWidth: 188,
      backdropFilter: "blur(12px)",
    }}>
      <p style={{ color: "#4b5563", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 7 }}>
        Threat Intelligence
      </p>
      <p style={{ color: "#dc2626", fontSize: 13, fontWeight: 800, letterSpacing: "0.04em", marginBottom: 16 }}>HIGH RISK</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {[["Active Scans", "128"], ["Alerts", "24"]].map(([label, val]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 28 }}>
            <span style={{ color: "#6b7280", fontSize: 10.5 }}>{label}</span>
            <span style={{ color: "#d1d5db", fontSize: 10.5, fontWeight: 700 }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemPanel() {
  return (
    <div style={{
      position: "absolute", right: 44, top: "50%", transform: "translateY(-50%)",
      background: "rgba(4,8,18,0.88)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10, padding: "18px 22px", minWidth: 188,
      backdropFilter: "blur(12px)",
    }}>
      <p style={{ color: "#4b5563", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
        System Status
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
        <CheckCircle size={14} color="#10b981" />
        <span style={{ color: "#10b981", fontSize: 13, fontWeight: 800, letterSpacing: "0.05em" }}>SECURE</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {[["Last Update", "2 min ago"], ["Data Sources", "17"]].map(([label, val]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 28 }}>
            <span style={{ color: "#6b7280", fontSize: 10.5 }}>{label}</span>
            <span style={{ color: "#d1d5db", fontSize: 10.5, fontWeight: 700 }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Logo SVG ────────────────────────────────────────────────────────────── */
function ShadowGuardLogo() {
  return (
    <svg width="74" height="84" viewBox="0 0 74 84" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shieldFill" x1="37" y1="3" x2="37" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#280808" />
          <stop offset="1" stopColor="#0c0202" />
        </linearGradient>
        <linearGradient id="figGrad" x1="37" y1="18" x2="37" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff4444" />
          <stop offset="1" stopColor="#aa1111" />
        </linearGradient>
      </defs>
      {/* Shield body */}
      <path d="M37 3L7 16V40C7 58 20 72 37 80C54 72 67 58 67 40V16L37 3Z"
        fill="url(#shieldFill)" stroke="#dc2626" strokeWidth="1.6" />
      {/* Hood outline (wide triangle) */}
      <path d="M37 17 L23 40 L51 40 Z" fill="url(#figGrad)" opacity="0.18" />
      {/* Hood sides */}
      <path d="M24 37 Q24 24 37 20 Q50 24 50 37" fill="url(#figGrad)" opacity="0.7" />
      {/* Face area (dark circle inside hood) */}
      <circle cx="37" cy="32" r="7" fill="#0c0202" />
      <circle cx="37" cy="32" r="5.5" fill="#1a0404" />
      {/* Eyes */}
      <ellipse cx="34" cy="32" rx="1.2" ry="1.4" fill="#dc2626" opacity="0.9" />
      <ellipse cx="40" cy="32" rx="1.2" ry="1.4" fill="#dc2626" opacity="0.9" />
      {/* Shoulders / body base */}
      <path d="M22 55 Q22 45 37 43 Q52 45 52 55" fill="url(#figGrad)" opacity="0.72" />
      {/* Hood peak */}
      <path d="M37 18 L32 26 L42 26 Z" fill="#dc2626" opacity="0.55" />
    </svg>
  );
}

/* ── Custom checkbox ─────────────────────────────────────────────────────── */
function Checkbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 17, height: 17, borderRadius: 3, flexShrink: 0, cursor: "pointer",
        border: `1.5px solid ${checked ? "#dc2626" : "rgba(255,255,255,0.22)"}`,
        background: checked ? "#dc2626" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s",
      }}
    >
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

/* ── Input field ─────────────────────────────────────────────────────────── */
function InputField({
  type, value, onChange, placeholder, icon, rightSlot,
}: {
  type: string; value: string; onChange: (v: string) => void;
  placeholder: string; icon: React.ReactNode; rightSlot?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <div style={{
        position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
        color: focused ? "#9ca3af" : "#4b5563", pointerEvents: "none", transition: "color 0.15s",
      }}>
        {icon}
      </div>
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: `14px ${rightSlot ? "44px" : "14px"} 14px 44px`,
          background: "rgba(12,20,38,0.85)",
          border: `1px solid ${focused ? "rgba(220,38,38,0.5)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 8, color: "#e5e7eb", fontSize: 13,
          outline: "none", transition: "border-color 0.2s",
        }}
        placeholder-color="#4b5563"
      />
      {rightSlot && (
        <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)" }}>
          {rightSlot}
        </div>
      )}
    </div>
  );
}

/* ── Main Login Page ─────────────────────────────────────────────────────── */
export default function LoginPage() {
  const [username, setUsername] = useState(() => {
    try { return localStorage.getItem("sg_remember_user") || ""; } catch { return ""; }
  });
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try { return !!localStorage.getItem("sg_remember_user"); } catch { return false; }
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState("");
  const [ssoMsg, setSsoMsg] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSsoMsg("");
    setLoading(true);
    try {
      await login({ username, password });
      if (rememberMe) {
        try { localStorage.setItem("sg_remember_user", username); } catch {}
      } else {
        try { localStorage.removeItem("sg_remember_user"); } catch {}
      }
      navigate("/dashboard");
    } catch {
      setError("Invalid analyst credentials. Verify your username and password.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = () => {
    setForgotMsg("Password reset instructions sent to your registered email.");
    setTimeout(() => setForgotMsg(""), 5000);
  };

  const handleSSO = () => {
    setSsoMsg("SSO requires your organisation's identity provider. Contact your system administrator.");
    setTimeout(() => setSsoMsg(""), 5000);
  };

  return (
    <div style={{
      minHeight: "100vh", width: "100%",
      background: "#070c17",
      position: "relative", overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <WorldMapCanvas />
      <ThreatPanel />
      <SystemPanel />

      {/* Centre column */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* ── Logo + wordmark ── */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <ShadowGuardLogo />
          </div>
          <div style={{ fontSize: 27, fontWeight: 900, letterSpacing: "0.07em", lineHeight: 1, marginBottom: 6 }}>
            <span style={{ color: "#ffffff" }}>SHADOW</span>
            <span style={{ color: "#dc2626" }}>GUARD</span>
          </div>
          <div style={{ color: "#6b7280", fontSize: 12.5, letterSpacing: "0.04em" }}>
            Financial Intelligence Platform
          </div>
        </div>

        {/* ── Card ── */}
        <div style={{
          width: 460, padding: "30px 34px 34px",
          background: "rgba(6,11,24,0.93)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 14,
          backdropFilter: "blur(18px)",
          boxShadow: "0 28px 64px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(255,255,255,0.04)",
        }}>
          {/* Card title */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, marginBottom: 26 }}>
            <Shield size={15} color="#6b7280" />
            <span style={{ color: "#d1d5db", fontSize: 13, fontWeight: 700, letterSpacing: "0.14em" }}>
              ANALYST LOGIN
            </span>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Username */}
            <InputField
              type="text" value={username} onChange={setUsername}
              placeholder="Username" icon={<User size={15} />}
            />

            {/* Password */}
            <InputField
              type={showPass ? "text" : "password"} value={password} onChange={setPassword}
              placeholder="Password" icon={<Lock size={15} />}
              rightSlot={
                <button type="button" onClick={() => setShowPass(p => !p)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#4b5563", padding: 0, display: "flex", alignItems: "center",
                }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />

            {/* Remember me + Forgot */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <Checkbox checked={rememberMe} onChange={setRememberMe} />
                <span style={{ color: "#9ca3af", fontSize: 12.5 }}>Remember me</span>
              </label>
              <button type="button" onClick={handleForgot} style={{
                background: "none", border: "none", cursor: "pointer",
                color: forgotMsg ? "#10b981" : "#dc2626", fontSize: 12.5, padding: 0, fontFamily: "inherit",
                transition: "color 0.2s",
              }}>
                {forgotMsg ? "Reset link sent ✓" : "Forgot password?"}
              </button>
            </div>

            {/* Forgot message */}
            {forgotMsg && (
              <p style={{ color: "#10b981", fontSize: 10.5, textAlign: "center", lineHeight: 1.4 }}>{forgotMsg}</p>
            )}

            {/* Error */}
            {error && (
              <p style={{ color: "#ef4444", fontSize: 11, textAlign: "center", lineHeight: 1.4 }}>{error}</p>
            )}

            {/* Sign In */}
            <button
              type="submit" disabled={loading}
              style={{
                marginTop: 6, width: "100%", padding: "14px 0",
                background: loading
                  ? "rgba(120,20,20,0.45)"
                  : "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                border: "none", borderRadius: 8,
                color: "white", fontSize: 14, fontWeight: 700, letterSpacing: "0.04em",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: loading ? "none" : "0 4px 24px rgba(220,38,38,0.4)",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
            >
              {loading ? "Authenticating…" : (<>Sign In <span style={{ fontSize: 17, lineHeight: 1 }}>→</span></>)}
            </button>

            {/* OR divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
              <span style={{ color: "#374151", fontSize: 11, fontWeight: 500 }}>OR</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
            </div>

            {/* SSO button */}
            <button
              type="button" onClick={handleSSO}
              style={{
                width: "100%", padding: "13px 0",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.11)",
                borderRadius: 8, cursor: "pointer",
                color: "#9ca3af", fontSize: 13, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
                transition: "border-color 0.18s, color 0.18s",
                fontFamily: "inherit",
              }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "rgba(255,255,255,0.28)"; b.style.color = "#e5e7eb"; }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "rgba(255,255,255,0.11)"; b.style.color = "#9ca3af"; }}
            >
              <Shield size={14} />
              Sign in with SSO
            </button>

            {/* SSO info */}
            {ssoMsg && (
              <p style={{ color: "#6b7280", fontSize: 10.5, textAlign: "center", lineHeight: 1.5 }}>{ssoMsg}</p>
            )}

          </form>
        </div>

        {/* ── Footer ── */}
        <div style={{ marginTop: 26, textAlign: "center" }}>
          <p style={{ color: "#6b7280", fontSize: 12.5, marginBottom: 5, letterSpacing: "0.02em" }}>
            Secure. Intelligent.{" "}
            <span style={{ color: "#dc2626", fontWeight: 600 }}>Proactive.</span>
          </p>
          <p style={{ color: "#374151", fontSize: 10 }}>© 2026 SHADOWGUARD. All rights reserved.</p>
        </div>

      </div>
    </div>
  );
}
