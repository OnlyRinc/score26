// Die Möbel des Baukastens in 3D. Jedes Möbel wird um seinen eigenen Mittelpunkt gebaut (Vorderseite nach +z).
// Wandmöbel: Rückseite liegt bei z = 0, Höhe ist fest. Board-Zubehör (fixed) wird direkt in Raumkoordinaten gebaut.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { FURNITURE_BY_ID, footprint, localToRoom, type FurnitureUse, type Placed } from "@/lib/dartraum/furniture";
import { CYAN, PINK, foamTexture, fonts, neonText, signTexture } from "./textures";

export const BOARD_POS = new THREE.Vector3(4, 1.73, 0.06);
export const OCHE = 2.37;
export const STAGE_RECT = { x0: 2.6, x1: 5.4, z0: 0, z1: 5.2, h: 0.1 };
const WALL_H = 3.1, N = 8;

interface Ctx { kit?: THREE.Object3D; info: { name: string }; keep: <T extends { dispose: () => void }>(x: T) => T; anims: ((t: number) => void)[] }

function helpers(g: THREE.Group, c: Ctx) {
  const M = (color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => c.keep(new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o }));
  const add = <T extends THREE.Object3D>(o: T) => { g.add(o); return o; };
  /** Kiste um ihren Mittelpunkt (x, z), Unterkante bei y0 */
  const box = (w: number, h: number, d: number, m: THREE.Material | THREE.Material[], x: number, y0: number, z: number, r = 0.02) => {
    const geo = r > 0 ? new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.01, h / 2.01, d / 2.01)) : new THREE.BoxGeometry(w, h, d);
    const o = new THREE.Mesh(geo, m); o.position.set(x, y0 + h / 2, z); o.castShadow = true; o.receiveShadow = true; return add(o);
  };
  const cyl = (rt: number, rb: number, h: number, m: THREE.Material, x: number, y: number, z: number, seg = 20) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return add(o);
  };
  const glow = (color: string, intensity = 2) => M(color, { emissive: color, emissiveIntensity: intensity, roughness: 0.3 });
  /** Fertiges KayKit-Möbel */
  const put = (name: string, x = 0, z = 0, rot = 0, scale: number | [number, number, number] = 0.75, y = 0) => {
    const src = c.kit?.getObjectByName(name);
    if (!src) return null;
    const o = src.clone(true);
    o.position.set(x, y, z); o.rotation.y = rot;
    if (Array.isArray(scale)) o.scale.set(...scale); else o.scale.setScalar(scale);
    o.traverse((m) => { const mm = m as THREE.Mesh; if (mm.isMesh) { mm.castShadow = true; mm.receiveShadow = true; } });
    return add(o);
  };
  /** Flaches Bild an der Wand (Rückseite z = 0) */
  const plate = (t: THREE.Texture, w: number, h: number, x: number, y: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => {
    c.keep(t);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M("#fff", { map: t, roughness: 0.8, ...o })); p.position.set(x, y, 0.014); p.receiveShadow = true; return add(p);
  };
  return { M, add, box, cyl, glow, put, plate };
}

type Builder = (h: ReturnType<typeof helpers>, c: Ctx, style: number) => void;

const BUILD: Record<string, Builder> = {
  // ---- Sitzen
  couch: (h) => { h.put("couch_pillows", 0, -0.02); },
  armchair: (h) => { h.put("armchair_pillows", 0, -0.02); },
  chair: (h) => { h.put("chair_A", 0, 0.05); },
  stool: (h) => {
    h.cyl(0.18, 0.18, 0.04, h.M("#7a5a3a"), 0, 0.6, 0);
    for (const a of [0, 2.1, 4.2]) h.cyl(0.015, 0.02, 0.6, h.M("#555"), Math.cos(a) * 0.12, 0.3, Math.sin(a) * 0.12, 6);
  },
  barstool: (h) => {
    const steel = h.M("#9aa0aa", { metalness: 0.8, roughness: 0.3 });
    h.cyl(0.17, 0.17, 0.07, h.M(PINK, { roughness: 0.4 }), 0, 0.78, 0);
    h.cyl(0.025, 0.025, 0.75, steel, 0, 0.38, 0, 8);
    h.cyl(0.17, 0.19, 0.02, steel, 0, 0.01, 0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 6, 20), steel); ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.3, 0); h.add(ring);
  },
  // ---- Tische
  coffeetable: (h) => {
    h.put("table_low", 0, 0, 0, 0.6);
    h.cyl(0.035, 0.03, 0.12, h.M("#f6c44a", { transparent: true, opacity: 0.85, roughness: 0.1 }), 0.25, 0.36, 0.1, 12);
  },
  sidetable: (h) => { h.put("cabinet_small_decorated", 0, 0, 0, 0.6); },
  sideboard: (h) => { h.put("cabinet_medium_decorated", 0, 0, 0, 0.75); },
  bar: (h, _c, style) => {
    const front = h.M(style >= 4 ? "#1b1b22" : "#5a3a22", { roughness: 0.5 });
    h.box(1.35, 1.05, 1.2, front, 0, 0, 0, 0.03);
    h.box(1.55, 0.05, 1.4, h.M("#1e1e26", { roughness: 0.15, metalness: 0.3 }), 0, 1.05, 0.05, 0.02);
    h.box(1.4, 0.03, 0.02, h.glow(style >= 3 ? CYAN : PINK, 3), 0, 0.95, 0.61, 0.005);
    ["#2e7d32", "#8d3b2f", "#5fe3f0", "#ffd23f", "#d63ce0", "#7a5230"].forEach((col, i) => {
      const b = h.cyl(0.04, 0.045, 0.24, h.M(col, { transparent: true, opacity: 0.85, roughness: 0.1 }), -0.5 + i * 0.2, 1.22, -0.35 - (i % 2) * 0.15, 12);
      h.cyl(0.015, 0.02, 0.08, h.M(col), b.position.x, 1.38, b.position.z, 8);
    });
    const l = new THREE.PointLight(style >= 3 ? CYAN : "#ffb0f0", 1.6, 3, 1.5); l.position.set(0, 1.8, 0.4); h.add(l);
  },
  // ---- Deko
  plant: (h) => { h.put("cactus_medium_A", 0, 0, 0.4, 0.8); },
  plant_small: (h) => { h.put("cactus_small_A", 0, 0, 0.3, 0.8); },
  lamp: (h) => {
    h.put("lamp_standing", 0, 0, 0, 0.7);
    const l = new THREE.PointLight("#ffcf8a", 2.4, 4.5, 1.6); l.position.set(0, 1.55, 0); h.add(l);
  },
  crates: (h) => {
    const crate = h.M("#b58a55", { roughness: 0.85 });
    h.box(0.8, 0.6, 0.8, crate, 0, 0, 0); h.box(0.5, 0.4, 0.5, h.M("#9a7446"), 0.05, 0.6, 0.05);
  },
  rug: (h) => { h.put("rug_rectangle_stripes_A", 0, 0, 0, 0.9); },
  rug_oval: (h) => { h.put("rug_oval_A", 0, 0, 0, 0.85); },
  rug_blue: (h) => { h.put("rug_rectangle_stripes_B", 0, 0, 0, 0.9); },
  // ---- Wand
  chalkboard: (h, c) => {
    const f = fonts();
    const t = signTexture((ctx, w, hh) => {
      ctx.fillStyle = "#6b4424"; ctx.fillRect(0, 0, w, hh); ctx.fillStyle = "#1f3a2d"; ctx.fillRect(18, 18, w - 36, hh - 36);
      ctx.fillStyle = "rgba(255,255,255,.88)"; ctx.textAlign = "center"; ctx.font = `600 64px ${f.display}`; ctx.fillText(c.info.name, w / 2, 100);
      ctx.fillRect(70, 120, w - 140, 4); ctx.font = `500 56px ${f.display}`;
      ["501", "441", "321", "180!"].forEach((s, i) => ctx.fillText(s, w / 2, 200 + i * 72));
    }, 512, 512);
    h.plate(t, 1.2, 1.2, 0, 1.6);
  },
  poster: (h) => {
    const f = fonts();
    const t = signTexture((ctx, w, hh) => {
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, hh); ctx.fillStyle = "#1f8f9c"; ctx.fillRect(14, 14, w - 28, hh - 28);
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = `700 150px ${f.display}`; ctx.fillText("180", w / 2, hh / 2 + 20);
      ctx.font = `600 30px ${f.display}`; ctx.fillText("ONE HUNDRED", w / 2, hh / 2 + 80); ctx.fillText("AND EIGHTY", w / 2, hh / 2 + 115);
    }, 360, 480);
    h.plate(t, 0.54, 0.72, 0, 2.2);
  },
  neon: (h, c) => {
    const t = neonText("Club26", PINK, CYAN, 4);
    const p = h.plate(t, 2.1, 0.66, 0, 2.35, { transparent: true, emissive: "#ffffff", emissiveMap: t, emissiveIntensity: 1.6 });
    c.anims.push((tt) => { (p.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5 + (Math.sin(tt * 40) > 0.97 ? -0.8 : 0) + Math.sin(tt * 2) * 0.08; });
    const l = new THREE.PointLight(PINK, 1.8, 3.5, 1.5); l.position.set(0, 2.3, 0.5); h.add(l);
  },
  shelf: (h) => { h.put("shelf_B_large_decorated", 0, 0.02, 0, 0.75, 1.3); },
  tv: (h, c) => {
    const f = fonts();
    const t = signTexture((ctx, w, hh) => {
      const g = ctx.createLinearGradient(0, 0, w, hh); g.addColorStop(0, "#1b0f2e"); g.addColorStop(1, "#0b1a2e"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, hh);
      ctx.textAlign = "center"; ctx.shadowColor = PINK; ctx.shadowBlur = 30; ctx.fillStyle = PINK; ctx.font = `700 200px ${f.display}`; ctx.fillText("180", w / 2, 250);
      ctx.shadowColor = CYAN; ctx.fillStyle = CYAN; ctx.font = `600 64px ${f.display}`; ctx.fillText(c.info.name, w / 2, 350);
    }, 768, 432);
    h.box(2.3, 1.35, 0.08, h.M("#0b0b10", { roughness: 0.3 }), 0, 1.1, 0.04, 0.03);
    const p = h.plate(t, 2.15, 1.2, 0, 1.775, { emissive: "#ffffff", emissiveMap: t, emissiveIntensity: 0.9 }); p.position.z = 0.09;
  },
  window: (h) => {
    const t = signTexture((ctx, w, hh) => { ctx.fillStyle = "#3d3a36"; ctx.fillRect(0, 0, w, hh); const g = ctx.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, "#b9d6ea"); g.addColorStop(1, "#7fa2b8"); ctx.fillStyle = g; ctx.fillRect(12, 12, w / 2 - 18, hh - 24); ctx.fillRect(w / 2 + 6, 12, w / 2 - 18, hh - 24); }, 256, 96);
    h.plate(t, 1.0, 0.38, 0, 2.6, { emissive: "#9ec4dc", emissiveMap: t, emissiveIntensity: 0.4 });
  },
  // ---- Dartfluencer
  streamdesk: (h) => {
    const f = fonts();
    h.put("table_medium_long", 0, -0.55, 0, [0.63, 0.79, 0.42]);
    h.box(1.84, 0.025, 0.02, h.glow(PINK, 3), 0, 0.7, -0.13, 0.005);
    const scr = (draw: (ctx: CanvasRenderingContext2D, w: number, hh: number) => void) => signTexture(draw, 512, 288);
    const live = scr((ctx, w, hh) => { ctx.fillStyle = "#101828"; ctx.fillRect(0, 0, w, hh); ctx.fillStyle = "#e5303f"; ctx.fillRect(20, 20, 120, 50); ctx.fillStyle = "#fff"; ctx.font = `700 40px ${f.display}`; ctx.fillText("LIVE", 38, 60); ctx.fillStyle = PINK; ctx.font = `700 120px ${f.display}`; ctx.textAlign = "center"; ctx.fillText("180", w / 2, 210); });
    const chat = scr((ctx, w) => { ctx.fillStyle = "#0c1420"; ctx.fillRect(0, 0, w, 288); ctx.fillStyle = CYAN; for (let i = 0; i < 8; i++) { ctx.globalAlpha = 0.5 + (i % 3) * 0.2; ctx.fillRect(24, 24 + i * 32, 120 + ((i * 97) % 300), 14); } });
    [[-0.45, live], [0.4, chat]].forEach(([x, t], i) => {
      const xx = x as number;
      const frame = h.box(0.8, 0.47, 0.04, h.M("#0a0a0e", { roughness: 0.3 }), xx, 1.02, -0.76, 0.015); frame.rotation.y = i ? -0.15 : 0.15;
      const tex = t as THREE.Texture;
      const sc = h.plate(tex, 0.74, 0.42, xx, 1.255, { emissive: "#fff", emissiveMap: tex, emissiveIntensity: 1.0 });
      sc.position.z = -0.735; sc.rotation.y = i ? -0.15 : 0.15;
      h.cyl(0.02, 0.02, 0.24, h.M("#222"), xx, 0.9, -0.8, 8);
    });
    h.box(0.5, 0.02, 0.16, h.M("#16161c"), 0, 0.79, -0.35, 0.005);
    h.box(0.46, 0.004, 0.12, h.glow("#8a7bff", 1.2), 0, 0.81, -0.35, 0.001);
    h.cyl(0.03, 0.03, 0.12, h.M("#222", { metalness: 0.5 }), 0.7, 0.85, -0.45, 12);
    h.put("chair_A", 0, 0.67, Math.PI, 0.75);
  },
  camera: (h, c) => {
    for (const a of [0, 2.1, 4.2]) { const l = h.cyl(0.012, 0.012, 1.35, h.M("#222"), Math.cos(a) * 0.18, 0.66, Math.sin(a) * 0.18, 6); l.rotation.set(Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15); }
    h.box(0.24, 0.16, 0.16, h.M("#111", { roughness: 0.3 }), 0, 1.32, 0, 0.03);
    const lens = h.cyl(0.05, 0.05, 0.08, h.M("#222", { roughness: 0.1, metalness: 0.5 }), 0, 1.4, 0.12, 16); lens.rotation.x = Math.PI / 2;
    const rec = h.cyl(0.015, 0.015, 0.01, h.glow("#ff2a3a", 4), -0.08, 1.49, 0.02, 8);
    c.anims.push((t) => { rec.visible = Math.sin(t * 4) > 0; });
  },
  ringlight: (h) => {
    h.cyl(0.012, 0.012, 1.5, h.M("#222"), 0, 0.75, 0, 6); h.cyl(0.18, 0.2, 0.02, h.M("#222"), 0, 0.01, 0, 16);
    const rl = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 10, 40), h.glow("#ffffff", 0.9)); rl.position.set(0, 1.6, 0); h.add(rl);
  },
  foam: (h) => { h.box(2.0, 1.2, 0.08, h.M("#fff", { map: foamTexture("#3a2f5c") }), 0, 1.1, 0.04, 0.01); },
  onair: (h, c) => {
    const f = fonts();
    const t = signTexture((ctx, w, hh) => { ctx.fillStyle = "#e5303f"; ctx.fillRect(0, 0, w, hh); ctx.fillStyle = "#fff"; ctx.font = `700 110px ${f.display}`; ctx.textAlign = "center"; ctx.fillText("ON AIR", w / 2, hh / 2 + 38); }, 512, 180);
    const p = h.plate(t, 0.9, 0.32, 0, 2.7, { emissive: "#ffffff", emissiveMap: t, emissiveIntensity: 1.2 });
    c.anims.push((tt) => { (p.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0 + Math.sin(tt * 3) * 0.3; });
  },
  scoreboard: (h, c) => {
    const f = fonts();
    const t = signTexture((ctx, w, hh) => {
      ctx.fillStyle = "#07060b"; ctx.fillRect(0, 0, w, hh); ctx.fillStyle = PINK; ctx.fillRect(0, 0, w, 60);
      ctx.fillStyle = "#fff"; ctx.font = `700 40px ${f.display}`; ctx.textAlign = "left"; ctx.fillText(c.info.name, 24, 44);
      ctx.font = `700 170px ${f.display}`; ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText("501", w / 2, 230);
      ctx.font = `600 36px ${f.display}`; ctx.fillStyle = CYAN; ctx.fillText("Ø 87.4  ·  180s 3", w / 2, 290);
    }, 640, 320);
    h.box(1.4, 0.74, 0.06, h.M("#0b0b10", { roughness: 0.3 }), 0, 1.98, 0.03, 0.02);
    h.plate(t, 1.32, 0.66, 0, 2.35, { emissive: "#ffffff", emissiveMap: t, emissiveIntensity: 0.9 }).position.z = 0.065;
  },
};

/** Board-Zubehör, fest an seinem Platz (Raumkoordinaten) */
const FIXED: Record<string, Builder> = {
  surround: (h) => {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.03, 64), h.M("#060606", { roughness: 0.6 }));
    s.rotation.x = Math.PI / 2; s.position.set(BOARD_POS.x, BOARD_POS.y, 0.02); s.receiveShadow = true; h.add(s);
  },
  mat: (h, _c, style) => { h.box(1.2, 0.012, 3.3, h.M(style >= 3 ? "#1a1a22" : "#2a2a30", { roughness: 0.95 }), BOARD_POS.x, 0, 0.04 + 1.65, 0.005); },
  ledring: (h) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.035, 12, 64), h.glow("#dff6ff", 0.55));
    ring.position.set(BOARD_POS.x, BOARD_POS.y, 0.12); h.add(ring);
    const bl = new THREE.PointLight("#e8f6ff", 0.5, 2, 2); bl.position.set(BOARD_POS.x, BOARD_POS.y, 0.6); h.add(bl);
  },
  cabinet: (h) => {
    const f = fonts();
    const wood = h.M("#6b3f22", { roughness: 0.6 });
    const C = 0.8, B = BOARD_POS;
    h.box(2 * C, 2 * C, 0.015, wood, B.x, B.y - C, 0.0075, 0.005);
    for (const s of [-1, 1]) h.box(0.05, 2 * C, 0.14, wood, B.x + s * (C - 0.025), B.y - C, 0.07, 0.01);
    h.box(2 * C, 0.05, 0.14, wood, B.x, B.y + C - 0.05, 0.07, 0.01); h.box(2 * C, 0.05, 0.14, wood, B.x, B.y - C, 0.07, 0.01);
    const chalk = signTexture((ctx, w, hh) => { ctx.fillStyle = "#1d3a2c"; ctx.fillRect(0, 0, w, hh); ctx.font = `600 48px ${f.display}`; ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.textAlign = "center"; ["501", "441", "321", "180"].forEach((n, i) => ctx.fillText(n, w / 2, 90 + i * 100)); }, 256, 512);
    const cm = h.M("#fff", { map: chalk });
    for (const s of [-1, 1]) {
      const piv = new THREE.Group(); piv.position.set(B.x + s * C, B.y, 0.14); piv.rotation.y = s * 1.9;
      const d = new THREE.Mesh(new RoundedBoxGeometry(C, 2 * C, 0.04, 2, 0.01), [wood, wood, wood, wood, cm, wood]);
      d.position.set(-s * C / 2, 0, 0); d.castShadow = true; piv.add(d); h.add(piv);
    }
  },
  led: (h, _c, style) => {
    h.box(N - 0.1, 0.03, 0.03, h.glow(style === 4 ? PINK : CYAN, 3), N / 2, 0.12, 0.065, 0.01);
    h.box(0.03, 0.03, N - 0.1, h.glow(style === 4 ? CYAN : PINK, 3), 0.065, 0.12, N / 2, 0.01);
    h.box(N - 0.1, 0.03, 0.03, h.glow(PINK, 2.5), N / 2, WALL_H - 0.08, 0.065, 0.01);
    const fill = new THREE.PointLight(PINK, 2.5, 7, 1.5); fill.position.set(1.5, 2.4, 6.5); h.add(fill);
  },
  stage: (h) => {
    const S = STAGE_RECT;
    h.box(S.x1 - S.x0, S.h, S.z1 - S.z0, h.M("#1a1622", { roughness: 0.3, metalness: 0.2 }), (S.x0 + S.x1) / 2, 0, (S.z0 + S.z1) / 2, 0.01);
    h.box(S.x1 - S.x0, 0.03, 0.03, h.glow(PINK, 3), (S.x0 + S.x1) / 2, S.h - 0.03, S.z1 - 0.015, 0.005);
    h.box(0.03, 0.03, S.z1 - S.z0, h.glow(PINK, 3), S.x1 - 0.015, S.h - 0.03, (S.z0 + S.z1) / 2, 0.005);
    h.box(0.03, 0.03, S.z1 - S.z0, h.glow(PINK, 3), S.x0 + 0.015, S.h - 0.03, (S.z0 + S.z1) / 2, 0.005);
  },
  spots: (h) => {
    for (const [x, col] of [[2.9, "#ffffff"], [5.1, "#ffe0ff"]] as const) {
      const head = h.cyl(0.1, 0.07, 0.2, h.M("#111", { metalness: 0.6 }), x, WALL_H - 0.15, 1.2, 12); head.rotation.x = 0.5;
      const s = new THREE.SpotLight(col, 6, 9, 0.38, 0.7, 1.4); s.position.set(x, WALL_H - 0.2, 1.3); s.target.position.set(BOARD_POS.x, 0, OCHE + 0.3); h.add(s); h.add(s.target);
    }
  },
  sponsorwall: (h) => {
    const f = fonts();
    const sp = signTexture((ctx, w, hh) => {
      ctx.fillStyle = "#0e0b14"; ctx.fillRect(0, 0, w, hh);
      ctx.font = `700 46px ${f.display}`; ctx.fillStyle = "rgba(255,255,255,.12)";
      for (let y = 0; y < 8; y++) for (let x = 0; x < 5; x++) ctx.fillText(x % 2 ? "SCORE26" : "CLUB26", x * 230 + (y % 2) * 110 - 40, 60 + y * 90);
      ctx.strokeStyle = PINK; ctx.lineWidth = 8; ctx.strokeRect(4, 4, w - 8, hh - 8);
    }, 1024, 720);
    h.plate(sp, 2.6, 1.85, BOARD_POS.x, 1.75, { emissive: "#ffffff", emissiveMap: sp, emissiveIntensity: 0.25 }).position.z = 0.008;
  },
};

export interface UsePoint { uid: string; kind: FurnitureUse["kind"]; x: number; z: number; face: number; lift: number; front: [number, number] }

export interface BuiltItems {
  group: THREE.Group;
  /** Jedes aufgestellte Möbel als eigene Gruppe (userData.uid) zum Antippen und Verschieben */
  objects: Map<string, THREE.Group>;
  uses: UsePoint[];
  stage: boolean;
  animate: (t: number) => void;
  dispose: () => void;
}

/** Gruppe an die Stelle des Möbels setzen */
export function placeObject(o: THREE.Object3D, p: Placed) {
  const def = FURNITURE_BY_ID.get(p.id);
  if (!def || def.fixed) { o.position.set(0, 0, 0); o.rotation.y = 0; return; }
  if (def.wall) {
    if (p.rot % 2 === 0) { o.position.set(p.x, 0, 0); o.rotation.y = 0; }
    else { o.position.set(0, 0, p.z); o.rotation.y = Math.PI / 2; }
    return;
  }
  o.position.set(p.x, 0, p.z); o.rotation.y = (p.rot % 4) * (Math.PI / 2);
}

export function buildItems(layout: Placed[], style: number, kit: THREE.Object3D | undefined, info: { name: string }): BuiltItems {
  const group = new THREE.Group();
  const toDispose: { dispose: () => void }[] = [];
  const anims: ((t: number) => void)[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => { toDispose.push(x); return x; };
  const ctx: Ctx = { kit, info, keep, anims };
  const objects = new Map<string, THREE.Group>();
  const uses: UsePoint[] = [];
  for (const p of layout) {
    const def = FURNITURE_BY_ID.get(p.id);
    const b = def?.fixed ? FIXED[p.id] : BUILD[p.id];
    if (!def || !b) continue;
    const g = new THREE.Group(); g.userData.uid = p.uid;
    b(helpers(g, ctx), ctx, style);
    placeObject(g, p);
    group.add(g); objects.set(p.uid, g);
    if (def.use) {
      const [x, z] = localToRoom(p, def.use.dx, def.use.dz);
      const front = localToRoom(p, def.use.approach[0], def.use.approach[1]);
      uses.push({ uid: p.uid, kind: def.use.kind, x, z, face: (p.rot % 4) * (Math.PI / 2) + def.use.face, lift: def.use.lift, front });
    }
  }
  return {
    group, objects, uses, stage: layout.some((p) => p.id === "stage"),
    animate: (t) => anims.forEach((a) => a(t)),
    dispose: () => {
      group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !o.userData.kit) m.geometry.dispose(); });
      toDispose.forEach((d) => d.dispose());
    },
  };
}

/** Markierung unter dem Möbel beim Verschieben: grün = passt, rot = passt nicht */
export function footprintMarker(p: Placed, ok: boolean): THREE.Mesh {
  const r = footprint(p);
  const def = FURNITURE_BY_ID.get(p.id);
  const wall = def?.wall;
  const w = Math.max(0.3, r.x1 - r.x0), d = Math.max(0.3, r.z1 - r.z0);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: ok ? "#3ee08a" : "#ff3b5c", transparent: true, opacity: 0.45, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set((r.x0 + r.x1) / 2, wall ? 0.02 : 0.03, (r.z0 + r.z1) / 2); m.renderOrder = 5;
  return m;
}
