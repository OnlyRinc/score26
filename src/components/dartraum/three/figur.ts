// Spielerfigur im Stil von Felix' Vorlage (Tripo-Modell mit Mixamo-Skelett).
// Die Bewegungen kommen aus der Quaternius-Animationsbibliothek und werden auf das Mixamo-Skelett übertragen.
// Statur (dünn, normal, muskulös, kräftig) und Körperform (Mann, Frau) entstehen durch Verformen des Grundkörpers.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Look } from "@/lib/dartraum/catalog";
import { buildDart, type Pose3D } from "./character";

const BASE = "/models/dartraum/";
/** Gesamthöhe der Figur in Metern */
const HEIGHT = 1.7;

interface Assets {
  figur: THREE.Group;
  scale: number;
  lift: number;
  source: THREE.Group;
  clips: Map<string, THREE.AnimationClip>;
  retargeted: Map<string, THREE.AnimationClip>;
}
let assetsPromise: Promise<Assets> | null = null;

export function loadPlayerAssets(): Promise<Assets> {
  if (assetsPromise) return assetsPromise;
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  assetsPromise = Promise.all([
    loader.loadAsync(BASE + "figur.glb"), loader.loadAsync(BASE + "player.glb"), loader.loadAsync(BASE + "anims.glb"),
  ]).then(([f, src, a]) => {
    f.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(f.scene);
    const scale = HEIGHT / (box.max.y - box.min.y);
    const assets: Assets = { figur: f.scene, scale, lift: -box.min.y * scale, source: src.scene, clips: new Map(a.animations.map((c) => [c.name, c])), retargeted: new Map() };
    // alle benötigten Bewegungen einmal vorab übertragen, damit es beim Spielen nicht ruckelt
    const t0 = performance.now();
    for (const n of new Set(Object.values(CLIP))) retarget(assets, n);
    (window as unknown as { __retargetMs?: number }).__retargetMs = performance.now() - t0;
    return assets;
  });
  assetsPromise.catch(() => { assetsPromise = null; });
  return assetsPromise;
}

// ---------------- Bewegungen übertragen ----------------
const MAP: Record<string, string> = { Hips: "pelvis", Spine: "spine_01", Spine1: "spine_02", Spine2: "spine_03", Neck: "neck_01", Head: "Head" };
for (const [m, u] of [["Shoulder", "clavicle"], ["Arm", "upperarm"], ["ForeArm", "lowerarm"], ["Hand", "hand"], ["UpLeg", "thigh"], ["Leg", "calf"], ["Foot", "foot"], ["ToeBase", "ball"]]) {
  MAP["Left" + m] = u + "_l"; MAP["Right" + m] = u + "_r";
}
for (const f of ["Index", "Middle", "Ring", "Pinky", "Thumb"]) for (let i = 1; i <= 3; i++) {
  MAP[`LeftHand${f}${i}`] = `${f.toLowerCase()}_0${i}_l`; MAP[`RightHand${f}${i}`] = `${f.toLowerCase()}_0${i}_r`;
}
const short = (n: string) => n.replace(/^mixamorig:?/, "");

/** Eine Quaternius-Animation Bild für Bild auf das Mixamo-Skelett übertragen (über Welt-Drehungen relativ zur Ruhelage) */
function retarget(assets: Assets, name: string): THREE.AnimationClip | null {
  const hit = assets.retargeted.get(name); if (hit) return hit;
  const clip = assets.clips.get(name); if (!clip) return null;
  const T = SkeletonUtils.clone(assets.figur) as THREE.Group, S = SkeletonUtils.clone(assets.source) as THREE.Group;
  T.updateMatrixWorld(true); S.updateMatrixWorld(true);
  const tb = new Map<string, THREE.Bone>(), sb = new Map<string, THREE.Bone>();
  T.traverse((o) => { if ((o as THREE.Bone).isBone) tb.set(short(o.name), o as THREE.Bone); });
  S.traverse((o) => { if ((o as THREE.Bone).isBone) sb.set(o.name, o as THREE.Bone); });
  const wq = (o: THREE.Object3D) => o.getWorldQuaternion(new THREE.Quaternion());
  const pairs = Object.keys(MAP).filter((k) => tb.has(k) && sb.has(MAP[k])).map((k) => {
    const t = tb.get(k)!, u = sb.get(MAP[k])!; return { t, u, tq: wq(t), uqInv: wq(u).invert() };
  });
  const hipsT = tb.get("Hips")!, pelvis = sb.get("pelvis")!;
  const hipT = hipsT.getWorldPosition(new THREE.Vector3()), hipS = pelvis.getWorldPosition(new THREE.Vector3());
  const hs = hipT.y / hipS.y;
  const parentInv = new THREE.Matrix4().copy(hipsT.parent!.matrixWorld).invert();
  const mixer = new THREE.AnimationMixer(S); mixer.clipAction(clip).play();
  const fps = 30, n = Math.max(2, Math.round(clip.duration * fps) + 1);
  const times: number[] = [], rot = pairs.map(() => [] as number[]), hp: number[] = [];
  const p = new THREE.Vector3(), q = new THREE.Quaternion();
  for (let i = 0; i < n; i++) {
    const t = Math.min(clip.duration, i / fps); mixer.setTime(t); S.updateMatrixWorld(true); times.push(t);
    for (let k = 0; k < pairs.length; k++) {
      const { t: bone, u, tq, uqInv } = pairs[k];
      const want = wq(u).multiply(uqInv).multiply(tq);
      q.copy(wq(bone.parent!)).invert().multiply(want);
      bone.quaternion.copy(q); bone.updateMatrixWorld(true);
      rot[k].push(q.x, q.y, q.z, q.w);
    }
    pelvis.getWorldPosition(p);
    p.set(hipT.x + (p.x - hipS.x) * hs, p.y * hs, hipT.z + (p.z - hipS.z) * hs).applyMatrix4(parentInv);
    hp.push(p.x, p.y, p.z);
  }
  mixer.stopAllAction();
  const tracks: THREE.KeyframeTrack[] = pairs.map((pr, k) => new THREE.QuaternionKeyframeTrack(`${pr.t.name}.quaternion`, times, rot[k]));
  tracks.push(new THREE.VectorKeyframeTrack(`${hipsT.name}.position`, times, hp));
  const out = new THREE.AnimationClip(name, clip.duration, tracks);
  assets.retargeted.set(name, out);
  return out;
}

// ---------------- Statur ----------------
type Shape = Record<string, number>;
const BUILD_SHAPE: Record<string, Shape> = {
  slim: { Arm: 0.68, ForeArm: 0.72, Shoulder: 0.75, Spine: 0.72, Spine1: 0.72, Spine2: 0.75, Hips: 0.78, UpLeg: 0.7, Leg: 0.74, Neck: 0.85 },
  normal: {},
  athletic: { Arm: 1.6, ForeArm: 1.4, Shoulder: 1.5, Spine: 1.05, Spine1: 1.3, Spine2: 1.5, Hips: 1.0, UpLeg: 1.3, Leg: 1.25, Neck: 1.35 },
  heavy: { Arm: 1.45, ForeArm: 1.25, Shoulder: 1.25, Spine: 1.6, Spine1: 1.55, Spine2: 1.45, Hips: 1.5, UpLeg: 1.5, Leg: 1.25, Neck: 1.35, belly: 0.22 },
};
/** Arme etwas abspreizen, damit die Hände nicht im Körper stecken */
const ARM_OUT: Record<string, number> = { slim: 0, normal: 0, athletic: 0.09, heavy: 0.17 };
const HEAD_SCALE = 0.85;

/** Verformt den Grundkörper entlang der Knochen (Ruhelage), Kopf etwas kleiner, bei Frau mit Brust, Taille und Hüfte */
function shapeBody(m: THREE.SkinnedMesh, b: Shape, fem: boolean) {
  const g = m.geometry.clone(); m.geometry = g;
  const sk = m.skeleton;
  // Positionen sind komprimiert gespeichert (Ganzzahlen): für die Verformung in echte Kommazahlen umwandeln
  const src = g.attributes.position;
  const P = new THREE.BufferAttribute(new Float32Array(src.count * 3), 3);
  for (let i = 0; i < src.count; i++) P.setXYZ(i, src.getX(i), src.getY(i), src.getZ(i));
  g.setAttribute("position", P); g.deleteAttribute("normal");
  const SI = g.attributes.skinIndex as THREE.BufferAttribute, SW = g.attributes.skinWeight as THREE.BufferAttribute;
  const pos = sk.boneInverses.map((i) => new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(i).invert()));
  const key = sk.bones.map((bn) => short(bn.name).replace(/^(Left|Right)/, ""));
  const child = sk.bones.map((bn, i) => {
    const c = bn.children.find((x) => (x as THREE.Bone).isBone && (key[i] === "Hips" ? /Spine$/.test(x.name) : true));
    return c ? sk.bones.indexOf(c as THREE.Bone) : -1;
  });
  const bi = (n: string) => sk.bones.findIndex((x) => short(x.name) === n);
  const la = pos[bi("LeftArm")], ra = pos[bi("RightArm")], s2 = pos[bi("Spine2")], nk = pos[bi("Neck")], hips = pos[bi("Hips")], s1 = pos[bi("Spine1")];
  const sw = la.distanceTo(ra), cx = (la.x + ra.x) / 2, cz = s2.z, bustY = s2.y - 0.05 * (nk.y - s2.y), bellyY = (hips.y + s1.y) / 2;
  const hp = pos[bi("Head")];
  const v = new THREE.Vector3(), o = new THREE.Vector3(), acc = new THREE.Vector3(), pr = new THREE.Vector3(), ab = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) {
    v.fromBufferAttribute(P, i).applyMatrix4(m.bindMatrix); acc.set(0, 0, 0);
    let wsum = 0, hw = 0;
    const ww = (nm: string) => { let t = 0; for (let k = 0; k < 4; k++) if (key[SI.getComponent(i, k)] === nm) t += SW.getComponent(i, k); return t; };
    for (let k = 0; k < 4; k++) {
      const j = SI.getComponent(i, k), w = SW.getComponent(i, k); if (!w) continue; wsum += w;
      let kn = key[j]; if (/^Hand|HeadTop|Eye/.test(kn)) kn = "x"; if (kn === "Head") hw += w;
      const f = b[kn] ?? 1, c = child[j];
      if (c < 0 || f === 1) { acc.addScaledVector(v, w); continue; }
      ab.subVectors(pos[c], pos[j]); const L2 = ab.lengthSq();
      const t = Math.max(0, Math.min(1, L2 ? o.subVectors(v, pos[j]).dot(ab) / L2 : 0));
      pr.copy(pos[j]).addScaledVector(ab, t); o.subVectors(v, pr).multiplyScalar(f);
      acc.addScaledVector(pr.add(o), w);
    }
    if (wsum) acc.divideScalar(wsum); else acc.copy(v);
    if (b.belly) {
      const tw = ww("Spine") + ww("Spine1") + ww("Hips") + ww("Spine2") * 0.5;
      if (tw > 0 && acc.z > cz - sw * 0.1) {
        const dy = (acc.y - bellyY) / (sw * 0.55), dx = (acc.x - cx) / (sw * 0.6);
        acc.z += b.belly * sw * Math.exp(-dy * dy - dx * dx) * Math.min(1, tw) * Math.min(1, (acc.z - cz + sw * 0.1) / (sw * 0.2));
      }
    }
    if (fem) {
      const tor = ww("Spine2") + ww("Spine1") + ww("Shoulder") * 0.5;
      if (tor > 0 && acc.z > cz - sw * 0.05) for (const sx of [-1, 1]) {
        const dx = acc.x - (cx + sx * sw * 0.2), dy = acc.y - bustY;
        const e = Math.exp(-(dx * dx + dy * dy * 1.2) / (sw * sw * 0.05));
        acc.z += sw * 0.26 * e * Math.min(1, tor * 1.5); acc.y -= sw * 0.03 * e;
      }
      const hipW = ww("Hips") + ww("UpLeg") * Math.max(0, 1 - (hips.y - acc.y) / (sw * 0.6));
      if (hipW > 0) { acc.x = cx + (acc.x - cx) * (1 + 0.3 * Math.min(1, hipW)); if (acc.z < cz) acc.z -= sw * 0.05 * Math.min(1, hipW); }
      const wa = ww("Spine1") + ww("Spine") * 0.6; if (wa > 0) acc.x = cx + (acc.x - cx) * (1 - 0.14 * Math.min(1, wa));
      const sh = ww("Shoulder") + ww("Arm") * 0.3; if (sh > 0) acc.x = cx + (acc.x - cx) * (1 - 0.08 * Math.min(1, sh));
    }
    if (hw > 0) acc.lerp(o.subVectors(acc, hp).multiplyScalar(HEAD_SCALE).add(hp), Math.min(1, hw));
    acc.applyMatrix4(m.bindMatrixInverse); P.setXYZ(i, acc.x, acc.y, acc.z);
  }
  P.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
}

// ---------------- Figur ----------------
export interface Player {
  root: THREE.Group;
  handWorld: (v: THREE.Vector3) => THREE.Vector3;
  headWorld: (v: THREE.Vector3) => THREE.Vector3;
  update: (pose: Pose3D, phase: number, time: number, holding: boolean, dt: number) => void;
  dispose: () => void;
}

const CLIP: Record<Pose3D, string> = {
  stand: "Idle_Loop", walk: "Walk_Loop", throw: "Idle_Loop", collect: "PickUp_Table", sit: "Sitting_Idle_Loop",
  desk: "Sitting_Talking_Loop", drink: "Idle_Talking_Loop", wave: "Interact",
};

export function buildPlayer(assets: Assets, look: Look, _name: string): Player {
  void _name;
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };
  const model = SkeletonUtils.clone(assets.figur) as THREE.Group;
  model.scale.setScalar(assets.scale); model.position.y = assets.lift;
  const root = new THREE.Group(); root.add(model);
  const fem = look.gender === "f";
  model.traverse((o) => {
    const m = o as THREE.SkinnedMesh; if (!m.isMesh) return;
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    if (m.isSkinnedMesh) track(shapeBody(m, BUILD_SHAPE[look.build] ?? {}, fem));
  });
  const bones = new Map<string, THREE.Bone>();
  model.traverse((o) => { if ((o as THREE.Bone).isBone) bones.set(short(o.name), o as THREE.Bone); });
  const bone = (n: string) => bones.get(n)!;
  const head = bone("Head"), handR = bone("RightHand");
  root.updateMatrixWorld(true);

  // Dart in der rechten Hand (Größe in Metern, unabhängig vom Modell-Maßstab)
  const dart = buildDart(look.darts, 1.1);
  const dartHolder = new THREE.Group(); dartHolder.add(dart);
  const handPos = handR.getWorldPosition(new THREE.Vector3());
  dartHolder.position.copy(handPos).add(new THREE.Vector3(-0.05, -0.03, 0.03));
  dart.rotation.set(0, 0, Math.PI / 2);
  root.add(dartHolder); handR.attach(dartHolder);
  const cup = new THREE.Mesh(track(new THREE.CylinderGeometry(0.035, 0.03, 0.12, 14)), track(new THREE.MeshStandardMaterial({ color: "#f6c44a", roughness: 0.15, transparent: true, opacity: 0.9 })));
  cup.position.copy(handPos).add(new THREE.Vector3(-0.05, 0, 0.05)); root.add(cup); handR.attach(cup); cup.visible = false;

  // Animationen
  const mixer = new THREE.AnimationMixer(model);
  const actions = new Map<string, THREE.AnimationAction>();
  const action = (n: string) => {
    let a = actions.get(n);
    if (!a) { const c = retarget(assets, n); if (!c) return null; a = mixer.clipAction(c); actions.set(n, a); }
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

  const armOut = (ARM_OUT[look.build] ?? 0) + (fem && ARM_OUT[look.build] ? 0.03 : 0);
  const armL = bone("LeftArm"), armR = bone("RightArm"), foreR = bone("RightForeArm");
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qp = new THREE.Quaternion(), fwd = new THREE.Vector3();
  /** Knochen in Weltrichtung um die Vorwärtsachse der Figur drehen */
  const spread = (bn: THREE.Bone, a: number) => {
    bn.getWorldQuaternion(qa); qb.setFromAxisAngle(fwd, a); qa.premultiply(qb);
    bn.parent!.getWorldQuaternion(qp); bn.quaternion.copy(qp.invert().multiply(qa)); bn.updateMatrixWorld(true);
  };

  const update = (pose: Pose3D, phase: number, _time: number, holding: boolean, dt: number) => {
    void _time;
    play(CLIP[pose]);
    mixer.update(dt);
    dartHolder.visible = holding && pose !== "drink"; cup.visible = pose === "drink";
    root.updateMatrixWorld(true);
    if (armOut && pose !== "throw") {
      fwd.set(0, 0, 1).applyQuaternion(root.getWorldQuaternion(qb));
      spread(armL, armOut); spread(armR, -armOut);
    }
    if (pose === "throw") {
      let lift: number, bend: number;
      if (phase < 0.45) { lift = 1.25; bend = 1.7 + Math.sin(phase * 14) * 0.06; }
      else if (phase < 0.72) { const k = (phase - 0.45) / 0.27; lift = 1.25; bend = 1.7 + k * 0.5; }
      else { const k = Math.min(1, (phase - 0.72) / 0.1); lift = 1.25 + k * 0.15; bend = 2.2 - k * 2.0; }
      setWorldDir(armR, new THREE.Vector3(-0.15, Math.sin(lift - Math.PI / 2), Math.cos(lift - Math.PI / 2)).normalize());
      setWorldDir(foreR, new THREE.Vector3(-0.05, Math.sin(lift - Math.PI / 2 + bend), Math.cos(lift - Math.PI / 2 + bend)).normalize());
    }
  };

  // Richtet einen Arm-Knochen so aus, dass seine Längsachse in die gewünschte Richtung (Figurenraum) zeigt
  const boneAxis = new Map<THREE.Bone, THREE.Vector3>();
  function setWorldDir(b: THREE.Bone, dir: THREE.Vector3) {
    let axis = boneAxis.get(b);
    if (!axis) { const c = b.children.find((x) => (x as THREE.Bone).isBone); axis = (c ? c.position.clone() : new THREE.Vector3(0, 1, 0)).normalize(); boneAxis.set(b, axis); }
    root.updateMatrixWorld(true);
    const parentQ = b.parent!.getWorldQuaternion(new THREE.Quaternion());
    const rootQ = root.getWorldQuaternion(new THREE.Quaternion());
    const local = dir.clone().applyQuaternion(rootQ).applyQuaternion(parentQ.invert()).normalize();
    b.quaternion.setFromUnitVectors(axis, local); b.updateMatrixWorld(true);
  }

  const tmp = new THREE.Vector3();
  return {
    root,
    handWorld: (v) => { handR.updateWorldMatrix(true, false); return handR.getWorldPosition(v); },
    headWorld: (v) => { head.updateWorldMatrix(true, false); head.getWorldPosition(v); return v.add(tmp.set(0, 0.45, 0)); },
    update,
    dispose: () => { mixer.stopAllAction(); disposables.forEach((d) => d.dispose()); },
  };
}
