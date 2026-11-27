"use client";
// Raum-Tab: 3D-Raum mit Einrichten-Modus. Möbel aus dem Katalog holen, antippen, verschieben, drehen, wegräumen.
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useStore, emptyProfile } from "@/lib/store/store";
import type { Look } from "@/lib/dartraum/catalog";
import {
  FURNITURE, FURNITURE_BY_ID, FURNITURE_CATS, LAYOUT_PRESETS, ROOM_STYLES, canPlace, findSpot, normalizeLayout,
  type FurnitureCat, type Placed,
} from "@/lib/dartraum/furniture";
import { Card, cx } from "@/components/ui";

const Room3D = dynamic(() => import("@/components/dartraum/Room3D").then((m) => m.Room3D), {
  ssr: false,
  loading: () => <div className="grid aspect-[4/3] place-items-center rounded-3xl border border-line text-muted sm:aspect-[16/10]">3D-Raum wird geladen …</div>,
});

const PATH_BADGE = { fluencer: { label: "Dartfluencer", cls: "border-cyan/50 text-cyan" }, profi: { label: "Profi", cls: "border-[#e8c25a]/60 text-[#f3d77f]" } } as const;

export function RoomTab({ pid, look, name, trophies, medals }: { pid: string; look: Look; name: string; trophies: number; medals: number }) {
  const profile = useStore((s) => s.dartraum[pid]) ?? emptyProfile();
  const setLayout = useStore((s) => s.setLayout);
  const setRoom = useStore((s) => s.setRoom);
  const stored = useMemo(() => normalizeLayout(profile.layout), [profile.layout]);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [cat, setCat] = useState<FurnitureCat>("sitzen");
  const [note, setNote] = useState<string | null>(null);

  // Neue Spieler starten mit dem Grundraum
  useEffect(() => {
    if (!stored) setLayout(pid, LAYOUT_PRESETS[0].make());
  }, [stored, pid, setLayout]);
  const layout = useMemo(() => stored ?? [], [stored]);
  const style = Math.min(4, Math.max(0, profile.room ?? 0));
  const sel = layout.find((p) => p.uid === selected) ?? null;
  const selDef = sel ? FURNITURE_BY_ID.get(sel.id) : undefined;

  const flash = (t: string) => { setNote(t); window.setTimeout(() => setNote((n) => (n === t ? null : n)), 2600); };
  const save = (next: Placed[]) => setLayout(pid, next);

  const add = (id: string) => {
    const def = FURNITURE_BY_ID.get(id)!;
    if (def.fixed) {
      const has = layout.find((p) => p.id === id);
      save(has ? layout.filter((p) => p.id !== id) : [...layout, { uid: `fx-${id}`, id, x: 0, z: 0, rot: 0 }]);
      return;
    }
    const p = findSpot(id, layout);
    if (!p) { flash("Dafür ist gerade kein Platz mehr frei. Räum etwas weg."); return; }
    save([...layout, p]); setSelected(p.uid);
  };
  const rotate = () => {
    if (!sel || !selDef) return;
    // Wandmöbel wechseln die Wand, Bodenmöbel drehen sich um 90 Grad
    const tries: Placed[] = selDef.wall
      ? [sel.rot % 2 === 0 ? { ...sel, rot: 1, x: 0, z: Math.max(0.75, sel.x) } : { ...sel, rot: 0, z: 0, x: Math.max(0.75, sel.z) }]
      : [1, 2, 3].map((k) => ({ ...sel, rot: (sel.rot + k) % 4 }));
    const ok = tries.find((p) => canPlace(p, layout));
    if (!ok) { flash("Gedreht passt es hier nicht hin. Schieb es erst etwas weg."); return; }
    save(layout.map((p) => (p.uid === sel.uid ? ok : p)));
  };
  const remove = () => { if (!sel) return; save(layout.filter((p) => p.uid !== sel.uid)); setSelected(null); };
  const preset = (id: string) => {
    const pr = LAYOUT_PRESETS.find((x) => x.id === id)!;
    save(pr.make()); setRoom(pid, pr.style); setSelected(null);
  };

  const count = (id: string) => layout.filter((p) => p.id === id).length;
  const shown = FURNITURE.filter((f) => f.cat === cat);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Room3D level={style} layout={layout} look={look} name={name} trophies={trophies} medals={medals}
          editing={editing} selected={selected} onSelect={setSelected}
          onMove={(p) => save(layout.map((x) => (x.uid === p.uid ? p : x)))} />
        {editing && sel && selDef && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/15 bg-black/70 p-1.5 text-sm backdrop-blur">
            <span className="px-2 font-display uppercase">{selDef.name}</span>
            <button className="rounded-xl bg-white/10 px-3 py-2 font-semibold active:scale-95" onClick={rotate}>{selDef.wall ? "Andere Wand" : "Drehen"}</button>
            <button className="rounded-xl bg-[#ff3b5c]/20 px-3 py-2 font-semibold text-[#ff8da0] active:scale-95" onClick={remove}>Wegräumen</button>
          </div>
        )}
        {note && <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-xl bg-black/80 px-4 py-2 text-sm">{note}</div>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => { setEditing((e) => !e); setSelected(null); }}
          className={cx("rounded-2xl px-5 py-3 font-display text-lg uppercase transition active:scale-95", editing ? "bg-pink text-white" : "border border-pink/60 bg-pink/10 text-pink")}>
          {editing ? "Fertig" : "Einrichten"}
        </button>
        <p className="text-sm text-muted">{editing ? "Möbel antippen und mit dem Finger verschieben. Grün heißt: passt." : "Dein Spieler wirft, holt die Pfeile und benutzt die Möbel, die du aufstellst."}</p>
      </div>

      {editing && (
        <>
          <Card>
            <div className="mb-3 flex flex-wrap gap-2">
              {FURNITURE_CATS.map((c) => (
                <button key={c.id} onClick={() => setCat(c.id)}
                  className={cx("rounded-full border px-3 py-1.5 text-sm font-semibold transition active:scale-95", cat === c.id ? "border-pink bg-pink/15 text-white" : "border-line text-muted")}>{c.name}</button>
              ))}
            </div>
            {(cat === "fluencer" || cat === "profi") && (
              <p className="mb-3 text-sm text-muted">{cat === "fluencer" ? "Werde Dartfluencer: Bau dir ein Streaming-Setup mit Kamera, Licht und Monitoren." : "Geh Richtung Profi: Bühne, Scheinwerfer und Sponsorenwand fürs Training wie auf der Tour."}</p>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {shown.map((f) => {
                const n = count(f.id);
                const on = f.fixed && n > 0;
                return (
                  <button key={f.id} onClick={() => add(f.id)}
                    className={cx("rounded-xl border p-3 text-left transition active:scale-95", on ? "border-pink bg-pink/15" : "border-line bg-surface-2/60 hover:border-white/30")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-display text-base uppercase leading-tight">{f.name}</div>
                      {f.path && <span className={cx("shrink-0 rounded-full border px-1.5 text-[10px] uppercase tracking-wider", PATH_BADGE[f.path].cls)}>{PATH_BADGE[f.path].label}</span>}
                    </div>
                    {f.desc && <div className="mt-1 text-xs text-muted">{f.desc}</div>}
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="text-[#f3d77f]/70">{f.price ? `später ${f.price.toLocaleString("de-DE")} C` : "gratis"}</span>
                      <span className="text-muted">{f.fixed ? (on ? "an · antippen zum Abbauen" : "aus") : n ? `${n}× im Raum · + noch eins` : "+ aufstellen"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="mb-3 text-xs uppercase tracking-widest text-muted">Raum-Stil (Wände und Boden)</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {ROOM_STYLES.map((r) => (
                <button key={r.id} onClick={() => setRoom(pid, r.id)}
                  className={cx("rounded-xl border px-3 py-2 text-left transition active:scale-95", r.id === style ? "border-pink bg-pink/15" : "border-line bg-surface-2/60")}>
                  <div className="font-display text-lg uppercase leading-tight">{r.name}</div>
                  <div className="text-xs text-muted">{r.desc}</div>
                  {r.price > 0 && <div className="text-xs text-[#f3d77f]/70">später {r.price.toLocaleString("de-DE")} C</div>}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div className="mb-1 text-xs uppercase tracking-widest text-muted">Vorlagen</div>
            <p className="mb-3 text-sm text-muted">Ersetzt deinen jetzigen Aufbau. Danach kannst du alles wieder umstellen.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {LAYOUT_PRESETS.map((p) => (
                <button key={p.id} onClick={() => preset(p.id)} className="rounded-xl border border-line bg-surface-2/60 px-3 py-2 text-left transition active:scale-95">
                  <div className="font-display text-lg uppercase leading-tight">{p.name}</div>
                  <div className="text-xs text-muted">{p.desc}</div>
                </button>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
