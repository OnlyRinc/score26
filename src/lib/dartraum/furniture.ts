// Möbel-Baukasten für den Dartraum: was es gibt, wo es steht, ob es passt.
// Reine Daten und Rechenregeln, ohne 3D. Gebaut werden die Möbel in components/dartraum/three/items.ts.

/** Raum ist 8 x 8 Meter, Board an der hinteren Wand (z = 0) bei x = 4, Abwurflinie bei z = 2.37 */
export const ROOM_SIZE = 8;
/** Wurfbahn vor dem Board: dort darf nichts stehen */
export const LANE = { x0: 3.1, x1: 4.9, z0: 0, z1: 3.25 };

export type FurniturePath = "fluencer" | "profi";
export type FurnitureCat = "sitzen" | "tische" | "deko" | "wand" | "board" | "fluencer" | "profi";

/** Was die Figur an einem Möbel tun kann. dx/dz: Standpunkt relativ zum Möbel (vor der Drehung), face: Blickrichtung relativ */
/** approach: Punkt (relativ), über den die Figur hinläuft, damit sie nicht durchs Möbel geht */
export interface FurnitureUse { kind: "sit" | "desk" | "drink"; dx: number; dz: number; face: number; lift: number; approach: [number, number] }

export interface FurnitureDef {
  id: string;
  name: string;
  cat: FurnitureCat;
  /** Preis in Coins, gilt erst außerhalb des Testmodus */
  price: number;
  path?: FurniturePath;
  desc?: string;
  /** Grundfläche in Metern, Breite (x) und Tiefe (z), vor der Drehung */
  w: number;
  d: number;
  /** Hängt an der Wand statt auf dem Boden zu stehen */
  wall?: boolean;
  /** Flach am Boden (Teppich): darf unter anderen Möbeln liegen */
  flat?: boolean;
  /** Gehört fest zum Board, wird nur an- oder abgeschaltet */
  fixed?: boolean;
  use?: FurnitureUse;
}

const P = Math.PI;
export const FURNITURE: FurnitureDef[] = [
  // Sitzen
  { id: "couch", name: "Couch", cat: "sitzen", price: 400, w: 2.25, d: 1.2, use: { kind: "sit", dx: 0, dz: 0.52, face: 0, lift: 0.09, approach: [0, 1.15] } },
  { id: "armchair", name: "Sessel", cat: "sitzen", price: 220, w: 1.35, d: 1.2, use: { kind: "sit", dx: 0, dz: 0.52, face: 0, lift: 0.09, approach: [0, 1.15] } },
  { id: "chair", name: "Holzstuhl", cat: "sitzen", price: 60, w: 0.6, d: 0.65, use: { kind: "desk", dx: 0, dz: 0.2, face: 0, lift: 0.02, approach: [0, 0.8] } },
  { id: "stool", name: "Alter Hocker", cat: "sitzen", price: 0, w: 0.45, d: 0.45 },
  { id: "barstool", name: "Barhocker", cat: "sitzen", price: 80, w: 0.45, d: 0.45 },
  // Tische
  { id: "coffeetable", name: "Couchtisch", cat: "tische", price: 120, w: 1.44, d: 0.9 },
  { id: "sidetable", name: "Kommode", cat: "tische", price: 140, w: 0.6, d: 0.6 },
  { id: "sideboard", name: "Sideboard", cat: "tische", price: 220, w: 1.5, d: 0.75 },
  { id: "bar", name: "Bar", cat: "tische", price: 600, w: 1.4, d: 1.55, desc: "Mit Getränken. Dein Spieler holt sich hier was.", use: { kind: "drink", dx: 0, dz: 1.15, face: P, lift: 0, approach: [0, 1.5] } },
  // Deko und Licht
  { id: "plant", name: "Kaktus groß", cat: "deko", price: 0, w: 0.7, d: 0.7 },
  { id: "plant_small", name: "Kaktus klein", cat: "deko", price: 30, w: 0.4, d: 0.4 },
  { id: "lamp", name: "Stehlampe", cat: "deko", price: 90, w: 0.6, d: 0.6 },
  { id: "crates", name: "Kisten", cat: "deko", price: 0, w: 0.9, d: 0.9 },
  { id: "rug", name: "Teppich gestreift", cat: "deko", price: 100, w: 2.7, d: 1.8, flat: true },
  { id: "rug_oval", name: "Teppich oval", cat: "deko", price: 100, w: 2.5, d: 1.7, flat: true },
  { id: "rug_blue", name: "Teppich blau", cat: "deko", price: 100, w: 2.7, d: 1.8, flat: true },
  // Wand
  { id: "chalkboard", name: "Kreidetafel", cat: "wand", price: 0, w: 1.2, d: 0.1, wall: true },
  { id: "poster", name: "Poster 180", cat: "wand", price: 40, w: 0.6, d: 0.05, wall: true },
  { id: "neon", name: "Club26-Neon", cat: "wand", price: 300, w: 2.1, d: 0.1, wall: true },
  { id: "shelf", name: "Wandregal", cat: "wand", price: 90, w: 1.5, d: 0.4, wall: true },
  { id: "tv", name: "Großbildschirm", cat: "wand", price: 500, w: 2.3, d: 0.1, wall: true },
  { id: "window", name: "Kellerfenster", cat: "wand", price: 0, w: 1.0, d: 0.05, wall: true },
  // Board
  { id: "surround", name: "Auffangring", cat: "board", price: 80, w: 0, d: 0, fixed: true, desc: "Schwarzer Ring ums Board." },
  { id: "mat", name: "Dartmatte", cat: "board", price: 120, w: 0, d: 0, fixed: true, desc: "Matte bis zur Abwurflinie." },
  { id: "cabinet", name: "Dartkabinett", cat: "board", price: 250, w: 0, d: 0, fixed: true, desc: "Holzschrank mit Kreidetafeln." },
  { id: "ledring", name: "LED-Ring", cat: "board", price: 350, w: 0, d: 0, fixed: true, desc: "Schattenfreies Licht wie bei den Profis." },
  // Dartfluencer
  { id: "streamdesk", name: "Streaming-Schreibtisch", cat: "fluencer", path: "fluencer", price: 900, w: 1.9, d: 1.9, desc: "Zwei Monitore, Tastatur, Mikro und Stuhl.", use: { kind: "desk", dx: 0, dz: 0.52, face: P, lift: 0.02, approach: [0.8, 0.52] } },
  { id: "camera", name: "Kamera mit Stativ", cat: "fluencer", path: "fluencer", price: 400, w: 0.6, d: 0.6 },
  { id: "ringlight", name: "Ringlicht", cat: "fluencer", path: "fluencer", price: 250, w: 0.5, d: 0.5 },
  { id: "foam", name: "Akustikschaum", cat: "fluencer", path: "fluencer", price: 150, w: 2.0, d: 0.1, wall: true },
  { id: "onair", name: "ON-AIR-Schild", cat: "fluencer", path: "fluencer", price: 120, w: 0.9, d: 0.05, wall: true },
  { id: "led", name: "LED-Leisten", cat: "fluencer", path: "fluencer", price: 200, w: 0, d: 0, fixed: true, desc: "Leuchtleisten an Boden und Decke." },
  // Profi
  { id: "stage", name: "Trainingsbühne", cat: "profi", path: "profi", price: 1500, w: 0, d: 0, fixed: true, desc: "Podest von der Wand bis hinter die Abwurflinie." },
  { id: "spots", name: "Scheinwerfer", cat: "profi", path: "profi", price: 600, w: 0, d: 0, fixed: true, desc: "Zwei Bühnenscheinwerfer auf die Wurfbahn." },
  { id: "sponsorwall", name: "Sponsorenwand", cat: "profi", path: "profi", price: 700, w: 0, d: 0, fixed: true, desc: "Logo-Wand hinter dem Board." },
  { id: "scoreboard", name: "Score-Anzeige", cat: "profi", path: "profi", price: 450, w: 1.4, d: 0.08, wall: true },
];
export const FURNITURE_BY_ID = new Map(FURNITURE.map((f) => [f.id, f]));

export const FURNITURE_CATS: { id: FurnitureCat; name: string }[] = [
  { id: "sitzen", name: "Sitzen" }, { id: "tische", name: "Tische & Bar" }, { id: "deko", name: "Deko & Licht" }, { id: "wand", name: "Wand" },
  { id: "board", name: "Board" }, { id: "fluencer", name: "Dartfluencer" }, { id: "profi", name: "Profi" },
];

/**
 * Ein aufgestelltes Möbel. Boden: x/z ist die Mitte, rot sind Vierteldrehungen (0 = Vorderseite zeigt in den Raum nach +z).
 * Wand: rot 0 = hintere Wand (x ist die Position), rot 1 = linke Wand (z ist die Position).
 */
export interface Placed { uid: string; id: string; x: number; z: number; rot: number }

/** Raum-Stile (Wände und Boden). Früher die Ausbaustufen. */
export const ROOM_STYLES = [
  { id: 0, name: "Keller", price: 0, desc: "Beton und Ziegel, eine Glühbirne." },
  { id: 1, name: "Hobbyraum", price: 300, desc: "Helle Wände, Holzboden und Vertäfelung." },
  { id: 2, name: "Lounge", price: 800, desc: "Lila Wandpaneele und dunkles Holz." },
  { id: 3, name: "Studio", price: 1500, desc: "Dunkle Wände, Fliesen, kühles Licht." },
  { id: 4, name: "Arena", price: 3000, desc: "Schwarz wie auf der großen Bühne." },
] as const;

let uidCounter = 0;
export const newUid = () => `f${Date.now().toString(36)}${(uidCounter++).toString(36)}`;
const item = (id: string, x: number, z: number, rot = 0): Placed => ({ uid: newUid(), id, x, z, rot });

/** Vorlagen: der Grundraum zum Start und Beispiele für beide Wege */
export const LAYOUT_PRESETS: { id: string; name: string; style: number; desc: string; make: () => Placed[] }[] = [
  {
    id: "start", name: "Grundraum", style: 0, desc: "Damit fängt jeder an.",
    make: () => [item("plant", 0.5, 0.5), item("stool", 2.2, 5.0), item("crates", 6.6, 6.6), item("chalkboard", 0, 2.2, 1), item("window", 0, 4.6, 1)],
  },
  {
    id: "lounge", name: "Lounge", style: 2, desc: "Couch, Bar und Neon.",
    make: () => [item("surround", 0, 0), item("mat", 0, 0), item("ledring", 0, 0), item("plant", 0.5, 0.5), item("rug", 2.35, 5.6, 1), item("couch", 0.62, 5.6, 1),
      item("coffeetable", 2.25, 5.6, 1), item("lamp", 0.4, 7.45), item("sidetable", 0.42, 3.55, 1), item("bar", 7.05, 5.95, 3), item("barstool", 6.1, 5.35), item("barstool", 6.1, 6.65),
      item("neon", 6.6, 0), item("poster", 2.95, 0), item("chalkboard", 0, 2.2, 1)],
  },
  {
    id: "fluencer", name: "Dartfluencer", style: 3, desc: "Streaming-Setup mit Kamera und Ringlicht.",
    make: () => [item("surround", 0, 0), item("mat", 0, 0), item("ledring", 0, 0), item("led", 0, 0), item("plant", 0.5, 0.5), item("streamdesk", 6.9, 1.4, 0),
      item("camera", 1.5, 2.4), item("ringlight", 5.3, 1.2), item("foam", 0, 2.4, 1), item("foam", 1.75, 0), item("onair", 0, 5.4, 1), item("tv", 0, 3.6, 1),
      item("rug_blue", 2.35, 5.6, 1), item("couch", 0.62, 5.6, 1), item("coffeetable", 2.25, 5.6, 1), item("neon", 6.6, 0)],
  },
  {
    id: "profi", name: "Profi", style: 4, desc: "Eigene Bühne mit Scheinwerfern.",
    make: () => [item("surround", 0, 0), item("ledring", 0, 0), item("stage", 0, 0), item("spots", 0, 0), item("sponsorwall", 0, 0), item("scoreboard", 1.4, 0),
      item("plant", 0.5, 0.5), item("tv", 0, 3.0, 1), item("armchair", 0.75, 6.2, 1), item("sidetable", 0.5, 7.4, 1), item("bar", 7.05, 5.95, 3), item("barstool", 6.1, 5.6)],
  },
];

// ---------------- Platz-Regeln ----------------
export interface Rect { x0: number; x1: number; z0: number; z1: number }

/** Grundfläche eines Bodenmöbels im Raum (bei Wandmöbeln: Strecke an der Wand) */
export function footprint(p: Placed): Rect {
  const def = FURNITURE_BY_ID.get(p.id);
  if (!def || def.fixed) return { x0: 0, x1: 0, z0: 0, z1: 0 };
  if (def.wall) {
    return p.rot % 2 === 0 ? { x0: p.x - def.w / 2, x1: p.x + def.w / 2, z0: 0, z1: def.d } : { x0: 0, x1: def.d, z0: p.z - def.w / 2, z1: p.z + def.w / 2 };
  }
  const odd = p.rot % 2 === 1;
  const hw = (odd ? def.d : def.w) / 2, hd = (odd ? def.w : def.d) / 2;
  return { x0: p.x - hw, x1: p.x + hw, z0: p.z - hd, z1: p.z + hd };
}

const overlap = (a: Rect, b: Rect, pad = 0) => a.x0 < b.x1 - pad && a.x1 > b.x0 + pad && a.z0 < b.z1 - pad && a.z1 > b.z0 + pad;

/** Darf das Möbel hier stehen? */
export function canPlace(p: Placed, layout: Placed[]): boolean {
  const def = FURNITURE_BY_ID.get(p.id);
  if (!def) return false;
  if (def.fixed) return true;
  const r = footprint(p);
  if (r.x0 < 0 || r.z0 < 0 || r.x1 > ROOM_SIZE || r.z1 > ROOM_SIZE) return false;
  if (def.wall) {
    // nicht hinter das Board und nicht über andere Wandsachen
    if (p.rot % 2 === 0 && r.x0 < LANE.x1 && r.x1 > LANE.x0) return false;
    return !layout.some((o) => {
      const od = FURNITURE_BY_ID.get(o.id);
      return o.uid !== p.uid && od?.wall && o.rot % 2 === p.rot % 2 && overlap(r, footprint(o), 0.02);
    });
  }
  if (overlap(r, LANE)) return false;
  if (layout.some((o) => o.id === "stage") && overlap(r, { x0: 2.6, x1: 5.4, z0: 0, z1: 5.2 })) return false;
  if (def.flat) return true;
  return !layout.some((o) => {
    const od = FURNITURE_BY_ID.get(o.id);
    return o.uid !== p.uid && od && !od.wall && !od.flat && !od.fixed && overlap(r, footprint(o), 0.02);
  });
}

/** Auf ein 25-cm-Raster einrasten */
export const snap = (v: number) => Math.round(v * 4) / 4;

/** Freien Platz für ein neues Möbel suchen, möglichst nah an einer Wunschstelle */
export function findSpot(id: string, layout: Placed[], near: [number, number] = [2.2, 5.2]): Placed | null {
  const def = FURNITURE_BY_ID.get(id);
  if (!def) return null;
  const uid = newUid();
  if (def.fixed) return { uid, id, x: 0, z: 0, rot: 0 };
  if (def.wall) {
    for (const rot of [0, 1]) for (let t = 0.75; t <= ROOM_SIZE - 0.75; t += 0.25) {
      const p: Placed = rot === 0 ? { uid, id, x: t, z: 0, rot } : { uid, id, x: 0, z: t, rot };
      if (canPlace(p, layout)) return p;
    }
    return null;
  }
  // Spirale um die Wunschstelle
  for (let r = 0; r <= 8; r += 0.25) {
    for (let a = 0; a < Math.PI * 2; a += r ? 0.25 / r : 7) {
      for (const rot of [0, 1]) {
        const p: Placed = { uid, id, x: snap(near[0] + Math.cos(a) * r), z: snap(near[1] + Math.sin(a) * r), rot };
        if (canPlace(p, layout)) return p;
      }
    }
  }
  return null;
}

/** Ein Punkt relativ zum Möbel in Raumkoordinaten (Drehung um Vierteldrehungen) */
export function localToRoom(p: Placed, dx: number, dz: number): [number, number] {
  const a = (p.rot % 4) * (Math.PI / 2);
  return [p.x + dx * Math.cos(a) + dz * Math.sin(a), p.z - dx * Math.sin(a) + dz * Math.cos(a)];
}

/** Gespeicherten Aufbau prüfen und aufräumen */
export function normalizeLayout(l: unknown): Placed[] | undefined {
  if (!Array.isArray(l)) return undefined;
  return l.filter((p): p is Placed => !!p && typeof p === "object" && typeof (p as Placed).id === "string" && FURNITURE_BY_ID.has((p as Placed).id))
    .map((p) => ({ uid: typeof p.uid === "string" ? p.uid : newUid(), id: p.id, x: Number(p.x) || 0, z: Number(p.z) || 0, rot: ((Number(p.rot) || 0) % 4 + 4) % 4 }));
}
