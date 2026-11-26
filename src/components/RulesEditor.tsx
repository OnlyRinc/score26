"use client";
import { useState } from "react";
import type { InRule, MatchFormat, OutRule, PlayerRules } from "@/lib/game";
import { Segmented, Stepper, inputCls } from "./ui";

export const IN_LABEL: Record<InRule, string> = { straight: "Straight In", double: "Double In" };
export const OUT_LABEL: Record<OutRule, string> = { single: "Single Out", double: "Double Out", master: "Master Out" };

export function ScoreSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const presets = [301, 501, 701];
  const [custom, setCustom] = useState(!presets.includes(value));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented
        value={custom ? -1 : value}
        options={[...presets.map((p) => ({ value: p, label: String(p) })), { value: -1, label: "Frei" }]}
        onChange={(v) => { if (v === -1) setCustom(true); else { setCustom(false); onChange(v); } }}
      />
      {custom && (
        <input
          type="number" inputMode="numeric" min={2} max={9999}
          className={inputCls + " !w-28 !py-2"}
          value={value}
          onChange={(e) => onChange(Math.max(2, Math.min(9999, parseInt(e.target.value || "0", 10) || 0)))}
        />
      )}
    </div>
  );
}

export function RulesEditor({ value, onChange, compact }: { value: PlayerRules; onChange: (v: PlayerRules) => void; compact?: boolean }) {
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <Row label="Startpunkte"><ScoreSelect value={value.startScore} onChange={(startScore) => onChange({ ...value, startScore })} /></Row>
      <Row label="In">
        <Segmented value={value.inRule} options={(["straight", "double"] as InRule[]).map((v) => ({ value: v, label: IN_LABEL[v] }))} onChange={(inRule) => onChange({ ...value, inRule })} />
      </Row>
      <Row label="Out">
        <Segmented value={value.outRule} options={(["single", "double", "master"] as OutRule[]).map((v) => ({ value: v, label: OUT_LABEL[v] }))} onChange={(outRule) => onChange({ ...value, outRule })} />
      </Row>
    </div>
  );
}

export function FormatEditor({ value, onChange }: { value: MatchFormat; onChange: (v: MatchFormat) => void }) {
  const setPlay = value.sets > 1;
  return (
    <div className="space-y-3">
      <Row label="Modus">
        <Segmented value={setPlay ? "sets" : "legs"} options={[{ value: "legs", label: "Legs" }, { value: "sets", label: "Sets" }]}
          onChange={(m) => onChange({ ...value, sets: m === "sets" ? Math.max(3, value.sets) : 1 })} />
      </Row>
      {setPlay && (
        <Row label="Sets (Best of)">
          <Stepper value={value.sets} min={1} max={25} step={2} onChange={(sets) => onChange({ ...value, sets })} />
          <span className="text-sm text-muted">= {Math.floor(value.sets / 2) + 1} Sets zum Sieg</span>
        </Row>
      )}
      <Row label={setPlay ? "Legs pro Set (Best of)" : "Legs (Best of)"}>
        <Stepper value={value.legs} min={1} max={41} step={2} onChange={(legs) => onChange({ ...value, legs })} />
        <span className="text-sm text-muted">= {Math.floor(value.legs / 2) + 1} Legs zum {setPlay ? "Set" : "Sieg"}</span>
      </Row>
    </div>
  );
}

export function formatLabel(f: MatchFormat): string {
  return f.sets > 1 ? `Best of ${f.sets} Sets (je Bo${f.legs} Legs)` : `Best of ${f.legs} Legs`;
}
export function rulesLabel(r: PlayerRules): string {
  return `${r.startScore} · ${IN_LABEL[r.inRule]} · ${OUT_LABEL[r.outRule]}`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="w-40 shrink-0 text-sm font-medium text-muted">{label}</div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
