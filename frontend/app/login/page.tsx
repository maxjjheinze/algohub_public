"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Activity, Lock } from "lucide-react";
import { cn } from "../../lib/utils";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("Invalid password");
        setPassword("");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 200, damping: 24 }}
        className={cn(
          "w-full max-w-sm p-8 rounded-2xl",
          "bg-surface border border-white/[0.06]",
          "shadow-card backdrop-blur-xl"
        )}
      >
        {/* Branding */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <motion.div
            initial={{ scale: 0.5, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 200 }}
            className="relative"
          >
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center border border-accent/20">
              <Activity className="h-6 w-6 text-accent" />
            </div>
            <div className="absolute -inset-1 rounded-xl bg-accent/10 blur-lg -z-10 animate-glow-breathe" />
          </motion.div>
          <h1 className="text-xl font-bold tracking-[0.12em] uppercase text-white">
            Algo<span className="text-accent ml-0.5">Hub</span>
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className={cn(
                "w-full pl-10 pr-4 py-3 rounded-xl",
                "bg-background/60 border border-white/[0.06]",
                "text-sm text-slate-200 placeholder:text-slate-600",
                "focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20",
                "transition-colors duration-200"
              )}
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm text-secondary"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={loading || !password}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "w-full py-3 rounded-xl font-medium text-sm",
              "bg-gradient-to-r from-accent/90 to-accentMuted/80",
              "text-background",
              "shadow-neon-soft hover:shadow-neon-strong",
              "border border-accent/30",
              "transition-shadow duration-500",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-neon-soft"
            )}
          >
            {loading ? "Signing in..." : "Sign in"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
