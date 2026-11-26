// Alles, was man im Dartraum auswählen kann.
// Testmodus: Im Moment ist alles frei wählbar. Preise stehen schon hier, damit die Coins später leicht wieder dazukommen.

export const SANDBOX = true;

// ---------------- Farben ----------------
export const SKIN_TONES = ["#f8d9c0", "#ecbd98", "#d39a6c", "#a8714a", "#7a4d30", "#4f3020"];
export const HAIR_COLORS = ["#1f1712", "#4a2f1d", "#7a4b28", "#b07a40", "#e4c27a", "#c9c9d2", "#a8322e", "#d63ce0", "#3fa7d6"];

/** Trikotfarben: Club26-Farben zuerst, danach klassische Sportfarben */
export const JERSEY_COLORS: { hex: string; name: string }[] = [
  { hex: "#0e0e12", name: "Schwarz" },
  { hex: "#f4f4f6", name: "Weiß" },
  { hex: "#d63ce0", name: "Club-Pink" },
  { hex: "#5fe3f0", name: "Club-Cyan" },
  { hex: "#7b8b7e", name: "Salbei" },
  { hex: "#8e1f99", name: "Lila" },
  { hex: "#d7263d", name: "Rot" },
  { hex: "#ff7a1a", name: "Orange" },
  { hex: "#ffd23f", name: "Gelb" },
  { hex: "#1fa35b", name: "Grün" },
  { hex: "#1d4fd6", name: "Blau" },
  { hex: "#0b1f4d", name: "Navy" },
  { hex: "#6b6b78", name: "Grau" },
  { hex: "#e8c25a", name: "Gold" },
];

// ---------------- Trikots ----------------
export type JerseyDesign =
  | "classic" | "panels" | "flames" | "bolts" | "shards" | "diagonal" | "fade" | "camo" | "checker" | "waves" | "club26" | "club26neon";

export const JERSEY_DESIGNS: { id: JerseyDesign; name: string; price: number; tag?: "Club26" }[] = [
  { id: "classic", name: "Klassik", price: 0 },
  { id: "panels", name: "Seitenpanels", price: 150 },
  { id: "flames", name: "Flammen", price: 400 },
  { id: "bolts", name: "Blitze", price: 400 },
  { id: "shards", name: "Splitter", price: 350 },
  { id: "diagonal", name: "Schärpe", price: 250 },
  { id: "fade", name: "Farbverlauf", price: 300 },
  { id: "camo", name: "Camouflage", price: 300 },
  { id: "checker", name: "Zielflagge", price: 350 },
  { id: "waves", name: "Tribal", price: 350 },
  { id: "club26", name: "Club26 Home", price: 300, tag: "Club26" },
  { id: "club26neon", name: "Club26 Neon", price: 600, tag: "Club26" },
];

export interface Jersey {
  design: JerseyDesign;
  primary: string;
  secondary: string;
  accent: string;
  /** Sponsor-Patches auf Brust und Ärmel */
  sponsors: boolean;
  collar: "polo" | "vneck";
}

// ---------------- Hosen, Schuhe, Köpfe ----------------
export const PANTS = [
  { id: "black", name: "Schwarze Stoffhose", color: "#17171c", detail: "#2a2a33" },
  { id: "jeans", name: "Jeans", color: "#2f4a7a", detail: "#4a6aa3" },
  { id: "darkjeans", name: "Dunkle Jeans", color: "#1e2a44", detail: "#33456b" },
  { id: "grey", name: "Graue Chino", color: "#55555f", detail: "#6e6e7a" },
  { id: "beige", name: "Beige Chino", color: "#a8916a", detail: "#c2ab82" },
] as const;
export const SHOES = [
  { id: "sneaker-white", name: "Sneaker Weiß", upper: "#f2f2f5", sole: "#d8d8de", accent: "#d63ce0" },
  { id: "sneaker-black", name: "Sneaker Schwarz", upper: "#1b1b20", sole: "#f2f2f5", accent: "#5fe3f0" },
  { id: "dress", name: "Lederschuhe", upper: "#2b1a10", sole: "#140c07", accent: "#5a3a20" },
  { id: "runner", name: "Runner Neon", upper: "#5fe3f0", sole: "#f2f2f5", accent: "#d63ce0" },
] as const;

export const BUILDS = [
  { id: "slim", name: "Schlank" }, { id: "normal", name: "Normal" }, { id: "athletic", name: "Athletisch" }, { id: "heavy", name: "Kräftig" },
] as const;
// Frisuren und Bart sind fertige 3D-Modelle (Quaternius, CC0), siehe public/models/dartraum/hair.glb
export const HAIR_STYLES = [
  { id: "short", name: "Kurz" }, { id: "buzz", name: "Buzzcut" },
  { id: "long", name: "Lang" }, { id: "bald", name: "Glatze" },
] as const;
export const BEARDS = [
  { id: "none", name: "Ohne" }, { id: "full", name: "Vollbart" },
] as const;
/** Frühere Frisuren/Bärte auf die neuen fertigen Modelle umstellen */
const OLD_HAIR: Record<string, string> = { fade: "buzz", quiff: "short", slick: "short", curly: "short", mohawk: "buzz", ponytail: "long", bun: "long", side: "short" };
const OLD_BEARD: Record<string, string> = { stubble: "none", mustache: "full", goatee: "full", chin: "full" };
export const GLASSES = [
  { id: "none", name: "Ohne" }, { id: "round", name: "Rund" }, { id: "square", name: "Eckig" }, { id: "sun", name: "Sonnenbrille" }, { id: "neon", name: "Neon-Shades" },
] as const;
export const HATS = [
  { id: "none", name: "Ohne", price: 0 }, { id: "cap", name: "Cap", price: 120 }, { id: "capback", name: "Cap verkehrt", price: 120 },
  { id: "beanie", name: "Mütze", price: 100 }, { id: "headband", name: "Stirnband", price: 80 }, { id: "crown", name: "Krone", price: 1000 },
] as const;

// ---------------- Darts ----------------
export type BarrelShape = "straight" | "torpedo" | "bomb" | "teardrop" | "scallop";
export type Grip = "rings" | "knurl" | "shark" | "smooth";
export type FlightShape = "standard" | "shape" | "slim" | "kite" | "pear";
export type FlightDesign = "plain" | "club26" | "flame" | "stripe" | "target" | "split";

export const BARRELS: { id: BarrelShape; name: string; desc: string }[] = [
  { id: "straight", name: "Straight", desc: "Gleich dick von vorne bis hinten" },
  { id: "torpedo", name: "Torpedo", desc: "Vorne dick, nach hinten schlanker" },
  { id: "bomb", name: "Bomb", desc: "Kurz und bauchig" },
  { id: "teardrop", name: "Teardrop", desc: "Tropfenform, Gewicht ganz vorne" },
  { id: "scallop", name: "Scallop", desc: "Mulde als Griffzone" },
];
export const GRIPS: { id: Grip; name: string }[] = [
  { id: "rings", name: "Ringe" }, { id: "knurl", name: "Rändel" }, { id: "shark", name: "Haifischflosse" }, { id: "smooth", name: "Glatt" },
];
export const BARREL_FINISH = [
  { id: "silver", name: "Tungsten", light: "#eef0f4", mid: "#a9adb8", dark: "#5d616c" },
  { id: "black", name: "Black Titanium", light: "#6a6a78", mid: "#2c2c34", dark: "#111116" },
  { id: "gold", name: "Gold", light: "#fff1b8", mid: "#e0b64a", dark: "#8a6416" },
  { id: "pink", name: "Pink PVD", light: "#ffb8f6", mid: "#d63ce0", dark: "#6d1675" },
  { id: "cyan", name: "Cyan PVD", light: "#d6fbff", mid: "#38c5d4", dark: "#11616b" },
  { id: "rainbow", name: "Rainbow", light: "#ffd6ff", mid: "#8a7bff", dark: "#2a5a8a" },
] as const;
export const SHAFT_LENGTHS = [
  { id: "short", name: "Kurz", len: 0.75 }, { id: "medium", name: "Mittel", len: 1 }, { id: "long", name: "Lang", len: 1.3 },
] as const;
export const FLIGHT_SHAPES: { id: FlightShape; name: string }[] = [
  { id: "standard", name: "Standard (No. 2)" }, { id: "shape", name: "Shape (No. 6)" }, { id: "slim", name: "Slim" }, { id: "kite", name: "Kite" }, { id: "pear", name: "Pear" },
];
export const FLIGHT_DESIGNS: { id: FlightDesign; name: string }[] = [
  { id: "plain", name: "Uni" }, { id: "club26", name: "Club26" }, { id: "flame", name: "Flamme" },
  { id: "stripe", name: "Streifen" }, { id: "target", name: "Zielscheibe" }, { id: "split", name: "Zweifarbig" },
];

export interface DartSetup {
  barrel: BarrelShape;
  grip: Grip;
  finish: string;
  shaft: string;
  shaftColor: string;
  flight: FlightShape;
  flightDesign: FlightDesign;
  flightColor: string;
  flightColor2: string;
}

// ---------------- Gesamter Look ----------------
export interface Look {
  /** Statur der Figur */
  build: string;
  skin: number;
  hairColor: number;
  hair: string;
  beard: string;
  glasses: string;
  hat: string;
  hatColor: string;
  jersey: Jersey;
  pants: string;
  shoes: string;
  darts: DartSetup;
  /** Name auf dem Rücken; leer = Spitzname des Spielers */
  backName?: string;
}

export const DEFAULT_LOOK: Look = {
  build: "normal", skin: 1, hairColor: 1, hair: "short", beard: "none", glasses: "none", hat: "none", hatColor: "#d63ce0",
  jersey: { design: "panels", primary: "#0e0e12", secondary: "#d63ce0", accent: "#5fe3f0", sponsors: true, collar: "polo" },
  pants: "black", shoes: "sneaker-white",
  darts: { barrel: "torpedo", grip: "rings", finish: "silver", shaft: "medium", shaftColor: "#0e0e12", flight: "standard", flightDesign: "club26", flightColor: "#d63ce0", flightColor2: "#5fe3f0" },
};

/** Alte oder unvollständige Looks auf den aktuellen Stand bringen */
export function normalizeLook(l: Partial<Look> | undefined | null): Look {
  const src = (l ?? {}) as Partial<Look> & Record<string, unknown>;
  const jersey = typeof src.jersey === "object" && src.jersey ? { ...DEFAULT_LOOK.jersey, ...src.jersey } : DEFAULT_LOOK.jersey;
  const darts = typeof src.darts === "object" && src.darts ? { ...DEFAULT_LOOK.darts, ...src.darts } : DEFAULT_LOOK.darts;
  const pick = <T extends string>(v: unknown, list: readonly { id: string }[], fallback: T) =>
    (typeof v === "string" && list.some((x) => x.id === v) ? v : fallback) as T;
  return {
    ...DEFAULT_LOOK,
    build: pick(src.build, BUILDS, DEFAULT_LOOK.build),
    skin: typeof src.skin === "number" ? Math.min(src.skin, SKIN_TONES.length - 1) : DEFAULT_LOOK.skin,
    hairColor: typeof src.hairColor === "number" ? Math.min(src.hairColor, HAIR_COLORS.length - 1) : DEFAULT_LOOK.hairColor,
    hair: pick(OLD_HAIR[src.hair as string] ?? src.hair, HAIR_STYLES, DEFAULT_LOOK.hair),
    beard: pick(OLD_BEARD[src.beard as string] ?? src.beard, BEARDS, DEFAULT_LOOK.beard),
    glasses: pick(src.glasses, GLASSES, DEFAULT_LOOK.glasses),
    hat: pick(src.hat, HATS, DEFAULT_LOOK.hat),
    hatColor: typeof src.hatColor === "string" ? src.hatColor : DEFAULT_LOOK.hatColor,
    pants: pick(src.pants, PANTS, DEFAULT_LOOK.pants),
    shoes: pick(src.shoes, SHOES, DEFAULT_LOOK.shoes),
    jersey, darts,
    backName: typeof src.backName === "string" ? src.backName : undefined,
  };
}

/** Ausbaustufen des Dartraums */
export interface RoomLevel { level: number; name: string; price: number; desc: string }
export const ROOM_LEVELS: RoomLevel[] = [
  { level: 0, name: "Kellerraum", price: 0, desc: "Betonboden, nacktes Board, eine Glühbirne." },
  { level: 1, name: "Hobbyraum", price: 300, desc: "Holzboden, Dartkabinett, Dartmatte mit Oche, Stehlampe." },
  { level: 2, name: "Club-Lounge", price: 800, desc: "Couch, Bar mit Hockern, Club26-Neon, LED-Ring am Board." },
  { level: 3, name: "Streaming-Setup", price: 1500, desc: "Gaming-Stuhl, Monitore, Kamera, Mikrofon, LED-Leisten." },
  { level: 4, name: "Profi-Studio", price: 3000, desc: "Bühne, Scheinwerfer, Großbildschirm, Sponsorenwand." },
];
