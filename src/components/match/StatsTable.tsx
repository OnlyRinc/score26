"use client";
import type { MatchPlayer, PlayerStats } from "@/lib/game";

export function StatsTable({ players, stats }: { players: MatchPlayer[]; stats: PlayerStats[] }) {
  const rows: [string, (s: PlayerStats) => string][] = [
    ["3-Dart-Average", (s) => s.average.toFixed(2)],
    ["First-9-Average", (s) => s.first9Average.toFixed(2)],
    ["Höchste Aufnahme", (s) => String(s.highestVisit)],
    ["100+", (s) => String(s.count100)],
    ["140+", (s) => String(s.count140)],
    ["180", (s) => String(s.count180)],
    ["Checkout-Quote", (s) => (s.dartsAtDouble ? `${(s.checkoutRate * 100).toFixed(0)} % (${s.checkouts}/${s.dartsAtDouble})` : s.checkouts ? `${s.checkouts} Checkouts` : "–")],
    ["Höchstes Finish", (s) => (s.highestFinish ? String(s.highestFinish) : "–")],
    ["Bestes Leg (Darts)", (s) => (s.bestLeg ? String(s.bestLeg) : "–")],
    ["Short Legs (≤15 Darts)", (s) => String(s.shortLegs)],
    ["Darts geworfen", (s) => String(s.darts)],
  ];
  return (
    <table className="w-full text-left tabular">
      <thead>
        <tr className="border-b border-line">
          <th className="py-2" />
          {players.map((p, i) => <th key={i} className="py-2 text-right font-display text-xl uppercase">{p.nickname}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, f]) => (
          <tr key={label} className="border-b border-line/50">
            <td className="py-2 text-muted">{label}</td>
            {stats.map((s, i) => <td key={i} className="py-2 text-right text-lg font-semibold">{f(s)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
