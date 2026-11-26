// Spielerfigur aus einem fertigen, durchgehenden 3D-Modell (Quaternius, CC0) mit echten Animationen.
// Trikot, Hose, Schuhe, Hautfarbe und Bart werden direkt in die Textur des Körpers gemalt.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { HAIR_COLORS, PANTS, SHOES, SKIN_TONES, type Look } from "@/lib/dartraum/catalog";
import { buildDart, buildHead, type Pose3D } from "./character";
import { jerseyTextures, shade } from "./textures";

const BASE = "/models/dartraum/";

interface Body { scene: THREE.Group; skin: ImageData; ref: number[]; min: THREE.Vector3; max: THREE.Vector3; mat: string }
interface Assets { bodies: Record<"regular" | "athletic", Body>; clips: Map<string, THREE.AnimationClip>; hair: THREE.Group }
let assetsPromise: Promise<Assets> | null = null;

export function loadPlayerAssets(): Promise<Assets> {
  if (assetsPromise) return assetsPromise;
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const img = (src: string) => new Promise<ImageData>((res, rej) => {
    const im = new Image();
    im.onload = () => { const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const x = c.getContext("2d")!; x.drawImage(im, 0, 0); res(x.getImageData(0, 0, c.width, c.height)); };
    im.onerror = rej; im.src = src;
  });
  assetsPromise = Promise.all([
    loader.loadAsync(BASE + "player.glb"), loader.loadAsync(BASE + "player-regular.glb"),
    loader.loadAsync(BASE + "anims.glb"), loader.loadAsync(BASE + "hair.glb"),
    img(BASE + "skin.webp"), img(BASE + "skin-regular.webp"),
  ]).then(([ath, reg, a, h, skinA, skinR]) => ({
    bodies: {
      // echte Maße der Modelle (die Positionen sind komprimiert gespeichert)
      athletic: { scene: ath.scene, skin: skinA, ref: [205, 135, 95], min: new THREE.Vector3(-0.9294, -0.0095, -0.1634), max: new THREE.Vector3(0.9294, 1.8101, 0.128), mat: "MI_Superhero_Male" },
      regular: { scene: reg.scene, skin: skinR, ref: [169, 114, 80], min: new THREE.Vector3(-0.8994, -0.0058, -0.1436), max: new THREE.Vector3(0.8994, 1.8101, 0.1331), mat: "MI_Regular_Male" },
    },
    clips: new Map(a.animations.map((c) => [c.name, c])), hair: h.scene,
  }));
  assetsPromise.catch(() => { assetsPromise = null; });
  return assetsPromise;
}

// ---------------- Textur malen ----------------
const hex = (h: string) => { const n = parseInt(h.replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

function canvasData(t: THREE.Texture) {
  const img = t.image as HTMLCanvasElement;
  return { w: img.width, h: img.height, d: img.getContext("2d")!.getImageData(0, 0, img.width, img.height).data };
}

function paintBody(geo: THREE.BufferGeometry, look: Look, name: string, body: Body) {
  const skinImg = body.skin, SKIN_REF = body.ref; // SKIN_REF: mittlere Hautfarbe der Original-Textur
  const S = 1024;
  const canvas = document.createElement("canvas"); canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  const out = ctx.createImageData(S, S);
  const o = out.data;

  const skin = hex(SKIN_TONES[look.skin] ?? SKIN_TONES[1]);
  const pants = PANTS.find((p) => p.id === look.pants) ?? PANTS[0];
  const shoes = SHOES.find((s) => s.id === look.shoes) ?? SHOES[0];
  const j = look.jersey;
  const jt = jerseyTextures(j, name);
  const F = canvasData(jt.front), B = canvasData(jt.back), SD = canvasData(jt.side);
  [jt.front, jt.back, jt.side].forEach((t) => t.dispose());
  const sleeve = hex(j.design === "panels" || j.design === "club26neon" ? j.secondary : j.primary);
  const cuff = hex(j.accent), collar = hex(j.secondary);
  const pantsC = hex(pants.color), pantsD = hex(pants.detail);
  const shoeA = hex(shoes.accent);

  const pos = geo.attributes.position as THREE.BufferAttribute, nor = geo.attributes.normal as THREE.BufferAttribute, uv = geo.attributes.uv as THREE.BufferAttribute;
  const index = geo.index!;
  const sw = skinImg.width, sh = skinImg.height, sd = skinImg.data;

  const sample = (c: { w: number; h: number; d: Uint8ClampedArray }, u: number, v: number) => {
    const x = Math.min(c.w - 1, Math.max(0, Math.floor(u * c.w))), y = Math.min(c.h - 1, Math.max(0, Math.floor(v * c.h)));
    const i = (y * c.w + x) * 4; return [c.d[i], c.d[i + 1], c.d[i + 2]];
  };

  /** Farbe für einen Punkt auf dem Körper (Ruhepose, T-Pose, Blick nach +z) */
  const shadeAt = (x: number, y: number, z: number, nx: number, nz: number, tu: number, tv: number): number[] => {
    const ax = Math.abs(x);
    // Hautdetails aus der Originaltextur, auf die gewählte Hautfarbe umgerechnet
    const orig = sample({ w: sw, h: sh, d: sd }, tu, tv);
    const skinPx = [skin[0] * (orig[0] / SKIN_REF[0]), skin[1] * (orig[1] / SKIN_REF[1]), skin[2] * (orig[2] / SKIN_REF[2])];
    const isArm = ax > 0.215 && y > 1.22;
    if (isArm) {
      if (ax < 0.4) return sleeve;
      if (ax < 0.425) return cuff;
      return skinPx;
    }
    if (y > 1.56) return skinPx;
    // Runder Halsausschnitt: vorne tiefer als hinten, mit schmalem Bündchen
    const cut = (z > 0 ? 1.46 : 1.485) + (ax / 0.085) ** 2 * 0.05;
    if (y > cut + 0.016) return skinPx;
    if (y > cut) return collar;
    if (y > 0.99) {
      // Trikot: vorne, hinten, Seiten
      const v = Math.min(0.999, Math.max(0, (1.5 - y) / 0.5));
      if (Math.abs(nx) > 0.88 && ax > 0.12) return sample(SD, nx > 0 ? 0.25 : 0.75, v);
      if (nz >= 0) return sample(F, Math.min(0.999, Math.max(0, (x + 0.2) / 0.4)), v);
      return sample(B, Math.min(0.999, Math.max(0, (0.17 - x) / 0.34)), v);
    }
    // Gürtel
    if (y > 0.955) return y > 0.965 ? [24, 20, 22] : pantsD;
    // Schuhe
    if (y < 0.16) return y < 0.13 ? [235, 235, 240] : shoeA; // Socken (unter dem Schuh)
    // Hose mit Naht
    if (Math.abs(nx) > 0.9 && ax > 0.1) return pantsD;
    return pantsC;
  };

  // Positionen sind komprimiert gespeichert: auf die echten Maße des Modells zurückrechnen
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const REAL_MIN = body.min, REAL_MAX = body.max;
  const toReal = (v: THREE.Vector3) => v.set(
    REAL_MIN.x + ((v.x - bb.min.x) / (bb.max.x - bb.min.x)) * (REAL_MAX.x - REAL_MIN.x),
    REAL_MIN.y + ((v.y - bb.min.y) / (bb.max.y - bb.min.y)) * (REAL_MAX.y - REAL_MIN.y),
    REAL_MIN.z + ((v.z - bb.min.z) / (bb.max.z - bb.min.z)) * (REAL_MAX.z - REAL_MIN.z));
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
  const nA = new THREE.Vector3(), nB = new THREE.Vector3(), nC = new THREE.Vector3();
  for (let t = 0; t < index.count; t += 3) {
    const ia = index.getX(t), ib = index.getX(t + 1), ic = index.getX(t + 2);
    const ux = [uv.getX(ia) * S, uv.getX(ib) * S, uv.getX(ic) * S], uy = [uv.getY(ia) * S, uv.getY(ib) * S, uv.getY(ic) * S];
    toReal(vA.fromBufferAttribute(pos, ia)); toReal(vB.fromBufferAttribute(pos, ib)); toReal(vC.fromBufferAttribute(pos, ic));
    nA.fromBufferAttribute(nor, ia); nB.fromBufferAttribute(nor, ib); nC.fromBufferAttribute(nor, ic);
    const minX = Math.max(0, Math.floor(Math.min(...ux)) - 1), maxX = Math.min(S - 1, Math.ceil(Math.max(...ux)) + 1);
    const minY = Math.max(0, Math.floor(Math.min(...uy)) - 1), maxY = Math.min(S - 1, Math.ceil(Math.max(...uy)) + 1);
    const det = (uy[1] - uy[2]) * (ux[0] - ux[2]) + (ux[2] - ux[1]) * (uy[0] - uy[2]);
    if (Math.abs(det) < 1e-9) continue;
    for (let py = minY; py <= maxY; py++) for (let px = minX; px <= maxX; px++) {
      const cx = px + 0.5, cy = py + 0.5;
      let a = ((uy[1] - uy[2]) * (cx - ux[2]) + (ux[2] - ux[1]) * (cy - uy[2])) / det;
      let b = ((uy[2] - uy[0]) * (cx - ux[2]) + (ux[0] - ux[2]) * (cy - uy[2])) / det;
      let c = 1 - a - b;
      const e = -1.5 / Math.sqrt(Math.abs(det)); // etwas über den Rand malen, damit keine Nähte entstehen
      if (a < e || b < e || c < e) continue;
      a = Math.max(0, a); b = Math.max(0, b); c = Math.max(0, c); const sum = a + b + c; a /= sum; b /= sum; c /= sum;
      const x = vA.x * a + vB.x * b + vC.x * c, y = vA.y * a + vB.y * b + vC.y * c, z = vA.z * a + vB.z * b + vC.z * c;
      const nx = nA.x * a + nB.x * b + nC.x * c, nz = nA.z * a + nB.z * b + nC.z * c;
      const tu = cx / S, tv = cy / S;
      const col = shadeAt(x, y, z, nx, nz, tu, tv);
      // Textur-Y ist in three.js nach oben gedreht (flipY = false bei glTF): Zeile = uv.y * S
      const i = (py * S + px) * 4;
      o[i] = col[0]; o[i + 1] = col[1]; o[i + 2] = col[2]; o[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(canvas);
  t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/** Statur: Rumpf, Bauch und Beine in der Grundhaltung breiter oder schmaler formen (die Knochen bewegen alles weiter mit) */
function shapeBody(src: THREE.BufferGeometry, body: Body, build: string) {
  const geo = src.clone();
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const p = new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3); // ungepackt, damit feine Änderungen nicht verloren gehen
  geo.computeBoundingBox();
  const bb = geo.boundingBox!, mn = body.min, mx = body.max;
  const k = (a: "x" | "y" | "z") => (mx[a] - mn[a]) / (bb.max[a] - bb.min[a]);
  const heavy = build === "heavy";
  const W = heavy ? 1.3 : 0.87, L = heavy ? 1.2 : 0.9;
  const ramp = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)));
  for (let i = 0; i < pos.count; i++) {
    const y = mn.y + (pos.getY(i) - bb.min.y) * k("y");
    let x = mn.x + (pos.getX(i) - bb.min.x) * k("x"), z = mn.z + (pos.getZ(i) - bb.min.z) * k("z");
    const ax = Math.abs(x);
    // Rumpf (ohne Arme): voll zwischen Hüfte und Brust, weich auslaufend zu Hals und Beinen
    const wt = Math.min(ramp(y, 0.82, 0.98), 1 - ramp(y, 1.36, 1.5)) * (1 - ramp(ax, 0.19, 0.24));
    if (wt > 0) {
      x *= 1 + (W - 1) * wt;
      z = 0.0 + z * (1 + (W - 1) * 0.8 * wt);
      if (heavy && z > 0) z *= 1 + 0.45 * wt * Math.min(ramp(y, 0.9, 1.02), 1 - ramp(y, 1.2, 1.32)); // Bauch
    }
    // Oberschenkel
    const wl = Math.min(ramp(y, 0.42, 0.6), 1 - ramp(y, 0.9, 1.0)) * (1 - ramp(ax, 0.22, 0.27));
    if (wl > 0) { const cx = Math.sign(x) * 0.1; x = cx + (x - cx) * (1 + (L - 1) * wl); z *= 1 + (L - 1) * wl; }
    p.setXYZ(i, (x - mn.x) / k("x") + bb.min.x, (y - mn.y) / k("y") + bb.min.y, (z - mn.z) / k("z") + bb.min.z);
  }
  geo.setAttribute("position", p);
  return geo;
}

// ---------------- Figur ----------------
export interface Player {
  root: THREE.Group;
  handWorld: (v: THREE.Vector3) => THREE.Vector3;
  headWorld: (v: THREE.Vector3) => THREE.Vector3;
  update: (pose: Pose3D, phase: number, time: number, holding: boolean, dt: number) => void;
  dispose: () => void;
}

/** Welche fertige Frisur zu welcher Auswahl gehört */
// Lang hat oben keinen Ansatz: dafür den Buzzcut darunterlegen
const HAIR_MODEL: Record<string, string[]> = { short: ["Hair_SimpleParted"], buzz: ["Hair_Buzzed"], long: ["Hair_Long", "Hair_Buzzed"], bald: [] };

const CLIP: Record<Pose3D, string> = {
  stand: "Idle_Loop", walk: "Walk_Loop", throw: "Idle_Loop", collect: "PickUp_Table", sit: "Sitting_Idle_Loop",
  desk: "Sitting_Talking_Loop", drink: "Idle_Talking_Loop", wave: "Interact",
};

export function buildPlayer(assets: Assets, look: Look, name: string): Player {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };
  const bodyAsset = assets.bodies[look.build === "athletic" ? "athletic" : "regular"];
  const model = SkeletonUtils.clone(bodyAsset.scene) as THREE.Group;
  const root = new THREE.Group();
  root.add(model);

  let body: THREE.SkinnedMesh | null = null;
  const hairMat = track(new THREE.MeshStandardMaterial({ color: HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[1], roughness: look.hair === "slick" ? 0.35 : 0.85 }));
  model.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isMesh) return;
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    const mat = m.material as THREE.MeshStandardMaterial;
    if (mat.name === bodyAsset.mat) body = m;
    if (mat.name === "MI_Hair_1") m.material = hairMat; // Augenbrauen in Haarfarbe
  });
  if (body) {
    const b = body as THREE.SkinnedMesh;
    const tex = track(paintBody(b.geometry, look, name, bodyAsset));
    b.material = track(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.72 }));
    if (look.build === "slim" || look.build === "heavy") b.geometry = track(shapeBody(b.geometry, bodyAsset, look.build));
  }

  const bone = (n: string) => model.getObjectByName(n) as THREE.Bone;
  const head = bone("Head"), handR = bone("hand_r");
  model.updateMatrixWorld(true);

  // Haare, Brille, Kopfbedeckung als Aufsatz am Kopf-Knochen
  const headGroup = new THREE.Group();
  const mSkin = track(new THREE.MeshStandardMaterial({ color: SKIN_TONES[look.skin] ?? SKIN_TONES[1] }));
  const mDark = track(new THREE.MeshStandardMaterial({ color: "#1a1414" })), mWhite = track(new THREE.MeshStandardMaterial({ color: "#ffffff" }));
  // Frisur und Bart: fertige Modelle, eingefärbt in der Haarfarbe
  const hairTint = new THREE.Color(HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[1]).multiplyScalar(1.35);
  const pieces = [...(HAIR_MODEL[look.hair] ?? []), look.beard === "full" ? "Hair_Beard" : undefined];
  for (const piece of pieces) {
    const srcNode = piece && assets.hair.getObjectByName(piece);
    if (!srcNode) continue;
    const h = srcNode.clone(true);
    h.traverse((o) => {
      const m = o as THREE.Mesh; if (!m.isMesh) return;
      const src = m.material as THREE.MeshStandardMaterial;
      const mat = track(src.clone()); mat.color.copy(hairTint); mat.roughness = 0.75; mat.metalness = 0; mat.normalScale.set(1.6, 1.6);
      m.material = mat; m.castShadow = true;
    });
    model.add(h); h.updateMatrixWorld(true); head.attach(h);
  }
  buildHead(headGroup, { ...look, hair: "none" }, { mSkin, mSkinD: mSkin, mHair: hairMat, mDark, mWhite, hairC: HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[1], track }, { face: false, beard: false });
  // Aufsätze sind für einen Kopf mit Radius 0.15 gebaut: auf diesen Kopf anpassen
  headGroup.scale.set(0.64, 0.72, 0.74);
  headGroup.position.set(0, 1.69, -0.006);
  headGroup.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; } });
  model.add(headGroup); head.attach(headGroup);

  // Schuhe über die nackten Füße
  const shoes = SHOES.find((x) => x.id === look.shoes) ?? SHOES[0];
  const mUp = track(new THREE.MeshStandardMaterial({ color: shoes.upper, roughness: 0.55 }));
  const mSo = track(new THREE.MeshStandardMaterial({ color: shoes.sole, roughness: 0.7 }));
  const mAc = track(new THREE.MeshStandardMaterial({ color: shoes.accent, roughness: 0.5 }));
  for (const side of ["l", "r"]) {
    const foot = bone(`foot_${side}`), ball = bone(`ball_${side}`);
    const a = new THREE.Vector3(), b = new THREE.Vector3(); foot.getWorldPosition(a); ball.getWorldPosition(b);
    const shoe = new THREE.Group();
    const len = 0.27, mid = new THREE.Vector3((a.x + b.x) / 2, 0, (a.z + b.z) / 2 + 0.0);
    const up = new THREE.Mesh(new RoundedBoxGeometry(0.105, 0.09, len, 4, 0.042), mUp); up.position.y = 0.06;
    const so = new THREE.Mesh(new RoundedBoxGeometry(0.113, 0.03, len + 0.012, 3, 0.013), mSo); so.position.y = 0.018;
    const ac = new THREE.Mesh(new RoundedBoxGeometry(0.118, 0.02, 0.1, 2, 0.008), mAc); ac.position.set(0, 0.05, 0.03);
    const col = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.012, 8, 20), mUp); col.rotation.x = Math.PI / 2; col.position.set(0, 0.115, -0.07);
    for (const m of [up, so, ac, col]) { m.castShadow = true; shoe.add(m); }
    shoe.position.copy(mid);
    shoe.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    model.add(shoe); foot.attach(shoe);
    track(up.geometry); track(so.geometry); track(ac.geometry); track(col.geometry);
  }

  // Dart in der rechten Hand
  const dart = buildDart(look.darts, 1.1);
  const dartHolder = new THREE.Group(); dartHolder.add(dart);
  const handPos = new THREE.Vector3(); handR.getWorldPosition(handPos);
  dartHolder.position.copy(handPos).add(new THREE.Vector3(-0.08, -0.02, 0.03));
  dart.rotation.set(0, 0, Math.PI / 2); // Spitze nach vorne/außen, wird beim Werfen nachgeführt
  model.add(dartHolder); handR.attach(dartHolder);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.12, 14), track(new THREE.MeshStandardMaterial({ color: "#f6c44a", roughness: 0.15, transparent: true, opacity: 0.9 })));
  cup.position.copy(handPos).add(new THREE.Vector3(-0.09, 0, 0.05)); model.add(cup); handR.attach(cup); cup.visible = false;

  // Animationen
  const mixer = new THREE.AnimationMixer(model);
  const actions = new Map<string, THREE.AnimationAction>();
  const action = (n: string) => {
    let a = actions.get(n);
    if (!a) { const c = assets.clips.get(n); if (!c) return null; a = mixer.clipAction(c); actions.set(n, a); }
    return a;
  };
  let current = "";
  const play = (n: string) => {
    if (n === current) return;
    const next = action(n); if (!next) return;
    const prev = current ? actions.get(current) : null;
    next.reset(); next.setEffectiveWeight(1); next.timeScale = n === "Walk_Loop" ? 1.4 : 1; next.play();
    if (prev) next.crossFadeFrom(prev, 0.3, false);
    current = n;
  };
  play("Idle_Loop");

  // Wurfarm: Knochen nach der Animation überschreiben
  const upR = bone("upperarm_r"), loR = bone("lowerarm_r"), claR = bone("clavicle_r");
  const qUp = new THREE.Quaternion(), qLo = new THREE.Quaternion(), tmpQ = new THREE.Quaternion(), e = new THREE.Euler();
  const upRest = upR.quaternion.clone(), loRest = loR.quaternion.clone();
  void claR; void upRest; void loRest;

  const update = (pose: Pose3D, phase: number, time: number, holding: boolean, dt: number) => {
    play(CLIP[pose]);
    mixer.update(dt);
    dartHolder.visible = holding && pose !== "drink"; cup.visible = pose === "drink";
    if (pose === "throw") {
      // Oberarm nach vorne oben, Unterarm klappt zum Gesicht und schnellt nach vorne
      let lift: number, bend: number;
      if (phase < 0.45) { lift = 1.25; bend = 1.7 + Math.sin(phase * 14) * 0.06; }
      else if (phase < 0.72) { const k = (phase - 0.45) / 0.27; lift = 1.25; bend = 1.7 + k * 0.5; }
      else { const k = Math.min(1, (phase - 0.72) / 0.1); lift = 1.25 + k * 0.15; bend = 2.2 - k * 2.0; }
      // in Weltachsen der Figur drehen: Arm zeigt nach vorne (+z) und nach oben
      setWorldDir(upR, new THREE.Vector3(-0.15, Math.sin(lift - Math.PI / 2), Math.cos(lift - Math.PI / 2)).normalize(), qUp);
      setWorldDir(loR, new THREE.Vector3(-0.05, Math.sin(lift - Math.PI / 2 + bend), Math.cos(lift - Math.PI / 2 + bend)).normalize(), qLo);
    }
    void time; void tmpQ; void e;
  };

  // Richtet einen Arm-Knochen so aus, dass seine Längsachse in die gewünschte Richtung (Modellraum) zeigt
  const boneAxis = new Map<THREE.Bone, THREE.Vector3>();
  function setWorldDir(b: THREE.Bone, dirModel: THREE.Vector3, q: THREE.Quaternion) {
    // Längsachse = Richtung zum ersten Kind in Ruhelage (lokal)
    let axis = boneAxis.get(b);
    if (!axis) { const child = b.children.find((c) => (c as THREE.Bone).isBone) as THREE.Bone | undefined; axis = (child ? child.position.clone() : new THREE.Vector3(0, 1, 0)).normalize(); boneAxis.set(b, axis); }
    model.updateMatrixWorld(true);
    const parentQ = new THREE.Quaternion(); b.parent!.getWorldQuaternion(parentQ);
    const modelQ = new THREE.Quaternion(); model.getWorldQuaternion(modelQ);
    const target = dirModel.clone().applyQuaternion(modelQ); // Welt
    const targetLocal = target.applyQuaternion(parentQ.invert()); // im Eltern-Raum
    q.setFromUnitVectors(axis, targetLocal.normalize());
    b.quaternion.copy(q);
  }

  const tmp = new THREE.Vector3();
  return {
    root,
    handWorld: (v) => { handR.updateWorldMatrix(true, false); return handR.getWorldPosition(v); },
    headWorld: (v) => { head.updateWorldMatrix(true, false); head.getWorldPosition(v); return v.add(tmp.set(0, 0.25, 0)); },
    update,
    dispose: () => {
      mixer.stopAllAction();
      root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !(m as THREE.SkinnedMesh).isSkinnedMesh) m.geometry.dispose(); });
      disposables.forEach((d) => d.dispose());
    },
  };
}
export { shade };
