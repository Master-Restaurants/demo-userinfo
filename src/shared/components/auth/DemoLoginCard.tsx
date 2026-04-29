"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

/**
 * Demo-Login-Karte: ein einziger Button "Demo betreten" für Recruiter / Bewerbung.
 * Ein Klick → POST /api/demo/login (setzt Cookie) → Redirect auf `/`.
 */
export function DemoLoginCard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleEnterDemo() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/demo/login", {
        method: "POST",
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Demo-Login fehlgeschlagen."
      );
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-xl backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Master Dashboard
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Multi-Marktplatz E-Commerce-Steuerung
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <strong className="font-semibold">Demo-Modus aktiv.</strong> Alle
          Daten sind fiktiv und werden nur zur Anschauung angezeigt. Klicks auf
          „Speichern" oder „Sync" sind ohne Wirkung.
        </div>

        <p className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Das Master Dashboard verwaltet Bestellungen, Produkte und Analytik
          über 9 Marktplätze (Amazon, eBay, Otto, Kaufland, Fressnapf,
          MediaMarkt-Saturn, Zooplus, Shopify, TikTok) sowie Xentral-ERP — in
          einer einheitlichen Oberfläche.
        </p>

        <button
          type="button"
          onClick={handleEnterDemo}
          disabled={isLoading}
          className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:shadow-xl hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Demo wird gestartet…
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Demo betreten
            </>
          )}
        </button>

        {errorMessage && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
            {errorMessage}
          </p>
        )}

        <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Was Sie sehen werden
          </h2>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-500" />
              Cross-Marketplace Analytics (Umsatz, Profit, Retouren)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-500" />
              Bestellungs- und Produkt-Listen je Marktplatz
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-500" />
              KI-gestützte Bedarfsprognose (Article-Forecast)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-500" />
              Rollensystem, Tutorials, Dark-Mode, 3 Sprachen
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
