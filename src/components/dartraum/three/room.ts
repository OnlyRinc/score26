// Der Dartraum als 3D-Diorama. 1 Einheit = 1 Meter. Boden 8 x 8, Board an der hinteren Wand (z = 0) bei x = 4.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { CYAN, GOLD, PINK, boardTexture, brickTexture, concreteTexture, fonts, panelTexture, shade, signTexture, tileTexture, woodTexture } from "./textures";

export const N = 8, WALL_H = 3.1;
export const BOARD = new THREE.Vector3(4, 1.73, 0.06);
export const OCHE_Z = 2.37;
export const STAGE = { x0: 2.6, x1: 5.4, z0: 0, z1: 5.2, h: 0.1 };

export interface RoomInfo { name: string; trophies: number; medals: number }
export interface BuiltRoom {
  group: THREE.Group;
  animate: (t: number) => void;
  dispose: () => void;
}

/** Fertige Möbel: KayKit Furniture Bits (Kay Lousberg, CC0). Eine Datei, jedes Möbel ist ein benannter Knoten. */
let kitPromise: Promise<THREE.Object3D> | null = null;
export function loadFurniture(): Promise<THREE.Object3D> {
  if (kitPromise) return kitPromise;
  const l = new GLTFLoader(); l.setMeshoptDecoder(MeshoptDecoder);
  kitPromise = l.loadAsync("/models/dartraum/furniture.glb").then((g) => g.scene);
  kitPromise.catch(() => { kitPromise = null; });
  return kitPromise;
}

/** Grundraum: Wände, Boden, Board, Pokalregal und Licht. level = Raum-Stil (0 Keller bis 4 Arena). Möbel kommen aus items.ts. */
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
  // ---------------- Dartboard ----------------
  const bt = keep(boardTexture());
  const boardMats = [M("#1a1a1a", { roughness: 0.9 }), M("#fff", { map: bt, roughness: 0.85 }), M("#111")];
  const board = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.04, 64), boardMats);
  board.rotation.x = Math.PI / 2; board.position.set(BOARD.x, BOARD.y, 0.04); board.castShadow = true; board.receiveShadow = true;
  // Textur so drehen, dass die 20 oben steht
  bt.center.set(0.5, 0.5); bt.rotation = Math.PI;
  add(board);
  // Licht aufs Board
  const spot = new THREE.SpotLight(level === 0 ? "#ffd9a0" : "#ffffff", level === 0 ? 4 : 1.6, 8, 0.32, 0.6, 1.6);
  spot.position.set(BOARD.x, 2.95, 1.6); spot.target.position.copy(BOARD); add(spot); add(spot.target);
  if (level === 0) {
    // nackte Glühbirne
    cyl(0.004, 0.004, 0.5, M("#222"), BOARD.x, WALL_H - 0.25, 1.4, 6);
    const bulb = cyl(0.05, 0.05, 0.1, glow("#ffe4a8", 4), BOARD.x, WALL_H - 0.55, 1.4, 12);
    anims.push((t) => { (bulb.material as THREE.MeshStandardMaterial).emissiveIntensity = 3.6 + Math.sin(t * 23) * 0.2 * (Math.sin(t * 1.3) > 0.95 ? 3 : 0.3); });
  }

  // Abwurflinie
  block(BOARD.x - 0.45, OCHE_Z - 0.02, 0.9, 0.04, 0.035, level >= 3 ? glow(CYAN, 2) : M(level >= 1 ? "#f4f4f6" : "#e8e2d0"), 0, 0.01);

  // ---------------- Pokalregal (immer da) ----------------
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
  // ---------------- Grundlicht ----------------
  const hemi = new THREE.HemisphereLight(level >= 3 ? "#8a7bff" : "#fff4e6", level >= 3 ? "#1a1030" : "#3a2a20", [1.5, 1.7, 1.45, 1.6, 1.3][level]);
  add(hemi);
  const key = new THREE.DirectionalLight(level >= 3 ? "#d8d0ff" : "#ffe9cc", [1.9, 2.2, 1.7, 1.3, 1.0][level]);
  key.position.set(9, 12, 7); key.target.position.set(4, 0, 4);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera as THREE.OrthographicCamera; sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -8; sc.near = 1; sc.far = 30;
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
  add(key); add(key.target);

  return {
    group,
    animate: (t) => anims.forEach((a) => a(t)),
    dispose: () => {
      group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); });
      toDispose.forEach((d) => d.dispose());
    },
  };
}
