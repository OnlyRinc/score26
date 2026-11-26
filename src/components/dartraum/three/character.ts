// 3D-Spielerfigur aus einfachen, weich gerundeten Formen. Einheiten in Metern, Füße bei y = 0, Blick nach +z.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { BARREL_FINISH, HAIR_COLORS, PANTS, SHAFT_LENGTHS, SHOES, SKIN_TONES, type DartSetup, type Look } from "@/lib/dartraum/catalog";
import { flightPath, profile } from "../Dart";
import { jerseyTextures, shade, tex } from "./textures";

export type Pose3D = "stand" | "walk" | "throw" | "collect" | "sit" | "drink" | "desk" | "wave";

const mat = (color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...o });
const rbox = (w: number, h: number, d: number, r: number, seg = 4) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));

function mesh(geo: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = true; o.receiveShadow = true;
  return o;
}
/** Kapsel, die von ihrem Gelenk aus nach unten hängt */
function limb(len: number, r: number, m: THREE.Material) {
  const g = new THREE.CapsuleGeometry(r, Math.max(0.001, len - 2 * r), 6, 14);
  g.translate(0, -len / 2, 0);
  return mesh(g, m);
}

// ---------------- Dartpfeil ----------------
function flightTexture(d: DartSetup) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.scale(256 / 30, 256 / 36); ctx.translate(0, 18);
  const p = new Path2D(flightPath(d.flight, 30, true));
  ctx.fillStyle = d.flightColor; ctx.fill(p);
  ctx.save(); ctx.clip(p);
  ctx.fillStyle = d.flightColor2;
  if (d.flightDesign === "split") ctx.fillRect(0, -9, 30, 9);
  if (d.flightDesign === "stripe") { ctx.fillRect(9, -18, 5, 18); ctx.fillStyle = "#fff"; ctx.fillRect(16, -18, 2, 18); }
  if (d.flightDesign === "flame") ctx.fill(new Path2D("M0 -18 C6 -10 4 -6 10 -2 C8 -8 14 -10 12 -16 C18 -10 18 -4 22 0 Z"));
  if (d.flightDesign === "target") { ctx.lineWidth = 2; [12, 8, 4].forEach((r, i) => { ctx.strokeStyle = i % 2 ? "#fff" : d.flightColor2; ctx.beginPath(); ctx.arc(11, -6, r, 0, Math.PI * 2); ctx.stroke(); }); }
  if (d.flightDesign === "club26") { ctx.fillRect(0, -2.5, 30, 1.6); ctx.font = "9px 'Kaushan Script', cursive"; ctx.textAlign = "center"; ctx.fillText("26", 12, -6); }
  ctx.restore();
  ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.lineWidth = 0.6; ctx.stroke(p);
  // Spiegeln für die untere Hälfte
  const out = document.createElement("canvas"); out.width = 256; out.height = 512;
  const o = out.getContext("2d")!;
  o.drawImage(c, 0, 0, 256, 256); o.save(); o.translate(0, 512); o.scale(1, -1); o.drawImage(c, 0, 0, 256, 256); o.restore();
  const t = tex(out);
  return t;
}

/** Dart entlang +y (Spitze oben), Gesamtlänge etwa 0.16 m * scale */
export function buildDart(d: DartSetup, scale = 1) {
  const g = new THREE.Group();
  const fin = BARREL_FINISH.find((f) => f.id === d.finish) ?? BARREL_FINISH[0];
  const shaftLen = 0.035 * (SHAFT_LENGTHS.find((s) => s.id === d.shaft)?.len ?? 1);
  const barrelLen = d.barrel === "bomb" ? 0.04 : 0.05;
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new THREE.Vector2(profile(d.barrel, t) * 0.0016, t * barrelLen)); }
  const barrelMat = mat(fin.mid, { metalness: 0.85, roughness: 0.28, emissive: d.finish === "rainbow" ? "#3a2a60" : "#000" });
  const flightY = 0, shaftY = 0.03, barrelY = shaftY + shaftLen;
  const barrel = mesh(new THREE.LatheGeometry(pts, 20), barrelMat, 0, barrelY, 0);
  // Griffrillen
  if (d.grip !== "smooth") for (let i = 0; i < 6; i++) { const ring = mesh(new THREE.TorusGeometry(0.0058, 0.0009, 6, 20), mat(fin.dark, { metalness: 0.8, roughness: 0.4 }), 0, barrelY + barrelLen * (0.25 + i * 0.08), 0); ring.rotation.x = Math.PI / 2; g.add(ring); }
  const shaft = mesh(new THREE.CylinderGeometry(0.0035, 0.003, shaftLen, 12), mat(d.shaftColor, { roughness: 0.4 }), 0, shaftY + shaftLen / 2, 0);
  const point = mesh(new THREE.ConeGeometry(0.0022, 0.032, 10), mat("#e8ebf0", { metalness: 0.9, roughness: 0.2 }), 0, barrelY + barrelLen + 0.016, 0);
  const ft = flightTexture(d);
  const fm = new THREE.MeshStandardMaterial({ map: ft, side: THREE.DoubleSide, alphaTest: 0.5, transparent: false, roughness: 0.5 });
  for (const rot of [0, Math.PI / 2]) {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.036), fm);
    pl.rotation.z = Math.PI / 2; // Länge entlang y
    pl.rotation.y = rot;
    const holder = new THREE.Group(); holder.add(pl); holder.rotation.y = rot; pl.rotation.y = 0;
    pl.position.y = flightY + 0.034;
    pl.castShadow = true;
    g.add(holder);
  }
  g.add(barrel, shaft, point);
  g.scale.setScalar(scale);
  return g;
}

// ---------------- Figur ----------------
export interface Character {
  root: THREE.Group;
  /** Position der Wurfhand in Weltkoordinaten (für fliegende Pfeile) */
  handWorld: (v: THREE.Vector3) => THREE.Vector3;
  headWorld: (v: THREE.Vector3) => THREE.Vector3;
  update: (pose: Pose3D, phase: number, time: number, holding: boolean) => void;
  dispose: () => void;
}

export function buildCharacter(look: Look, name: string): Character {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };
  const skin = SKIN_TONES[look.skin] ?? SKIN_TONES[1];
  const hairC = HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[1];
  const pants = PANTS.find((p) => p.id === look.pants) ?? PANTS[0];
  const shoes = SHOES.find((s) => s.id === look.shoes) ?? SHOES[0];
  const j = look.jersey;

  const mSkin = track(mat(skin, { roughness: 0.6 }));
  const mSkinD = track(mat(shade(skin, -0.12), { roughness: 0.6 }));
  const mHair = track(mat(hairC, { roughness: look.hair === "slick" ? 0.35 : 0.85 }));
  const mPants = track(mat(pants.color, { roughness: 0.85 }));
  const mShoe = track(mat(shoes.upper, { roughness: 0.55 }));
  const mSole = track(mat(shoes.sole, { roughness: 0.7 }));
  const mAccent = track(mat(shoes.accent, { roughness: 0.5 }));
  const jt = jerseyTextures(j, name);
  [jt.front, jt.back, jt.side].forEach((t) => track(t));
  const mJF = track(new THREE.MeshStandardMaterial({ map: jt.front, roughness: 0.7 }));
  const mJB = track(new THREE.MeshStandardMaterial({ map: jt.back, roughness: 0.7 }));
  const mJS = track(new THREE.MeshStandardMaterial({ map: jt.side, roughness: 0.7 }));
  const mJTop = track(mat(j.primary, { roughness: 0.7 }));
  const sleeveCol = j.design === "panels" || j.design === "club26neon" ? j.secondary : j.primary;
  const mSleeve = track(mat(sleeveCol, { roughness: 0.7 }));
  const mCuff = track(mat(j.accent, { roughness: 0.6 }));
  const mCollar = track(mat(j.secondary, { roughness: 0.6 }));
  const mDark = track(mat("#1a1414", { roughness: 0.4 }));
  const mWhite = track(mat("#ffffff", { roughness: 0.3 }));

  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const HIP = 0.76;
  const hips = new THREE.Group(); hips.position.y = HIP; body.add(hips);

  // Becken und Beine
  hips.add(mesh(rbox(0.38, 0.2, 0.27, 0.08), mPants, 0, 0.02, 0));
  const belt = mesh(rbox(0.385, 0.035, 0.275, 0.015), mDark, 0, 0.11, 0); hips.add(belt);
  const legs: { hip: THREE.Group; knee: THREE.Group }[] = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(side * 0.1, 0, 0); hips.add(hip);
    hip.add(limb(0.37, 0.095, mPants));
    const knee = new THREE.Group(); knee.position.y = -0.34; hip.add(knee);
    knee.add(limb(0.36, 0.085, mPants));
    const foot = new THREE.Group(); foot.position.set(0, -0.355, 0.035); knee.add(foot);
    foot.add(mesh(rbox(0.145, 0.1, 0.27, 0.045), mShoe, 0, 0.005, 0.0));
    foot.add(mesh(rbox(0.155, 0.035, 0.29, 0.015), mSole, 0, -0.045, 0.0));
    foot.add(mesh(rbox(0.15, 0.02, 0.09, 0.008), mAccent, 0, 0.03, 0.06));
    legs.push({ hip, knee });
  }

  // Oberkörper
  const chest = new THREE.Group(); chest.position.y = 0.1; hips.add(chest);
  const torsoGeo = rbox(0.52, 0.5, 0.3, 0.12, 5);
  // Reihenfolge Box-Seiten: +x, -x, +y, -y, +z (vorne), -z (hinten)
  const torso = mesh(torsoGeo, [mJS, mJS, mJTop, mJTop, mJF, mJB], 0, 0.25, 0);
  chest.add(torso);
  // Kragen
  if (j.collar === "polo") {
    for (const side of [-1, 1]) {
      const flap = mesh(rbox(0.12, 0.06, 0.018, 0.008), mCollar, side * 0.06, 0.47, 0.15);
      flap.rotation.set(-0.15, 0, side * 0.55); chest.add(flap);
    }
    const band = mesh(new THREE.TorusGeometry(0.08, 0.02, 8, 24), mCollar, 0, 0.5, 0); band.rotation.x = Math.PI / 2; chest.add(band);
  } else {
    const band = mesh(new THREE.TorusGeometry(0.08, 0.014, 8, 24), mCollar, 0, 0.5, 0); band.rotation.x = Math.PI / 2; chest.add(band);
  }
  // Hals und Kopf
  chest.add(mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.1, 14), mSkin, 0, 0.53, 0));
  const head = new THREE.Group(); head.position.y = 0.76; head.scale.setScalar(1.28); chest.add(head);
  buildHead(head, look, { mSkin, mSkinD, mHair, mDark, mWhite, hairC, track });

  // Arme mit Händen
  const arms: { sh: THREE.Group; el: THREE.Group; hand: THREE.Group }[] = [];
  for (const side of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(side * 0.31, 0.42, 0); chest.add(sh);
    const sleeve = limb(0.19, 0.095, mSleeve); sh.add(sleeve);
    const cuff = mesh(new THREE.TorusGeometry(0.088, 0.014, 8, 20), mCuff, 0, -0.17, 0); cuff.rotation.x = Math.PI / 2; sh.add(cuff);
    sh.add(limb(0.27, 0.064, mSkin));
    const el = new THREE.Group(); el.position.y = -0.25; sh.add(el);
    el.add(limb(0.24, 0.058, mSkin));
    const hand = new THREE.Group(); hand.position.y = -0.24; el.add(hand);
    // Handfläche, Finger als Block, Daumen
    hand.add(mesh(rbox(0.1, 0.095, 0.065, 0.028), mSkin, 0, -0.035, 0));
    hand.add(mesh(rbox(0.095, 0.06, 0.058, 0.025), mSkin, 0, -0.09, 0.012));
    const thumb = mesh(new THREE.CapsuleGeometry(0.018, 0.04, 4, 8), mSkin, -side * 0.055, -0.04, 0.026); thumb.rotation.z = side * 0.6; hand.add(thumb);
    arms.push({ sh, el, hand });
  }
  // Dart in der rechten Hand (Figur-rechts = -x, weil die Figur nach +z schaut)
  const dart = buildDart(look.darts, 1.5);
  dart.position.set(0, -0.07, 0.04);
  arms[0].hand.add(dart);
  // Becher für "drink"
  const cup = new THREE.Group();
  cup.add(mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.12, 14), track(mat("#f6c44a", { roughness: 0.2, transparent: true, opacity: 0.9 })), 0, 0, 0));
  cup.add(mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.025, 14), mWhite, 0, 0.065, 0));
  cup.position.set(0, -0.07, 0.04); cup.visible = false; arms[0].hand.add(cup);

  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; } });

  const update = (pose: Pose3D, phase: number, time: number, holding: boolean) => {
    const [R, L] = arms; // R = rechte Hand der Figur
    const breathe = Math.sin(time * 2.2) * 0.008;
    body.position.set(0, 0, 0); hips.position.y = HIP; chest.rotation.set(0, 0, 0); head.rotation.set(0, 0, 0);
    for (const a of arms) { a.sh.rotation.set(0, 0, 0); a.el.rotation.set(0, 0, 0); a.hand.rotation.set(0, 0, 0); }
    for (const l of legs) { l.hip.rotation.set(0, 0, 0); l.knee.rotation.set(0, 0, 0); }
    L.sh.rotation.z = 0.12; R.sh.rotation.z = -0.12;
    chest.position.y = 0.1 + breathe;
    dart.visible = holding; cup.visible = false;
    dart.rotation.set(Math.PI / 2, 0, 0);

    if (pose === "walk") {
      const s = Math.sin(phase * Math.PI * 2);
      legs[0].hip.rotation.x = s * 0.55; legs[1].hip.rotation.x = -s * 0.55;
      legs[0].knee.rotation.x = Math.max(0, -Math.sin(phase * Math.PI * 2 + 0.6)) * 0.9;
      legs[1].knee.rotation.x = Math.max(0, Math.sin(phase * Math.PI * 2 + 0.6)) * 0.9;
      R.sh.rotation.x = s * 0.5; L.sh.rotation.x = -s * 0.5;
      R.el.rotation.x = -0.35; L.el.rotation.x = -0.35;
      hips.position.y = HIP + Math.abs(Math.cos(phase * Math.PI * 2)) * 0.03;
      chest.rotation.y = s * 0.06;
      dart.rotation.set(0.4, 0, 0);
    } else if (pose === "throw") {
      // seitlicher Stand, Wurfarm vorne: Zielen, Ausholen, Loslassen
      chest.rotation.y = 0.28;
      head.rotation.y = -0.22;
      legs[0].hip.rotation.x = -0.12; legs[1].hip.rotation.x = 0.18; legs[1].knee.rotation.x = 0.12;
      L.sh.rotation.set(-0.25, 0, -0.18); L.el.rotation.x = -0.25;
      // Oberarm schräg nach vorne oben, Unterarm klappt zum Gesicht zurück und schnellt dann nach vorne
      let up: number, el: number;
      if (phase < 0.45) { up = -1.85 + Math.sin(phase * 22) * 0.02; el = -1.55 + Math.sin(phase * 14) * 0.08; }
      else if (phase < 0.72) { const k = (phase - 0.45) / 0.27; up = -1.85; el = -1.55 - k * 0.6; }
      else { const k = Math.min(1, (phase - 0.72) / 0.1); up = -1.85 + k * 0.15; el = -2.15 + k * 1.95; }
      R.sh.rotation.set(up, 0, 0.12); R.el.rotation.x = el;
      R.hand.rotation.x = 0;
      // Spitze zeigt immer nach vorne zum Board
      dart.rotation.set(Math.PI / 2 - (up + el) - 0.1, 0, 0);
    } else if (pose === "collect") {
      R.sh.rotation.x = -1.5 + Math.sin(time * 6) * 0.1; R.el.rotation.x = -0.2;
      L.sh.rotation.x = -1.1; L.el.rotation.x = -0.4;
      head.rotation.x = -0.15;
    } else if (pose === "sit" || pose === "desk") {
      body.position.y = -0.2;
      for (const l of legs) { l.hip.rotation.x = -Math.PI / 2; l.knee.rotation.x = Math.PI / 2; }
      legs[0].hip.rotation.z = -0.06; legs[1].hip.rotation.z = 0.06;
      if (pose === "desk") {
        R.sh.rotation.x = -0.9; R.el.rotation.x = -0.75; L.sh.rotation.x = -0.9; L.el.rotation.x = -0.75;
        R.hand.rotation.x = 0.3 + Math.sin(time * 14) * 0.08; L.hand.rotation.x = 0.3 + Math.sin(time * 13 + 1) * 0.08;
        chest.rotation.x = 0.08;
      } else {
        // entspannt zurückgelehnt, ein Arm auf der Lehne
        chest.rotation.x = -0.12; head.rotation.x = 0.08;
        R.sh.rotation.set(-0.35, 0, 0.1); R.el.rotation.x = -0.6;
        L.sh.rotation.set(-0.2, 0, -0.9); L.el.rotation.x = -0.3;
        head.rotation.y = Math.sin(time * 0.6) * 0.3;
      }
    } else if (pose === "drink") {
      const lift = (Math.sin(phase * Math.PI * 2 - Math.PI / 2) + 1) / 2;
      R.sh.rotation.x = -0.4 - lift * 0.5; R.el.rotation.x = -1.2 - lift * 0.9;
      R.sh.rotation.z = 0.25;
      head.rotation.x = -lift * 0.2;
      cup.visible = true; dart.visible = false;
      cup.rotation.x = 1.2 + lift * 0.9;
    } else if (pose === "wave") {
      R.sh.rotation.set(0, 0, 2.6); R.el.rotation.z = Math.sin(time * 8) * 0.4;
    } else {
      R.el.rotation.x = -0.15; L.el.rotation.x = -0.15;
      head.rotation.y = Math.sin(time * 0.5) * 0.15;
    }
  };
  update("stand", 0, 0, true);

  const tmp = new THREE.Vector3();
  return {
    root,
    handWorld: (v) => { arms[0].hand.updateWorldMatrix(true, false); return v.copy(tmp.set(0, -0.08, 0.04)).applyMatrix4(arms[0].hand.matrixWorld); },
    headWorld: (v) => { head.updateWorldMatrix(true, false); return v.set(0, 0.28, 0).applyMatrix4(head.matrixWorld); },
    update,
    dispose: () => {
      root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); });
      disposables.forEach((d) => d.dispose());
    },
  };
}

// ---------------- Kopf ----------------
function buildHead(head: THREE.Group, look: Look, m: { mSkin: THREE.Material; mSkinD: THREE.Material; mHair: THREE.Material; mDark: THREE.Material; mWhite: THREE.Material; hairC: string; track: <T extends { dispose: () => void }>(x: T) => T }) {
  const R = 0.15;
  const skull = mesh(new THREE.SphereGeometry(R, 32, 24), m.mSkin);
  skull.scale.set(1, 1.1, 1.02); head.add(skull);
  // Kinn/Kiefer etwas kantiger
  const jaw = mesh(rbox(0.2, 0.12, 0.2, 0.06), m.mSkin, 0, -0.085, 0.015); head.add(jaw);
  // Ohren
  for (const s of [-1, 1]) { const ear = mesh(new THREE.SphereGeometry(0.035, 12, 10), m.mSkin, s * 0.148, -0.005, 0); ear.scale.set(0.55, 1, 0.8); head.add(ear); }
  // Augen
  for (const s of [-1, 1]) {
    const white = mesh(new THREE.SphereGeometry(0.03, 16, 12), m.mWhite, s * 0.055, 0.01, 0.128); white.scale.set(1, 1.15, 0.55); head.add(white);
    const pupil = mesh(new THREE.SphereGeometry(0.018, 12, 10), m.mDark, s * 0.054, 0.006, 0.142); pupil.scale.set(1, 1.1, 0.6); head.add(pupil);
    const glint = mesh(new THREE.SphereGeometry(0.006, 8, 6), m.mWhite, s * 0.054 + 0.007, 0.014, 0.151); head.add(glint);
    const brow = mesh(rbox(0.06, 0.013, 0.02, 0.006), look.hair === "bald" ? m.mSkinD : m.mHair, s * 0.058, 0.058, 0.138);
    brow.rotation.z = -s * 0.12; head.add(brow);
  }
  const nose = mesh(new THREE.SphereGeometry(0.022, 12, 10), m.mSkinD, 0, -0.03, 0.152); nose.scale.set(0.9, 1, 0.9); head.add(nose);
  const mouth = mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 16, Math.PI), m.track(mat("#7a2e3e")), 0, -0.07, 0.14);
  mouth.rotation.z = Math.PI; head.add(mouth);

  // Haare
  const H = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0) => { const o = mesh(geo, m.mHair, x, y, z); head.add(o); return o; };
  const cap = (theta: number, tilt: number, r = R + 0.008) => {
    const o = H(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, theta));
    o.scale.set(1.02, 1.12, 1.05); o.rotation.x = -tilt; return o;
  };
  switch (look.hair) {
    case "short": cap(1.5, 0.55); break;
    case "fade": cap(1.2, 0.45); { const f = cap(1.7, 0.55, R + 0.002); (f.material as THREE.Material) = m.track(mat(shade(m.hairC, 0.0), { transparent: true, opacity: 0.45 })); } break;
    case "quiff": cap(1.45, 0.6); { const q = H(new THREE.SphereGeometry(0.075, 16, 12), 0, 0.15, 0.07); q.scale.set(1.5, 0.9, 1.1); q.rotation.x = -0.6; } break;
    case "side": cap(1.5, 0.55); { const s = H(new THREE.SphereGeometry(0.07, 16, 12), 0.05, 0.14, 0.06); s.scale.set(1.7, 0.6, 1); s.rotation.z = -0.3; } break;
    case "buzz": { const b = cap(1.65, 0.5, R + 0.003); (b.material as THREE.Material) = m.track(mat(m.hairC, { transparent: true, opacity: 0.6, roughness: 1 })); } break;
    case "bald": { const shine = mesh(new THREE.SphereGeometry(0.03, 10, 8), m.track(mat("#ffffff", { transparent: true, opacity: 0.25 })), -0.04, 0.14, 0.06); shine.scale.set(1.4, 0.4, 1); head.add(shine); } break;
    case "curly": cap(1.5, 0.55); for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2 * 2.3, t = 0.25 + (i % 7) * 0.13; const v = new THREE.Vector3(Math.sin(t) * Math.cos(a), Math.cos(t), Math.sin(t) * Math.sin(a)).multiplyScalar(R + 0.03); if (v.z > 0.1 && v.y < 0.08) continue; H(new THREE.SphereGeometry(0.04, 10, 8), v.x, v.y * 1.1 + 0.01, v.z - 0.01); } break;
    case "long": cap(1.55, 0.55); { const back = H(rbox(0.3, 0.32, 0.12, 0.05), 0, -0.1, -0.1); back.rotation.x = 0.1; for (const s of [-1, 1]) H(rbox(0.05, 0.26, 0.09, 0.025), s * 0.15, -0.08, 0.0); } break;
    case "ponytail": cap(1.5, 0.55); { const t = H(new THREE.CapsuleGeometry(0.035, 0.18, 6, 10), 0, -0.05, -0.19); t.rotation.x = 0.35; H(new THREE.SphereGeometry(0.03, 10, 8), 0, 0.06, -0.165); } break;
    case "bun": cap(1.5, 0.55); H(new THREE.SphereGeometry(0.06, 16, 12), 0, 0.17, -0.07); break;
    case "mohawk": { const b = cap(1.6, 0.5, R + 0.002); (b.material as THREE.Material) = m.track(mat(m.hairC, { transparent: true, opacity: 0.4 })); for (let i = 0; i < 6; i++) { const a = -0.9 + i * 0.36; const sp = H(new THREE.ConeGeometry(0.03, 0.11, 8), 0, Math.cos(a) * (R + 0.04) * 1.1, Math.sin(a) * (R + 0.04)); sp.rotation.x = a; } } break;
    case "slick": cap(1.5, 0.65); { const s = H(new THREE.SphereGeometry(R + 0.012, 24, 12, 0, Math.PI * 2, 0, 0.9)); s.scale.set(1.02, 1.05, 1.12); s.position.set(0, 0.012, -0.015); } break;
    default: cap(1.5, 0.55);
  }
  // Bart
  const lower = (opacity: number, color = m.hairC) => {
    const g = new THREE.SphereGeometry(R + 0.012, 24, 12, Math.PI * 0.12, Math.PI * 0.76, Math.PI * 0.6, Math.PI * 0.4);
    const b = mesh(g, m.track(mat(color, { transparent: opacity < 1, opacity, roughness: 1 })), 0, -0.01, 0.01);
    b.scale.set(1.02, 1.12, 1.08); head.add(b); return b;
  };
  const stache = () => { const s = mesh(new THREE.CapsuleGeometry(0.014, 0.06, 4, 8), m.mHair, 0, -0.052, 0.152); s.rotation.z = Math.PI / 2; head.add(s); };
  switch (look.beard) {
    case "stubble": lower(0.35); break;
    case "full": lower(1); stache(); break;
    case "mustache": stache(); break;
    case "goatee": stache(); head.add(mesh(rbox(0.06, 0.06, 0.04, 0.018), m.mHair, 0, -0.12, 0.135)); break;
    case "chin": head.add(mesh(rbox(0.07, 0.045, 0.05, 0.02), m.mHair, 0, -0.135, 0.12)); break;
  }
  // Brille
  const frame = m.track(mat("#15101c", { roughness: 0.3, metalness: 0.4 }));
  if (look.glasses === "round" || look.glasses === "square") {
    for (const s of [-1, 1]) {
      const g = mesh(new THREE.TorusGeometry(0.034, 0.005, 8, look.glasses === "square" ? 4 : 24), frame, s * 0.056, 0.008, 0.152);
      if (look.glasses === "square") g.rotation.z = Math.PI / 4;
      head.add(g);
      const arm = mesh(new THREE.BoxGeometry(0.006, 0.006, 0.14), frame, s * 0.142, 0.012, 0.08); head.add(arm);
    }
    head.add(mesh(new THREE.BoxGeometry(0.04, 0.006, 0.006), frame, 0, 0.014, 0.155));
  } else if (look.glasses === "sun") {
    const lens = m.track(mat("#0d0d12", { roughness: 0.05, metalness: 0.6 }));
    for (const s of [-1, 1]) { const l = mesh(rbox(0.07, 0.048, 0.012, 0.012), lens, s * 0.056, 0.006, 0.155); head.add(l); head.add(mesh(new THREE.BoxGeometry(0.006, 0.006, 0.14), frame, s * 0.142, 0.012, 0.08)); }
    head.add(mesh(new THREE.BoxGeometry(0.04, 0.008, 0.008), frame, 0, 0.018, 0.158));
  } else if (look.glasses === "neon") {
    head.add(mesh(rbox(0.21, 0.05, 0.02, 0.018), m.track(mat("#5fe3f0", { emissive: "#d63ce0", emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.3 })), 0, 0.008, 0.152));
  }
  // Kopfbedeckung
  const hc = look.hatColor;
  const mHat = m.track(mat(hc, { roughness: 0.7 }));
  if (look.hat === "cap" || look.hat === "capback") {
    const dome = mesh(new THREE.SphereGeometry(R + 0.022, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), mHat, 0, 0.02, 0); dome.scale.set(1.02, 1.0, 1.05); head.add(dome);
    const band = mesh(new THREE.TorusGeometry(R + 0.02, 0.01, 6, 28), m.track(mat(shade(hc, -0.25))), 0, 0.025, 0); band.rotation.x = Math.PI / 2; head.add(band);
    const brim = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 24, 1, false, -Math.PI / 2, Math.PI), m.track(mat(shade(hc, -0.15))), 0, 0.03, look.hat === "cap" ? 0.13 : -0.13);
    brim.scale.set(1, 1, 0.9); if (look.hat === "capback") brim.rotation.y = Math.PI; brim.rotation.x = look.hat === "cap" ? 0.12 : -0.12; head.add(brim);
    head.add(mesh(new THREE.SphereGeometry(0.014, 8, 6), mHat, 0, R + 0.03, 0));
  } else if (look.hat === "beanie") {
    const d = mesh(new THREE.SphereGeometry(R + 0.03, 28, 14, 0, Math.PI * 2, 0, Math.PI / 1.9), mHat, 0, 0.03, 0); d.scale.set(1, 1.15, 1.03); head.add(d);
    const cuffB = mesh(new THREE.TorusGeometry(R + 0.026, 0.026, 10, 28), m.track(mat(shade(hc, -0.2))), 0, 0.02, 0); cuffB.rotation.x = Math.PI / 2; head.add(cuffB);
    head.add(mesh(new THREE.SphereGeometry(0.04, 12, 10), m.mWhite, 0, R + 0.08, 0));
  } else if (look.hat === "headband") {
    const b = mesh(new THREE.TorusGeometry(R + 0.012, 0.02, 8, 30), mHat, 0, 0.065, 0); b.rotation.x = Math.PI / 2 - 0.15; b.scale.set(1, 1.05, 1); head.add(b);
  } else if (look.hat === "crown") {
    const gold = m.track(mat("#e8c25a", { metalness: 0.9, roughness: 0.25 }));
    head.add(mesh(new THREE.CylinderGeometry(0.12, 0.11, 0.05, 24, 1, true), gold, 0, 0.17, 0));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const c = mesh(new THREE.ConeGeometry(0.022, 0.06, 6), gold, Math.sin(a) * 0.115, 0.22, Math.cos(a) * 0.115); head.add(c); }
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; head.add(mesh(new THREE.SphereGeometry(0.012, 8, 6), m.track(mat(i % 2 ? "#d63ce0" : "#5fe3f0", { emissive: i % 2 ? "#d63ce0" : "#5fe3f0", emissiveIntensity: 0.4 })), Math.sin(a) * 0.122, 0.17, Math.cos(a) * 0.122)); }
  }
}
