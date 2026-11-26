// Alles, was man im Dartraum kaufen oder freischalten kann.
export type Slot = "shirt" | "hair" | "beard" | "glasses" | "hat" | "darts" | "room";

export interface Item {
  id: string;
  slot: Slot;
  name: string;
  price: number;
  /** Nur über diesen Erfolg erhältlich */
  achievement?: string;
  /** Sammlung für die Anzeige im Shop */
  tag?: "Club26" | "Exklusiv";
}

export const SLOT_LABEL: Record<Slot, string> = {
  shirt: "Trikots", hair: "Frisur", beard: "Bart", glasses: "Brille", hat: "Kopf", darts: "Darts", room: "Raum",
};

export const ITEMS: Item[] = [
  // Trikots
  { id: "shirt-grey", slot: "shirt", name: "Basic Grau", price: 0 },
  { id: "shirt-black", slot: "shirt", name: "Basic Schwarz", price: 0 },
  { id: "shirt-pink", slot: "shirt", name: "Trikot Pink", price: 150 },
  { id: "shirt-cyan", slot: "shirt", name: "Trikot Cyan", price: 150 },
  { id: "shirt-stripes", slot: "shirt", name: "Streifen", price: 250 },
  { id: "shirt-checker", slot: "shirt", name: "Karo", price: 300 },
  { id: "shirt-split", slot: "shirt", name: "Neon Split", price: 400 },
  { id: "shirt-flames", slot: "shirt", name: "Flammen", price: 400 },
  { id: "shirt-c26", slot: "shirt", name: "Club26 Classic", price: 300, tag: "Club26" },
  { id: "shirt-c26-sage", slot: "shirt", name: "Club26 Sage", price: 300, tag: "Club26" },
  { id: "shirt-c26-neon", slot: "shirt", name: "Club26 Neon", price: 600, tag: "Club26" },
  { id: "shirt-180", slot: "shirt", name: "Maximum-Shirt", price: 0, achievement: "first-180", tag: "Exklusiv" },
  { id: "shirt-bigfish", slot: "shirt", name: "Big Fish", price: 0, achievement: "big-fish", tag: "Exklusiv" },
  { id: "shirt-champion", slot: "shirt", name: "Club26 Champion", price: 0, achievement: "champion", tag: "Exklusiv" },
  { id: "shirt-gold", slot: "shirt", name: "Perfektion Gold", price: 0, achievement: "nine-darter", tag: "Exklusiv" },
  // Aussehen (kostenlos)
  { id: "hair-short", slot: "hair", name: "Kurz", price: 0 },
  { id: "hair-buzz", slot: "hair", name: "Buzzcut", price: 0 },
  { id: "hair-bald", slot: "hair", name: "Glatze", price: 0 },
  { id: "hair-quiff", slot: "hair", name: "Tolle", price: 0 },
  { id: "hair-curly", slot: "hair", name: "Locken", price: 0 },
  { id: "hair-long", slot: "hair", name: "Lang", price: 0 },
  { id: "hair-mohawk", slot: "hair", name: "Iro", price: 0 },
  { id: "hair-bun", slot: "hair", name: "Dutt", price: 0 },
  // Bart
  { id: "beard-none", slot: "beard", name: "Ohne", price: 0 },
  { id: "beard-stubble", slot: "beard", name: "Dreitage", price: 0 },
  { id: "beard-mustache", slot: "beard", name: "Schnauzer", price: 0 },
  { id: "beard-goatee", slot: "beard", name: "Spitzbart", price: 0 },
  { id: "beard-full", slot: "beard", name: "Vollbart", price: 0 },
  // Brillen
  { id: "glasses-none", slot: "glasses", name: "Ohne", price: 0 },
  { id: "glasses-classic", slot: "glasses", name: "Klassisch", price: 0 },
  { id: "glasses-sun", slot: "glasses", name: "Sonnenbrille", price: 0 },
  { id: "glasses-neon", slot: "glasses", name: "Neon-Shades", price: 0, achievement: "streak-7", tag: "Exklusiv" },
  // Kopf
  { id: "hat-none", slot: "hat", name: "Ohne", price: 0 },
  { id: "hat-cap", slot: "hat", name: "Cap", price: 120 },
  { id: "hat-cap-back", slot: "hat", name: "Cap verkehrt", price: 120 },
  { id: "hat-beanie", slot: "hat", name: "Mütze", price: 100 },
  { id: "hat-crown", slot: "hat", name: "Krone", price: 0, achievement: "wins-10", tag: "Exklusiv" },
  // Darts (Anstecker auf dem Trikot)
  { id: "darts-steel", slot: "darts", name: "Stahl-Darts", price: 0 },
  { id: "darts-pink", slot: "darts", name: "Pink-Darts", price: 100 },
  { id: "darts-cyan", slot: "darts", name: "Cyan-Darts", price: 100 },
  { id: "darts-gold", slot: "darts", name: "Gold-Darts", price: 0, achievement: "ten-180", tag: "Exklusiv" },
];

/** Ausbaustufen des Dartraums */
export interface RoomLevel { level: number; name: string; price: number; desc: string }
export const ROOM_LEVELS: RoomLevel[] = [
  { level: 0, name: "Kellerraum", price: 0, desc: "Ein Board an der Wand und eine Kreidetafel." },
  { level: 1, name: "Hobbyraum", price: 300, desc: "Ringlicht, Teppich mit Abwurflinie, Poster." },
  { level: 2, name: "Club-Lounge", price: 800, desc: "Sofa, Bar, Club26-Neon an der Wand." },
  { level: 3, name: "Streaming-Setup", price: 1500, desc: "Kamera, Mikrofon, Monitore und On-Air-Licht." },
  { level: 4, name: "Profi-Studio", price: 3000, desc: "Bühne mit Walk-on-Licht, Publikum, Sponsorenwand." },
];

export const SKIN_TONES = ["#f6d3b8", "#e8b48f", "#c98e63", "#9a6440", "#6b4128"];
export const HAIR_COLORS = ["#2a1d15", "#5a3a22", "#a8743d", "#e3c27a", "#b9b9c2", "#d63ce0"];

export interface Look {
  skin: number;
  hairColor: number;
  shirt: string;
  hair: string;
  beard: string;
  glasses: string;
  hat: string;
  darts: string;
  /** Rückennummer/Name auf dem Trikot */
  number?: string;
}

export const DEFAULT_LOOK: Look = {
  skin: 1, hairColor: 1, shirt: "shirt-grey", hair: "hair-short", beard: "beard-none", glasses: "glasses-none", hat: "hat-none", darts: "darts-steel",
};

export const itemById = (id: string) => ITEMS.find((i) => i.id === id);
export const freeItems = () => ITEMS.filter((i) => i.price === 0 && !i.achievement).map((i) => i.id);
