import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0A",
        surface: "rgba(14,14,14,0.82)",
        surfaceSolid: "#0E0E0E",
        surfaceHover: "rgba(18,18,18,0.95)",
        accent: "#F59E42",
        accentMuted: "#D4882F",
        accentSoft: "rgba(245,158,66,0.12)",
        secondary: "#FB7185",
        secondarySoft: "rgba(251,113,133,0.12)",
        positive: "#D4A843",
        positiveSoft: "rgba(212,168,67,0.12)",
        negative: "#94A3B8",
        negativeSoft: "rgba(148,163,184,0.12)",
        dim: "#3a3f4b"
      },
      fontFamily: {
        sans: ["var(--font-space-grotesk)", "system-ui", "sans-serif"]
      },
      fontSize: {
        "hero": ["2.75rem", { lineHeight: "1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "hero-sm": ["2rem", { lineHeight: "1", letterSpacing: "-0.02em", fontWeight: "700" }]
      },
      boxShadow: {
        "neon-soft": "0 0 30px rgba(245,158,66,0.12), 0 0 60px rgba(245,158,66,0.05)",
        "neon-strong": "0 0 20px rgba(245,158,66,0.3), 0 0 60px rgba(245,158,66,0.12), 0 0 100px rgba(245,158,66,0.05)",
        "neon-magenta": "0 0 30px rgba(251,113,133,0.2), 0 0 60px rgba(251,113,133,0.08)",
        "neon-selected": "0 0 15px rgba(245,158,66,0.35), 0 0 40px rgba(245,158,66,0.1), inset 0 1px 0 rgba(245,158,66,0.15)",
        "card": "0 1px 0 rgba(255,255,255,0.03), 0 8px 40px rgba(0,0,0,0.4)",
        "card-hover": "0 1px 0 rgba(255,255,255,0.05), 0 12px 50px rgba(0,0,0,0.5), 0 0 30px rgba(245,158,66,0.08)"
      },
      backgroundImage: {
        "glow-top": "radial-gradient(ellipse 60% 40% at 50% -10%, rgba(245,158,66,0.08) 0%, transparent 70%)",
        "glow-card": "radial-gradient(ellipse 100% 80% at 50% -20%, rgba(245,158,66,0.06) 0%, transparent 60%)"
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow-breathe": "glow-breathe 3s ease-in-out infinite"
      },
      keyframes: {
        "glow-breathe": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" }
        }
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px"
      }
    }
  },
  plugins: []
};

export default config;
