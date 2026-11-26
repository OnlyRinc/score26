// Der Dartraum als 3D-Diorama. 1 Einheit = 1 Meter. Boden 8 x 8, Board an der hinteren Wand (z = 0) bei x = 4.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CYAN, GOLD, PINK, boardTexture, brickTexture, concreteTexture, foamTexture, fonts, neonText, panelTexture, shade, signTexture, tileTexture, woodTexture } from "./textures";

export const N = 8, WALL_H = 3.1;
export const BOARD = new THREE.Vector3(4, 1.73, 0.06);
export const OCHE_Z = 2.37;
export const STAGE = { x0: 2.6, x1: 5.4, z0: 0, z1: 5.2, h: 0.1 };

export interface RoomInfo { name: string; trophies: number; medals: number }
export interface BuiltRoom {
  group: THREE.Group;
  animate: (t: number) => void;
  floorAt: (x: number, z: number) => number;
  dispose: () => void;
}

export function buildRoom(level: number, info: RoomInfo): BuiltRoom {
  const group = new THREE.Group();
  const anims: ((t: number) => void)[] = [];
  const toDispose: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => { toDispose.push(x); return x; };
  const f = fonts();

  const M = (color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => keep(new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o }));
  const add = <T extends THREE.Object3D>(o: T) => { group.add(o); return o; };
  const box = (w: number, h: number, d: number, m: THREE.Material | THREE.Material[], x: number, y: number, z: number, r = 0.02) => {
    const g = r > 0 ? new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.01, h / 2.01, d / 2.01)) : new THREE.BoxGeometry(w, h, d);
    const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return add(o);
  };
  /** Kiste von Ecke (x0, z0) am Boden aus */
  const block = (x0: number, z0: number, w: number, d: number, h: number, m: THREE.Material | THREE.Material[], y0 = 0, r = 0.03) => box(w, h, d, m, x0 + w / 2, y0 + h / 2, z0 + d / 2, r);
  const cyl = (rt: number, rb: number, h: number, m: THREE.Material, x: number, y: number, z: number, seg = 20) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return add(o);
  };
  /** Bild flach an die hintere Wand (z = 0) */
  const onBack = (t: THREE.Texture, w: number, h: number, x: number, y: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => {
    keep(t);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M("#fff", { map: t, roughness: 0.8, ...o })); p.position.set(x, y, 0.012); p.receiveShadow = true; return add(p);
  };
  /** Bild flach an die linke Wand (x = 0), x-Richtung im Bild läuft nach +z */
  const onLeft = (t: THREE.Texture, w: number, h: number, z: number, y: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => {
    keep(t);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M("#fff", { map: t, roughness: 0.8, ...o })); p.position.set(0.012, y, z); p.rotation.y = Math.PI / 2; p.receiveShadow = true; return add(p);
  };
  const glow = (color: string, intensity = 2) => M(color, { emissive: color, emissiveIntensity: intensity, roughness: 0.3 });

  // ---------------- Thema je Stufe ----------------
  const theme = [
    { wall: "#8e8a84", floorTex: concreteTexture(), trim: "#5b5751" },
    { wall: "#e3d6bf", floorTex: woodTexture("#a8743f"), trim: "#6b4424" },
    { wall: "#4b2756", floorTex: woodTexture("#7a4d2c"), trim: "#2c1533" },
    { wall: "#24223a", floorTex: tileTexture("#2a2838", "#32304a"), trim: "#15131f" },
    { wall: "#15121d", floorTex: tileTexture("#17141f", "#1f1b29"), trim: "#0b0a10" },
  ][level];
  keep(theme.floorTex);

  // Bodenplatte wie ein schwebendes Diorama
  const slab = block(-0.2, -0.2, N + 0.2, N + 0.2, 0.35, M(shade(theme.trim, 0.1), { roughness: 0.9 }), -0.35, 0.04);
  slab.castShadow = false;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(N, N), M("#fff", { map: theme.floorTex, roughness: level >= 3 ? 0.35 : 0.8, metalness: level >= 3 ? 0.1 : 0 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(N / 2, 0.001, N / 2); floor.receiveShadow = true; add(floor);

  // Wände
  let wallMatBack: THREE.Material, wallMatLeft: THREE.Material;
  if (level === 0) { const t = keep(brickTexture()); const t2 = keep(t.clone()); wallMatBack = M("#fff", { map: t }); wallMatLeft = M("#fff", { map: t2 }); }
  else if (level === 2) { const t = keep(panelTexture(theme.wall, shade(theme.wall, -0.3))); wallMatBack = M("#fff", { map: t }); wallMatLeft = M("#fff", { map: t }); }
  else { wallMatBack = M(theme.wall, { roughness: 0.9 }); wallMatLeft = M(shade(theme.wall, -0.06), { roughness: 0.9 }); }
  block(-0.2, -0.2, N + 0.2, 0.2, WALL_H, wallMatBack, 0, 0.01);
  block(-0.2, 0, 0.2, N, WALL_H, wallMatLeft, 0, 0.01);
  // Wandkappen
  const capM = M(level >= 3 ? "#2a2738" : "#efe9df", { roughness: 0.6 });
  block(-0.22, -0.22, N + 0.24, 0.24, 0.06, capM, WALL_H, 0.02);
  block(-0.22, 0, 0.24, N + 0.02, 0.06, capM, WALL_H, 0.02);
  // Sockelleisten
  const skirt = M(theme.trim);
  block(0, 0, N, 0.03, 0.1, skirt, 0, 0.005); block(0, 0, 0.03, N, 0.1, skirt, 0, 0.005);

  // Stufe 1: Holzvertäfelung unten
  if (level === 1) {
    const wood = keep(woodTexture("#7b5232")); wood.rotation = Math.PI / 2;
    const wm = M("#fff", { map: wood });
    block(0, 0, N, 0.04, 1.0, wm, 0, 0.005); block(0, 0, 0.04, N, 1.0, wm, 0, 0.005);
    block(0, 0, N, 0.06, 0.04, skirt, 1.0, 0.01); block(0, 0, 0.06, N, 0.04, skirt, 1.0, 0.01);
  }
  // Stufe 3: Akustikschaum
  if (level === 3) {
    const fm = M("#fff", { map: keep(foamTexture("#3a2f5c")) });
    block(0, 1.2, 0.08, 2.4, 1.2, fm, 1.1, 0.01);
    block(0, 4.4, 0.08, 2.0, 1.2, fm, 1.1, 0.01);
    block(1.0, 0, 1.5, 0.08, 1.0, fm, 1.6, 0.01);
  }
  // LED-Leisten ab Stufe 3
  if (level >= 3) {
    block(0.05, 0.05, N - 0.1, 0.03, 0.03, glow(level === 4 ? PINK : CYAN, 3), 0.12, 0.01);
    block(0.05, 0.05, 0.03, N - 0.1, 0.03, glow(level === 4 ? CYAN : PINK, 3), 0.12, 0.01);
    block(0.05, 0.05, N - 0.1, 0.03, 0.03, glow(PINK, 2.5), WALL_H - 0.08, 0.01);
  }

  // ---------------- Dartboard ----------------
  const bt = keep(boardTexture());
  const boardMats = [M("#1a1a1a", { roughness: 0.9 }), M("#fff", { map: bt, roughness: 0.85 }), M("#111")];
  const board = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.04, 64), boardMats);
  board.rotation.x = Math.PI / 2; board.position.set(BOARD.x, BOARD.y, 0.04); board.castShadow = true; board.receiveShadow = true;
  // Textur so drehen, dass die 20 oben steht
  bt.center.set(0.5, 0.5); bt.rotation = Math.PI;
  add(board);
  if (level >= 1) {
    // Auffangring
    const surround = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.03, 64), M("#060606", { roughness: 0.6 }));
    surround.rotation.x = Math.PI / 2; surround.position.set(BOARD.x, BOARD.y, 0.02); surround.receiveShadow = true; add(surround);
  }
  if (level === 1) {
    // Dartkabinett mit offenen Türen und Kreidetafeln
    const wood = M("#6b3f22", { roughness: 0.6 });
    const C = 0.8;
    block(BOARD.x - C, 0.0, 2 * C, 0.015, 2 * C, wood, BOARD.y - C, 0.005);
    for (const s of [-1, 1]) block(BOARD.x + s * C - (s > 0 ? 0.05 : 0), 0.0, 0.05, 0.14, 2 * C, wood, BOARD.y - C, 0.01);
    block(BOARD.x - C, 0.0, 2 * C, 0.14, 0.05, wood, BOARD.y + C - 0.05, 0.01); block(BOARD.x - C, 0.0, 2 * C, 0.14, 0.05, wood, BOARD.y - C, 0.01);
    const chalk = signTexture((ctx, w, h) => { ctx.fillStyle = "#1d3a2c"; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 4; ctx.font = `600 48px ${f.display}`; ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.textAlign = "center"; ["501", "441", "321", "180"].forEach((n, i) => ctx.fillText(n, w / 2, 90 + i * 100)); }, 256, 512);
    const doorM = [wood, wood, wood, wood, M("#fff", { map: keep(chalk) }), wood];
    for (const s of [-1, 1]) {
      const d = box(C, 2 * C, 0.04, doorM, 0, 0, 0, 0.01);
      const piv = new THREE.Group(); piv.position.set(BOARD.x + s * C, BOARD.y, 0.14); piv.rotation.y = s * 1.9; d.position.set(-s * C / 2, 0, 0); group.remove(d); piv.add(d); add(piv);
    }
  }
  if (level >= 2) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.035, 12, 64), glow("#dff6ff", 0.55));
    ring.position.set(BOARD.x, BOARD.y, 0.12); add(ring);
    const bl = new THREE.PointLight("#e8f6ff", 0.5, 2, 2); bl.position.set(BOARD.x, BOARD.y, 0.6); add(bl);
  }
  // Licht aufs Board
  const spot = new THREE.SpotLight(level === 0 ? "#ffd9a0" : "#ffffff", level === 0 ? 4 : 1.6, 8, 0.32, 0.6, 1.6);
  spot.position.set(BOARD.x, 2.95, 1.6); spot.target.position.copy(BOARD); add(spot); add(spot.target);
  if (level === 0) {
    // nackte Glühbirne
    cyl(0.004, 0.004, 0.5, M("#222"), BOARD.x, WALL_H - 0.25, 1.4, 6);
    const bulb = cyl(0.05, 0.05, 0.1, glow("#ffe4a8", 4), BOARD.x, WALL_H - 0.55, 1.4, 12);
    anims.push((t) => { (bulb.material as THREE.MeshStandardMaterial).emissiveIntensity = 3.6 + Math.sin(t * 23) * 0.2 * (Math.sin(t * 1.3) > 0.95 ? 3 : 0.3); });
  }

  // Abwurflinie und Matte
  if (level >= 1) {
    block(BOARD.x - 0.6, 0.04, 1.2, 3.3, 0.012, M(level >= 3 ? "#1a1a22" : "#2a2a30", { roughness: 0.95 }), 0, 0.005);
  }
  block(BOARD.x - 0.45, OCHE_Z - 0.02, 0.9, 0.04, 0.035, level >= 3 ? glow(CYAN, 2) : M(level >= 1 ? "#f4f4f6" : "#e8e2d0"), 0, 0.01);

  // ---------------- Möbel und Deko ----------------
  // Pflanze in der hinteren Ecke
  {
    const potM = M(level >= 2 ? "#26262e" : "#a0623a", { roughness: 0.6 });
    cyl(0.2, 0.16, 0.42, potM, 0.4, 0.21, 0.4);
    const leafM = M("#2f7d47", { roughness: 0.6, side: THREE.DoubleSide });
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2, tilt = 0.35 + (i % 3) * 0.2;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), leafM);
      leaf.scale.set(0.45, 1.2, 0.12);
      const piv = new THREE.Group(); piv.position.set(0.4, 0.45, 0.4); piv.rotation.set(Math.cos(a) * tilt, a, Math.sin(a) * tilt);
      leaf.position.y = 0.2 + (i % 2) * 0.05; leaf.castShadow = true; piv.add(leaf); add(piv);
    }
  }
  // Trophäenregal an der hinteren Wand
  {
    const shelfM = M("#5a3a22", { roughness: 0.6 });
    block(0.95, 0, 1.75, 0.26, 0.04, shelfM, 1.75, 0.01);
    const goldM = M(GOLD, { metalness: 0.9, roughness: 0.25 });
    const n = Math.min(5, info.trophies);
    for (let i = 0; i < n; i++) {
      const pts = [[0, 0], [0.06, 0], [0.06, 0.02], [0.02, 0.04], [0.015, 0.12], [0.07, 0.17], [0.08, 0.26], [0.0, 0.25]].map(([r, y]) => new THREE.Vector2(r, y));
      const cup = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), goldM); cup.position.set(1.15 + i * 0.33, 1.79, 0.13); cup.castShadow = true; add(cup);
    }
    if (n === 0) onBack(signTexture((ctx, w, h) => { ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.font = `italic 44px ${f.display}`; ctx.textAlign = "center"; ctx.fillText("Platz für Pokale", w / 2, h / 2 + 14); }, 512, 96), 1.5, 0.28, 1.82, 1.96, { transparent: true });
    // Medaillen am Band
    const m = Math.min(14, info.medals);
    for (let i = 0; i < m; i++) {
      const x = 1.05 + (i % 7) * 0.24, y = 1.45 - Math.floor(i / 7) * 0.28;
      block(x - 0.015, 0, 0.03, 0.01, 0.12, M(i % 2 ? PINK : CYAN), y + 0.03, 0.004);
      const med = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 20), goldM); med.rotation.x = Math.PI / 2; med.position.set(x, y, 0.02); add(med);
    }
  }
  // Kreidetafel bzw. Großbildschirm an der linken Wand
  if (level <= 2) {
    const t = signTexture((ctx, w, h) => {
      ctx.fillStyle = "#6b4424"; ctx.fillRect(0, 0, w, h); ctx.fillStyle = "#1f3a2d"; ctx.fillRect(18, 18, w - 36, h - 36);
      ctx.fillStyle = "rgba(255,255,255,.88)"; ctx.textAlign = "center"; ctx.font = `600 64px ${f.display}`; ctx.fillText(info.name, w / 2, 100);
      ctx.fillRect(70, 120, w - 140, 4); ctx.font = `500 56px ${f.display}`;
      ["501", "441", "321", "180!"].forEach((s, i) => ctx.fillText(s, w / 2, 200 + i * 72));
    }, 512, 512);
    onLeft(t, 1.2, 1.2, 2.2, 1.6);
  } else {
    const screen = signTexture((ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, "#1b0f2e"); g.addColorStop(1, "#0b1a2e"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.textAlign = "center"; ctx.shadowColor = PINK; ctx.shadowBlur = 30; ctx.fillStyle = PINK; ctx.font = `700 200px ${f.display}`; ctx.fillText("180", w / 2, 250);
      ctx.shadowColor = CYAN; ctx.fillStyle = CYAN; ctx.font = `600 64px ${f.display}`; ctx.fillText(info.name, w / 2, 350);
    }, 768, 432);
    block(0, 1.6, 0.08, 2.3, 1.35, M("#0b0b10", { roughness: 0.3 }), 1.1, 0.03);
    const p = onLeft(screen, 2.15, 1.2, 2.75, 1.775, { emissive: "#ffffff", emissiveMap: screen, emissiveIntensity: 0.9 });
    p.position.x = 0.09;
  }
  // Kellerfenster
  if (level === 0) {
    const win = signTexture((ctx, w, h) => { ctx.fillStyle = "#3d3a36"; ctx.fillRect(0, 0, w, h); const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#b9d6ea"); g.addColorStop(1, "#7fa2b8"); ctx.fillStyle = g; ctx.fillRect(12, 12, w / 2 - 18, h - 24); ctx.fillRect(w / 2 + 6, 12, w / 2 - 18, h - 24); }, 256, 96);
    onLeft(win, 1.0, 0.38, 4.6, 2.6, { emissive: "#9ec4dc", emissiveMap: win, emissiveIntensity: 0.4 });
    // Kisten
    const crate = M("#b58a55", { roughness: 0.85 });
    block(6.2, 6.2, 0.8, 0.8, 0.6, crate); block(6.35, 6.35, 0.5, 0.5, 0.4, M("#9a7446"), 0.6);
    block(6.9, 5.2, 0.6, 0.6, 0.45, crate);
    // alter Hocker
    cyl(0.18, 0.18, 0.04, M("#7a5a3a"), 2.2, 0.6, 5.0); for (const a of [0, 2.1, 4.2]) cyl(0.015, 0.02, 0.6, M("#555"), 2.2 + Math.cos(a) * 0.12, 0.3, 5.0 + Math.sin(a) * 0.12, 6);
  }
  // Stehlampe (Stufe 1)
  if (level === 1) {
    cyl(0.16, 0.18, 0.03, M("#222"), 0.5, 0.015, 3.3); cyl(0.015, 0.015, 1.6, M("#222", { metalness: 0.6 }), 0.5, 0.8, 3.3, 8);
    cyl(0.12, 0.22, 0.28, M("#f2e3c0", { emissive: "#ffcf80", emissiveIntensity: 0.6, side: THREE.DoubleSide }), 0.5, 1.68, 3.3);
    const l = new THREE.PointLight("#ffcf8a", 3, 5, 1.6); l.position.set(0.5, 1.55, 3.3); add(l);
    // Teppich und Sessel
    block(1.1, 4.4, 2.6, 2.2, 0.015, M("#6d2e3a", { roughness: 1 }), 0, 0.005);
    const leather = M("#5b3a28", { roughness: 0.45 });
    block(0.35, 5.0, 0.9, 0.9, 0.42, leather, 0, 0.08); block(0.25, 5.0, 0.22, 0.9, 0.95, leather, 0, 0.08);
    block(0.35, 4.85, 0.9, 0.18, 0.62, leather, 0, 0.06); block(0.35, 5.87, 0.9, 0.18, 0.62, leather, 0, 0.06);
  }
  // Couch, Couchtisch und Teppich ab Stufe 2
  if (level >= 2) {
    const col = level >= 4 ? "#2b2b36" : level === 3 ? "#3b3557" : "#7b8b7e";
    const cm = M(col, { roughness: 0.9 }), cd = M(shade(col, -0.2), { roughness: 0.9 });
    block(0.05, 4.4, 1.25, 2.4, 0.26, cd, 0.06, 0.06);           // Sockel
    for (const z of [4.4, 6.5]) block(0.05, z, 1.25, 0.3, 0.68, cm, 0.06, 0.08); // Lehnen
    block(0.05, 4.65, 0.32, 1.9, 0.95, cm, 0.06, 0.08);         // Rücken
    for (const z of [4.72, 5.65]) block(0.36, z, 0.86, 0.9, 0.16, cm, 0.32, 0.07); // Sitzkissen
    for (const z of [4.72, 5.65]) { const b = block(0.33, z, 0.22, 0.86, 0.48, cm, 0.46, 0.09); b.rotation.z = -0.12; }
    for (const [x, z] of [[0.15, 4.5], [1.2, 4.5], [0.15, 6.7], [1.2, 6.7]]) cyl(0.025, 0.02, 0.06, M("#111"), x, 0.03, z, 8);
    const pil = block(0.45, 4.8, 0.14, 0.4, 0.4, M(PINK, { roughness: 0.8 }), 0.5, 0.12); pil.rotation.z = -0.2;
    // Kissen-Logo
    const pl = signTexture((ctx, w, h) => { ctx.fillStyle = PINK; ctx.fillRect(0, 0, w, h); ctx.fillStyle = "#fff"; ctx.font = `120px ${f.script}`; ctx.textAlign = "center"; ctx.fillText("26", w / 2, h / 2 + 40); }, 256, 256);
    const plp = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), M("#fff", { map: keep(pl) })); plp.position.set(0.53, 0.7, 5.0); plp.rotation.set(0, Math.PI / 2, -0.2); add(plp);
    // Teppich
    block(1.45, 4.3, 2.6, 2.6, 0.012, M(level >= 3 ? "#1b1730" : "#2f2340", { roughness: 1 }), 0, 0.004);
    const rugLine = M(level >= 3 ? CYAN : PINK, { emissive: level >= 3 ? CYAN : PINK, emissiveIntensity: 0.3 });
    block(1.55, 4.4, 2.4, 0.03, 0.016, rugLine, 0, 0.002); block(1.55, 6.77, 2.4, 0.03, 0.016, rugLine, 0, 0.002);
    block(1.55, 4.4, 0.03, 2.4, 0.016, rugLine, 0, 0.002); block(3.92, 4.4, 0.03, 2.4, 0.016, rugLine, 0, 0.002);
    // Couchtisch mit Getränk
    block(1.75, 5.15, 0.75, 1.1, 0.05, M("#1d1d24", { roughness: 0.2, metalness: 0.3 }), 0.38, 0.02);
    for (const [x, z] of [[1.8, 5.2], [2.45, 5.2], [1.8, 6.2], [2.45, 6.2]]) cyl(0.02, 0.02, 0.38, M("#333", { metalness: 0.7 }), x, 0.19, z, 8);
    cyl(0.035, 0.03, 0.12, M("#f6c44a", { transparent: true, opacity: 0.85, roughness: 0.1 }), 2.1, 0.49, 5.5, 12);
    block(1.9, 5.85, 0.3, 0.2, 0.02, M("#111"), 0.43, 0.005);
  }
  // Bar mit Hockern ab Stufe 2
  if (level >= 2) {
    const front = M(level >= 4 ? "#1b1b22" : "#5a3a22", { roughness: 0.5 });
    block(6.45, 5.3, 1.2, 1.35, 1.05, front, 0, 0.03);
    block(6.35, 5.2, 1.4, 1.55, 0.05, M("#1e1e26", { roughness: 0.15, metalness: 0.3 }), 1.05, 0.02);
    block(6.42, 5.28, 0.02, 1.4, 0.03, glow(level >= 3 ? CYAN : PINK, 3), 0.95, 0.005);
    const colors = ["#2e7d32", "#8d3b2f", "#5fe3f0", "#ffd23f", "#d63ce0", "#7a5230"];
    colors.forEach((c, i) => {
      const b = cyl(0.04, 0.045, 0.24, M(c, { transparent: true, opacity: 0.85, roughness: 0.1 }), 7.2 + (i % 2) * 0.18, 1.22, 5.4 + i * 0.2, 12);
      cyl(0.015, 0.02, 0.08, M(c), b.position.x, 1.38, b.position.z, 8);
    });
    // Regal hinter der Bar an der Wand? Barhocker
    for (const z of [5.35, 6.65]) {
      cyl(0.17, 0.17, 0.07, M(PINK, { roughness: 0.4 }), 6.1, 0.78, z, 20);
      cyl(0.025, 0.025, 0.75, M("#9aa0aa", { metalness: 0.8, roughness: 0.3 }), 6.1, 0.38, z, 8);
      cyl(0.17, 0.19, 0.02, M("#9aa0aa", { metalness: 0.8, roughness: 0.3 }), 6.1, 0.01, z, 20);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 6, 20), M("#9aa0aa", { metalness: 0.8, roughness: 0.3 })); ring.rotation.x = Math.PI / 2; ring.position.set(6.1, 0.3, z); add(ring);
    }
    const barLight = new THREE.PointLight(level >= 3 ? CYAN : "#ffb0f0", 1.6, 3, 1.5); barLight.position.set(6.9, 1.8, 5.9); add(barLight);
  }
  // Neon-Schriftzug und Poster ab Stufe 2
  if (level >= 2) {
    const neon = neonText("Club26", PINK, CYAN, 4);
    const p = onBack(neon, 2.1, 0.66, 6.6, 2.35, { transparent: true, emissive: "#ffffff", emissiveMap: neon, emissiveIntensity: 1.6 });
    anims.push((t) => { (p.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5 + (Math.sin(t * 40) > 0.97 ? -0.8 : 0) + Math.sin(t * 2) * 0.08; });
    const nl = new THREE.PointLight(PINK, 1.8, 3.5, 1.5); nl.position.set(6.6, 2.3, 0.5); add(nl);
    const poster = signTexture((ctx, w, h) => {
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.fillStyle = "#1f8f9c"; ctx.fillRect(14, 14, w - 28, h - 28);
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = `700 150px ${f.display}`; ctx.fillText("180", w / 2, h / 2 + 20);
      ctx.font = `600 30px ${f.display}`; ctx.fillText("ONE HUNDRED", w / 2, h / 2 + 80); ctx.fillText("AND EIGHTY", w / 2, h / 2 + 115);
    }, 360, 480);
    onBack(poster, 0.54, 0.72, 2.95, 2.55);
  }
  // Streaming-Setup ab Stufe 3
  if (level >= 3) {
    // Schreibtisch an der hinteren Wand rechts
    const top = M("#1c1c24", { roughness: 0.25, metalness: 0.2 });
    block(5.95, 0.4, 1.9, 0.85, 0.05, top, 0.74, 0.02);
    for (const x of [6.0, 7.75]) block(x, 0.45, 0.06, 0.75, 0.74, M("#111"), 0, 0.01);
    block(5.98, 1.2, 1.84, 0.02, 0.025, glow(PINK, 3), 0.72, 0.005);
    // Monitore
    const scr = (draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) => signTexture(draw, 512, 288);
    const live = scr((ctx, w, h) => { ctx.fillStyle = "#101828"; ctx.fillRect(0, 0, w, h); ctx.fillStyle = "#e5303f"; ctx.fillRect(20, 20, 120, 50); ctx.fillStyle = "#fff"; ctx.font = `700 40px ${f.display}`; ctx.fillText("LIVE", 38, 60); ctx.fillStyle = PINK; ctx.font = `700 120px ${f.display}`; ctx.textAlign = "center"; ctx.fillText("180", w / 2, 210); });
    const chat = scr((ctx, w, h) => { ctx.fillStyle = "#0c1420"; ctx.fillRect(0, 0, w, h); ctx.fillStyle = CYAN; for (let i = 0; i < 8; i++) { ctx.globalAlpha = 0.5 + (i % 3) * 0.2; ctx.fillRect(24, 24 + i * 32, 120 + ((i * 97) % 300), 14); } });
    [[6.45, live], [7.3, chat]].forEach(([x, t], i) => {
      const xx = x as number;
      block(xx - 0.4, 0.62, 0.8, 0.04, 0.47, M("#0a0a0e", { roughness: 0.3 }), 1.02, 0.015).rotation.y = i ? -0.15 : 0.15;
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.42), M("#fff", { map: keep(t as THREE.Texture), emissive: "#fff", emissiveMap: t as THREE.Texture, emissiveIntensity: 1.0 }));
      s.position.set(xx, 1.255, 0.665); s.rotation.y = i ? -0.15 : 0.15; add(s);
      cyl(0.02, 0.02, 0.24, M("#222"), xx, 0.9, 0.6, 8);
    });
    // Tastatur, Mikro
    block(6.55, 0.95, 0.5, 0.16, 0.02, M("#16161c"), 0.79, 0.005);
    block(6.57, 0.97, 0.46, 0.12, 0.004, glow("#8a7bff", 1.2), 0.81, 0.001);
    cyl(0.03, 0.03, 0.12, M("#222", { metalness: 0.5 }), 7.6, 0.95, 0.9, 12);
    // Gaming-Stuhl
    const chairM = M("#18161f", { roughness: 0.5 }), chairA = M(PINK, { roughness: 0.5 });
    block(6.65, 1.75, 0.5, 0.5, 0.1, chairM, 0.42, 0.04);
    block(6.65, 2.2, 0.5, 0.1, 0.8, chairM, 0.5, 0.04);
    block(6.75, 2.21, 0.3, 0.1, 0.7, chairA, 0.55, 0.03);
    cyl(0.04, 0.04, 0.32, M("#777", { metalness: 0.8 }), 6.9, 0.26, 2.0, 8);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const leg = block(6.9 - 0.02, 2.0 - 0.02, 0.04, 0.32, 0.04, M("#222"), 0.06, 0.01); leg.position.set(6.9 + Math.sin(a) * 0.15, 0.08, 2.0 + Math.cos(a) * 0.15); leg.rotation.y = a; }
    // Kamera auf Stativ und Ringlicht
    for (const a of [0, 2.1, 4.2]) { const l = cyl(0.012, 0.012, 1.35, M("#222"), 1.5 + Math.cos(a) * 0.18, 0.66, 2.4 + Math.sin(a) * 0.18, 6); l.rotation.set(Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15); }
    const cam = block(1.4, 2.32, 0.24, 0.16, 0.16, M("#111", { roughness: 0.3 }), 1.32, 0.03); cam.rotation.y = 0.8;
    const lens = cyl(0.05, 0.05, 0.08, M("#222", { roughness: 0.1, metalness: 0.5 }), 1.62, 1.4, 2.28, 16); lens.rotation.set(Math.PI / 2, 0, 0.8); lens.rotation.order = "YXZ"; lens.rotation.y = 0.8;
    const rec = cyl(0.015, 0.015, 0.01, glow("#ff2a3a", 4), 1.48, 1.5, 2.3, 8);
    anims.push((t) => { rec.visible = Math.sin(t * 4) > 0; });
    cyl(0.012, 0.012, 1.5, M("#222"), 5.3, 0.75, 1.2, 6); cyl(0.18, 0.2, 0.02, M("#222"), 5.3, 0.01, 1.2, 16);
    const rl = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 10, 40), glow("#ffffff", 0.9)); rl.position.set(5.3, 1.6, 1.2); rl.rotation.y = -0.6; add(rl);
  }
  // Profi-Studio: Bühne, Scheinwerfer, ON AIR, Sponsorenwand
  if (level >= 4) {
    block(STAGE.x0, STAGE.z0, STAGE.x1 - STAGE.x0, STAGE.z1 - STAGE.z0, STAGE.h, M("#1a1622", { roughness: 0.3, metalness: 0.2 }), 0, 0.01);
    block(STAGE.x0, STAGE.z1 - 0.03, STAGE.x1 - STAGE.x0, 0.03, 0.03, glow(PINK, 3), STAGE.h - 0.03, 0.005);
    block(STAGE.x1 - 0.03, STAGE.z0, 0.03, STAGE.z1, 0.03, glow(PINK, 3), STAGE.h - 0.03, 0.005);
    // Sponsorenwand hinter dem Board
    const sp = signTexture((ctx, w, h) => {
      ctx.fillStyle = "#0e0b14"; ctx.fillRect(0, 0, w, h);
      ctx.font = `700 46px ${f.display}`; ctx.fillStyle = "rgba(255,255,255,.12)";
      for (let y = 0; y < 8; y++) for (let x = 0; x < 5; x++) ctx.fillText(x % 2 ? "SCORE26" : "CLUB26", x * 230 + (y % 2) * 110 - 40, 60 + y * 90);
      ctx.strokeStyle = PINK; ctx.lineWidth = 8; ctx.strokeRect(4, 4, w - 8, h - 8);
    }, 1024, 720);
    onBack(sp, 2.6, 1.85, BOARD.x, 1.75, { emissive: "#ffffff", emissiveMap: sp, emissiveIntensity: 0.25 });
    // ON AIR
    const oa = signTexture((ctx, w, h) => { ctx.fillStyle = "#e5303f"; ctx.fillRect(0, 0, w, h); ctx.fillStyle = "#fff"; ctx.font = `700 110px ${f.display}`; ctx.textAlign = "center"; ctx.fillText("ON AIR", w / 2, h / 2 + 38); }, 512, 180);
    const onair = onBack(oa, 0.9, 0.32, 1.2, 2.7, { emissive: "#ffffff", emissiveMap: oa, emissiveIntensity: 1.2 });
    anims.push((t) => { (onair.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0 + Math.sin(t * 3) * 0.3; });
    // Scheinwerfer
    for (const [x, col] of [[2.9, "#ffffff"], [5.1, "#ffe0ff"]] as const) {
      const head = cyl(0.1, 0.07, 0.2, M("#111", { metalness: 0.6 }), x, WALL_H - 0.15, 1.2, 12); head.rotation.x = 0.5;
      const s = new THREE.SpotLight(col, 6, 9, 0.38, 0.7, 1.4); s.position.set(x, WALL_H - 0.2, 1.3); s.target.position.set(BOARD.x, 0, OCHE_Z + 0.3); s.castShadow = false; add(s); add(s.target);
    }
  }

  // ---------------- Grundlicht ----------------
  const hemi = new THREE.HemisphereLight(level >= 3 ? "#8a7bff" : "#fff4e6", level >= 3 ? "#1a1030" : "#3a2a20", [1.5, 1.7, 1.45, 1.6, 1.3][level]);
  add(hemi);
  const key = new THREE.DirectionalLight(level >= 3 ? "#d8d0ff" : "#ffe9cc", [1.9, 2.2, 1.7, 1.3, 1.0][level]);
  key.position.set(9, 12, 7); key.target.position.set(4, 0, 4);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera as THREE.OrthographicCamera; sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -8; sc.near = 1; sc.far = 30;
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
  add(key); add(key.target);
  if (level >= 3) { const fill = new THREE.PointLight(PINK, 2.5, 7, 1.5); fill.position.set(1.5, 2.4, 6.5); add(fill); }

  return {
    group,
    animate: (t) => anims.forEach((a) => a(t)),
    floorAt: (x, z) => (level >= 4 && x >= STAGE.x0 && x <= STAGE.x1 && z >= STAGE.z0 && z <= STAGE.z1 ? STAGE.h : 0),
    dispose: () => {
      group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); });
      toDispose.forEach((d) => d.dispose());
    },
  };
}
