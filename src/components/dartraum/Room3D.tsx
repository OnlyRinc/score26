"use client";
// Dartraum in echtem 3D (three.js): isometrische Kamera, weiches Licht, Schatten, Leuchteffekte.
// Die Figur läuft selbstständig: werfen, Pfeile holen, Couch, Bar, Schreibtisch.
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import type { Look } from "@/lib/dartraum/catalog";
import { buildDart, type Pose3D } from "./three/character";
import { buildPlayer, loadPlayerAssets, type Player } from "./three/figur";
import { BOARD, OCHE_Z, buildRoom, loadFurniture, type BuiltRoom } from "./three/room";
import { STAGE_RECT, buildItems, footprintMarker, placeObject, type BuiltItems, type UsePoint } from "./three/items";
import { FURNITURE_BY_ID, canPlace, snap, type Placed } from "@/lib/dartraum/furniture";
import { endVisit, legAverage, newLeg, playDart, sigmaForAverage, visitOver, type LegState } from "@/lib/dartraum/legsim";
import { fonts } from "./three/textures";

// ---------------- Ablauf ----------------
type Task = { kind: "walk"; to: [number, number] } | { kind: Exclude<Pose3D, "walk">; dur: number; face: number; lift?: number };
const FACE = { board: Math.PI, east: Math.PI / 2, south: 0, west: -Math.PI / 2 };
const STAND: [number, number] = [4.08, OCHE_Z + 0.32];
/** Test-Version: die Figur spielt im Schnitt diesen 3-Dart-Average (später aus Level und Spielerstatistik) */
const TEST_AVERAGE = 65;
/** Board im Raum ist größer als ein echtes: Meter pro Board-Millimeter (Board-Radius 0.36 m = 225 mm) */
const MM = 0.36 / 225;

/** Eine Aufnahme: zur Oche, 3 Pfeile, Pfeile holen. Mit Pause vorher (nach einem gewonnenen Leg) oder Pfeile holen zuerst. */
function plan(uses: UsePoint[], rand: () => number, pause: boolean, collectFirst: boolean): Task[] {
  const t: Task[] = [];
  const go = (x: number, z: number) => t.push({ kind: "walk", to: [NaN, z] }, { kind: "walk", to: [x, z] });
  const collect = () => t.push({ kind: "walk", to: [4, 0.62] }, { kind: "collect", dur: 1.2, face: FACE.board }, { kind: "walk", to: [4, 1.8] });
  if (collectFirst) { collect(); return t; }
  if (pause) breakTasks(t, go, uses, rand);
  go(...STAND);
  t.push({ kind: "throw", dur: 3 * 1.2 + 0.4, face: FACE.board });
  collect();
  return t;
}

/** Pause zwischen zwei Legs: Möbel benutzen oder winken */
function breakTasks(t: Task[], go: (x: number, z: number) => void, uses: UsePoint[], rand: () => number) {
  const extra: (() => void)[] = [
    () => { go(2.6 + rand() * 2.6, 3.4 + rand() * 1.0); t.push({ kind: "wave", dur: 1.6, face: FACE.south }, { kind: "stand", dur: 1 + rand() * 1.5, face: FACE.south }); },
  ];
  // Alles, was im Raum steht und benutzt werden kann: Couch, Sessel, Stuhl, Bar, Streaming-Tisch
  for (const u of uses) {
    extra.push(() => {
      go(u.front[0], u.front[1]);
      t.push({ kind: "walk", to: [u.x, u.z] });
      const dur = u.kind === "drink" ? 3.6 : 4.5 + rand() * 3;
      t.push({ kind: u.kind, dur, face: u.face, lift: u.lift } as Task);
      t.push({ kind: "walk", to: [u.front[0], u.front[1]] });
    });
  }
  // Möbel kommen öfter dran als das Winken
  const pick = () => extra[uses.length && rand() < 0.8 ? 1 + Math.floor(rand() * uses.length) : 0]();
  pick();
  if (rand() < 0.45) pick();
}

interface Sim {
  x: number; z: number; rot: number; pose: Pose3D; phase: number; tasks: Task[]; t: number;
  stuck: { x: number; y: number }[]; flying: { from: THREE.Vector3; to: [number, number]; t: number } | null; bubble: string | null; thrown: number;
  leg: LegState; pause: boolean;
}

/** Ansage am Ende einer Aufnahme */
function visitCall(leg: LegState): string {
  if (leg.done) return "Game shot!";
  if (leg.bust) return "Bust!";
  const sum = leg.visit.reduce((a, h) => a + h.score, 0);
  if (sum === 180) return "180!!";
  if (sum >= 140) return `${sum}!`;
  if (sum >= 100) return `Ton! ${sum}`;
  return String(sum);
}

/** Kleine Anzeigetafel über dem Board: Rest, letzte Pfeile, Average */
function drawScoreboard(ctx: CanvasRenderingContext2D, w: number, h: number, name: string, leg: LegState) {
  const f = fonts();
  ctx.fillStyle = "#07060a"; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#d63ce0"; ctx.lineWidth = 6; ctx.strokeRect(3, 3, w - 6, h - 6);
  ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.fillStyle = "#9a93a8"; ctx.font = `600 34px ${f.display}`; ctx.fillText(name.toUpperCase().slice(0, 16), 22, 36);
  ctx.textAlign = "right"; ctx.fillText(`LEGS ${leg.legs}`, w - 22, 36);
  ctx.textAlign = "center"; ctx.fillStyle = leg.done ? "#5fe3f0" : "#ffffff"; ctx.font = `700 120px ${f.display}`;
  ctx.fillText(leg.done ? "CHECK" : String(leg.rest), w / 2, 132);
  const darts = leg.visit.length ? leg.visit : leg.lastVisit;
  ctx.font = `600 40px ${f.display}`;
  for (let i = 0; i < 3; i++) {
    const x = w / 2 + (i - 1) * 150, d = darts[i];
    ctx.fillStyle = "#1b1724"; ctx.fillRect(x - 66, 196, 132, 52);
    ctx.fillStyle = d ? (d.mult === 3 ? "#ff5a7a" : d.mult === 2 ? "#5fe3f0" : "#ffffff") : "#3a3446";
    ctx.fillText(d ? d.label : "–", x, 223);
  }
  ctx.fillStyle = "#f3d77f"; ctx.font = `600 32px ${f.display}`;
  ctx.fillText(`Ø ${legAverage(leg).toFixed(1)}   ·   ${leg.darts} PFEILE${leg.bust ? "   ·   BUST" : ""}`, w / 2, 280);
}

/** Laufgeschwindigkeit passend zur Schrittlänge der Lauf-Animation (sonst rutschen die Füße) */
const WALK_SPEED = 0.84;

const lerpAngle = (a: number, b: number, k: number) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * k; };

export interface Room3DProps {
  level: number; layout: Placed[]; look: Look; name: string; trophies: number; medals: number;
  /** Einrichten: Möbel antippen und verschieben */
  editing?: boolean; selected?: string | null;
  onSelect?: (uid: string | null) => void; onMove?: (p: Placed) => void;
}

export function Room3D({ level, layout, look, name, trophies, medals, editing = false, selected = null, onSelect, onMove }: Room3DProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const ctl = useRef({ zoom: 1.15, az: 0, target: new THREE.Vector3(4, 0.9, 4) });
  const stage = useRef<{ scene: THREE.Scene; room?: BuiltRoom; items?: BuiltItems; char?: Player; resize: () => void } | null>(null);
  const [kit, setKit] = useState<THREE.Object3D | null | undefined>(undefined);
  const layout_ = useRef(layout); layout_.current = layout;
  const edit_ = useRef({ editing, selected, onSelect, onMove }); edit_.current = { editing, selected, onSelect, onMove };
  const [failed, setFailed] = useState(false);

  // Grundgerüst: Renderer, Kamera, Schleife
  useEffect(() => {
    const el = wrap.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" }); }
    catch { setFailed(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = "block"; renderer.domElement.style.width = "100%"; renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "none";
    el.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.45, 0.45, 0.9);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false); composer.setSize(w, h);
      const aspect = w / h;
      const half = Math.max(5.0, 7.2 / aspect) / ctl.current.zoom;
      camera.left = -half * aspect; camera.right = half * aspect; camera.top = half; camera.bottom = -half;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize); ro.observe(el);
    stage.current = { scene, resize };
    resize();

    // Ablauf
    const sim: Sim = { x: 3.2, z: 4.2, rot: 0, pose: "stand", phase: 0, tasks: [], t: 0, stuck: [], flying: null, bubble: null, thrown: 0, leg: newLeg(), pause: false };
    const rand = Math.random;
    const sigma = sigmaForAverage(TEST_AVERAGE);
    // Anzeigetafel über dem Board
    const sbCanvas = document.createElement("canvas"); sbCanvas.width = 512; sbCanvas.height = 300;
    const sbTex = new THREE.CanvasTexture(sbCanvas); sbTex.colorSpace = THREE.SRGBColorSpace; sbTex.anisotropy = 4;
    const scoreboard = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.363), new THREE.MeshBasicMaterial({ map: sbTex, toneMapped: false }));
    scoreboard.position.set(BOARD.x, 2.76, 0.035); scene.add(scoreboard);
    const sbFrame = new THREE.Mesh(new THREE.BoxGeometry(0.67, 0.41, 0.04), new THREE.MeshStandardMaterial({ color: "#121016", roughness: 0.5 }));
    sbFrame.position.set(BOARD.x, 2.76, 0.012); sbFrame.castShadow = true; scene.add(sbFrame);
    let sbKey = "";
    const drawSb = () => {
      const l = sim.leg, key = `${l.rest}|${l.darts}|${l.visit.length}|${l.legs}|${l.bust}|${l.done}|${name_.current}`;
      if (key === sbKey) return; sbKey = key;
      drawScoreboard(sbCanvas.getContext("2d")!, sbCanvas.width, sbCanvas.height, name_.current, l); sbTex.needsUpdate = true;
    };
    const stuckGroup = new THREE.Group(); scene.add(stuckGroup);
    let flyDart: THREE.Group | null = null;
    let dartsFor: unknown = null;
    const target = ctl.current.target;
    Object.assign(window as unknown as Record<string, unknown>, { __room3d: ctl.current, __sim: sim, __stage: stage, __cam: camera });
    const v = new THREE.Vector3();

    const clock = new THREE.Clock();
    let raf = 0, appliedZoom = ctl.current.zoom;
    let itemsSeen: BuiltItems | undefined;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, clock.getDelta()), time = clock.elapsedTime;
      const st = stage.current!;
      if (ctl.current.zoom !== appliedZoom) { appliedZoom = ctl.current.zoom; resize(); }
      const char = st.char, room = st.room, items = st.items;
      // Kamera
      const az = ctl.current.az, dist = 20;
      camera.position.set(target.x + Math.sin(Math.PI / 4 + az) * dist, target.y + dist * 0.82, target.z + Math.cos(Math.PI / 4 + az) * dist);
      camera.lookAt(target);
      if (!char || !room || !items) { composer.render(); return; }
      if (items !== itemsSeen) { itemsSeen = items; sim.tasks = []; sim.flying = null; }
      drawSb();
      // Pfeil-Modelle passend zum Look
      if (dartsFor !== look_.current) {
        dartsFor = look_.current;
        flyDart = buildDart(look_.current.darts, 1.5);
        flyDart.visible = false; scene.add(flyDart);
      }

      if (!sim.tasks.length) { sim.tasks = plan(items.uses, rand, sim.pause, sim.stuck.length > 0 || sim.leg.visit.length > 0); sim.pause = false; }
      const task = sim.tasks[0];
      if (task.kind === "walk") {
        const tx = Number.isNaN(task.to[0]) ? sim.x : task.to[0];
        const tz = Number.isNaN(task.to[1]) ? sim.z : task.to[1];
        const dx = tx - sim.x, dz = tz - sim.z, dist2 = Math.hypot(dx, dz);
        if (dist2 < 0.02) { sim.x = tx; sim.z = tz; sim.tasks.shift(); sim.t = 0; }
        else {
          const k = Math.min(1, (WALK_SPEED * dt) / dist2);
          sim.x += dx * k; sim.z += dz * k;
          sim.rot = lerpAngle(sim.rot, Math.atan2(dx, dz), Math.min(1, dt * 10));
          sim.pose = "walk"; sim.phase = (sim.phase + dt * 1.55) % 1;
        }
      } else {
        sim.t += dt;
        sim.rot = lerpAngle(sim.rot, task.face, Math.min(1, dt * 8));
        sim.pose = task.kind;
        if (task.kind === "throw") {
          const n = Math.floor(sim.t / 1.2), within = (sim.t % 1.2) / 1.2;
          const over = visitOver(sim.leg);
          sim.phase = n < 3 && !(over && n >= sim.thrown) ? within : 0.99;
          if (n < 3 && !over && within >= 0.74 && !sim.flying && sim.thrown <= n) {
            // echter Wurf: Ziel nach Rest wählen, mit Streuung treffen, Punkte zählen
            const hit = playDart(sim.leg, sigma, rand);
            let x = hit.x * MM, y = hit.y * MM;
            const r = Math.hypot(x, y); if (r > 0.58) { x *= 0.58 / r; y *= 0.58 / r; } // daneben: steckt im Surround
            sim.flying = { from: char.handWorld(new THREE.Vector3()), to: [x, y], t: 0 };
            sim.thrown = n + 1;
          }
          // Aufnahme vorbei (3 Pfeile, Bust oder Checkout): kurz ansagen, dann Pfeile holen
          if (over && !sim.flying) {
            if (!sim.bubble) sim.bubble = visitCall(sim.leg);
            if (sim.t > sim.thrown * 1.2 + 1.6) { sim.tasks.shift(); sim.t = 0; sim.thrown = 0; }
          }
        } else sim.phase = (sim.t / 1.8) % 1;
        if (task.kind === "collect" && sim.t > 0.7 && (sim.stuck.length || sim.leg.visit.length)) {
          sim.stuck = []; sim.bubble = null;
          endVisit(sim.leg);
          // Leg gewonnen: neues Leg, vorher Pause
          if (sim.leg.done) { sim.leg = newLeg(sim.leg.legs); sim.pause = true; }
        }
        if (sim.t >= task.dur) { sim.tasks.shift(); sim.t = 0; sim.bubble = null; if (task.kind === "throw") sim.thrown = 0; }
      }
      // Figur setzen
      // Sitzhöhe kommt vom Möbel; auf der Bühne steht man 10 cm höher
      const onStage = items.stage && sim.x >= STAGE_RECT.x0 && sim.x <= STAGE_RECT.x1 && sim.z >= STAGE_RECT.z0 && sim.z <= STAGE_RECT.z1;
      const lift = task.kind !== "walk" ? task.lift ?? 0 : 0;
      char.root.position.set(sim.x, (onStage ? STAGE_RECT.h : 0) + lift, sim.z);
      char.root.rotation.y = sim.rot;
      const holding = (sim.pose === "throw" && (sim.phase < 0.74 || sim.thrown < 3)) || sim.pose === "stand" || sim.pose === "walk";
      char.update(sim.pose, sim.phase, time, holding && !(sim.pose === "throw" && sim.phase >= 0.74 && sim.phase < 1), dt);
      // fliegender Pfeil
      if (flyDart) {
        if (sim.flying) {
          sim.flying.t += dt / 0.28;
          const to = new THREE.Vector3(BOARD.x + sim.flying.to[0], BOARD.y + sim.flying.to[1], BOARD.z + 0.02);
          const k = Math.min(1, sim.flying.t);
          flyDart.position.lerpVectors(sim.flying.from, to, k); flyDart.position.y += Math.sin(k * Math.PI) * 0.12;
          flyDart.lookAt(to); flyDart.rotateX(Math.PI / 2);
          flyDart.visible = true;
          if (sim.flying.t >= 1) { sim.stuck.push({ x: sim.flying.to[0], y: sim.flying.to[1] }); sim.flying = null; }
        } else flyDart.visible = false;
      }
      // steckende Pfeile
      if (stuckGroup.children.length !== sim.stuck.length) {
        stuckGroup.clear();
        for (const s of sim.stuck) {
          const d = buildDart(look_.current.darts, 1.5);
          d.rotation.x = -Math.PI / 2 + (s.y * 0.6); d.rotation.z = s.x * 0.5;
          d.position.set(BOARD.x + s.x, BOARD.y + s.y, BOARD.z + 0.215);
          stuckGroup.add(d);
        }
      }
      room.animate(time); items.animate(time);
      // Sprechblase
      const b = bubbleRef.current;
      if (b) {
        if (sim.bubble) {
          char.headWorld(v).project(camera);
          b.style.opacity = "1"; b.textContent = sim.bubble;
          b.style.transform = `translate(-50%, -100%) translate(${((v.x + 1) / 2) * el.clientWidth}px, ${((1 - v.y) / 2) * el.clientHeight - 8}px)`;
        } else b.style.opacity = "0";
      }
      composer.render();
    };
    raf = requestAnimationFrame(tick);

    // Ziehen zum Drehen, Mausrad und Zwei-Finger zum Zoomen
    const pts = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    // Einrichten: Möbel antippen und auf dem Boden verschieben
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitPt = new THREE.Vector3();
    let drag: { uid: string; orig: Placed; cur: Placed; off: [number, number]; ok: boolean } | null = null;
    let marker: THREE.Mesh | null = null;
    const setMarker = (p: Placed | null, ok: boolean) => {
      if (marker) { marker.removeFromParent(); marker.geometry.dispose(); (marker.material as THREE.Material).dispose(); marker = null; }
      if (p && !FURNITURE_BY_ID.get(p.id)?.fixed) { marker = footprintMarker(p, ok); scene.add(marker); }
    };
    const floorAtPointer = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.ray.intersectPlane(floorPlane, hitPt) ? [hitPt.x, hitPt.z] as [number, number] : null;
    };
    const pickItem = (e: PointerEvent): string | null => {
      const items = stage.current?.items; if (!items) return null;
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      for (const h of ray.intersectObjects(items.group.children, true)) {
        let o: THREE.Object3D | null = h.object;
        while (o && !o.userData.uid) o = o.parent;
        const uid = o?.userData.uid as string | undefined;
        const p = uid ? layout_.current.find((x) => x.uid === uid) : undefined;
        if (p && !FURNITURE_BY_ID.get(p.id)?.fixed) return uid!;
      }
      return null;
    };
    const onDown = (e: PointerEvent) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); renderer.domElement.setPointerCapture(e.pointerId);
      const ed = edit_.current;
      if (!ed.editing || pts.size > 1) { if (drag) { cancelDrag(); } return; }
      const uid = pickItem(e);
      ed.onSelect?.(uid);
      const p = uid ? layout_.current.find((x) => x.uid === uid) : undefined;
      const at = floorAtPointer(e);
      if (p && at) { drag = { uid: p.uid, orig: p, cur: p, off: [p.x - at[0], p.z - at[1]], ok: true }; setMarker(p, true); }
    };
    const cancelDrag = () => {
      if (!drag) return;
      const o = stage.current?.items?.objects.get(drag.uid); if (o) placeObject(o, drag.orig);
      drag = null;
    };
    const onMove = (e: PointerEvent) => {
      const p = pts.get(e.pointerId); if (!p) return;
      if (drag) {
        p.x = e.clientX; p.y = e.clientY;
        const at = floorAtPointer(e); if (!at) return;
        const def = FURNITURE_BY_ID.get(drag.orig.id)!;
        let next: Placed;
        if (def.wall) {
          // an die nähere Wand: hinten (z = 0) oder links (x = 0)
          next = at[1] <= at[0] ? { ...drag.orig, rot: 0, x: snap(at[0]), z: 0 } : { ...drag.orig, rot: 1, x: 0, z: snap(at[1]) };
        } else next = { ...drag.orig, x: snap(at[0] + drag.off[0]), z: snap(at[1] + drag.off[1]) };
        drag.cur = next; drag.ok = canPlace(next, layout_.current);
        const o = stage.current?.items?.objects.get(drag.uid); if (o) placeObject(o, next);
        setMarker(next, drag.ok);
        return;
      }
      if (pts.size === 1) { ctl.current.az = Math.max(-0.65, Math.min(0.65, ctl.current.az - (e.clientX - p.x) * 0.005)); }
      p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) { ctl.current.zoom = Math.max(0.8, Math.min(4, ctl.current.zoom * (d / pinch))); resize(); }
        pinch = d;
      }
    };
    const onUp = (e: PointerEvent) => {
      pts.delete(e.pointerId); pinch = 0;
      if (drag) {
        const d = drag; drag = null;
        const moved = d.cur.x !== d.orig.x || d.cur.z !== d.orig.z || d.cur.rot !== d.orig.rot;
        if (moved && d.ok) edit_.current.onMove?.(d.cur);
        else { const o = stage.current?.items?.objects.get(d.uid); if (o) placeObject(o, d.orig); }
        const sel = layout_.current.find((x) => x.uid === edit_.current.selected);
        setMarker(edit_.current.editing && sel ? (moved && d.ok ? d.cur : sel) : null, true);
      }
    };
    (stage.current as unknown as { setMarker: typeof setMarker }).setMarker = setMarker;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); ctl.current.zoom = Math.max(0.8, Math.min(4, ctl.current.zoom * (e.deltaY < 0 ? 1.1 : 0.9))); resize(); };
    const c = renderer.domElement;
    c.addEventListener("pointerdown", onDown); c.addEventListener("pointermove", onMove); c.addEventListener("pointerup", onUp); c.addEventListener("pointercancel", onUp); c.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      c.removeEventListener("pointerdown", onDown); c.removeEventListener("pointermove", onMove); c.removeEventListener("pointerup", onUp); c.removeEventListener("pointercancel", onUp); c.removeEventListener("wheel", onWheel);
      stage.current?.room?.dispose(); stage.current?.items?.dispose(); stage.current?.char?.dispose();
      scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); });
      composer.dispose(); renderer.dispose(); c.remove();
      stage.current = null;
    };
  }, []);

  // aktueller Look für die Schleife
  const look_ = useRef(look);
  look_.current = look;
  const name_ = useRef(name);
  name_.current = name;

  // Grundraum bei Stilwechsel neu bauen
  useEffect(() => {
    const st = stage.current; if (!st) return;
    const room = buildRoom(level, { name, trophies, medals });
    st.room?.group.removeFromParent(); st.room?.dispose();
    st.scene.add(room.group); st.room = room;
  }, [level, name, trophies, medals]);

  // Fertige Möbel einmal laden; klappt das nicht, fehlen eben die KayKit-Teile
  useEffect(() => { let ok = true; loadFurniture().then((k) => ok && setKit(k), () => ok && setKit(null)); return () => { ok = false; }; }, []);

  // Möbel neu aufstellen, wenn sich der Aufbau ändert
  useEffect(() => {
    const st = stage.current; if (!st || kit === undefined) return;
    const items = buildItems(layout, level, kit ?? undefined, { name });
    st.items?.group.removeFromParent(); st.items?.dispose();
    st.scene.add(items.group); st.items = items;
  }, [layout, level, kit, name]);

  // Markierung für das ausgewählte Möbel
  useEffect(() => {
    const st = stage.current as unknown as { setMarker?: (p: Placed | null, ok: boolean) => void } | null;
    const sel = editing ? layout.find((p) => p.uid === selected) ?? null : null;
    st?.setMarker?.(sel, true);
  }, [editing, selected, layout]);

  // Figur bei Look-Wechsel neu bauen (Schriften vorher laden, damit der Name sauber aufs Trikot kommt)
  useEffect(() => {
    let cancelled = false;
    const make = async () => {
      const assets = await loadPlayerAssets();
      const st = stage.current; if (!st || cancelled) return;
      const char = buildPlayer(assets, look, name);
      if (st.char) { char.root.position.copy(st.char.root.position); char.root.rotation.copy(st.char.root.rotation); st.char.root.removeFromParent(); st.char.dispose(); }
      st.scene.add(char.root); st.char = char;
    };
    if (typeof document !== "undefined" && document.fonts) document.fonts.ready.then(make); else make();
    return () => { cancelled = true; };
  }, [look, name]);

  const zoom = (k: number) => { ctl.current.zoom = Math.max(0.8, Math.min(4, ctl.current.zoom * k)); stage.current?.resize(); };
  const btn = "grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-black/40 text-2xl text-white backdrop-blur transition active:scale-90";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-[radial-gradient(ellipse_at_50%_40%,#2a1f3a_0%,#120e18_55%,#08070b_100%)]">
      <div ref={wrap} className="relative aspect-[4/3] w-full sm:aspect-[16/10]" role="img" aria-label="Dartraum in 3D">
        <div ref={bubbleRef} className="pointer-events-none absolute left-0 top-0 rounded-2xl border-2 border-[#15101c] bg-white px-3 py-1 font-display text-lg font-bold uppercase text-[#15101c] opacity-0 shadow-lg transition-opacity" />
      </div>
      {failed && <div className="absolute inset-0 grid place-items-center p-6 text-center text-muted">Dein Gerät kann die 3D-Ansicht leider nicht anzeigen.</div>}
      <div className="absolute right-3 top-3 flex flex-col gap-2">
        <button className={btn} aria-label="Hineinzoomen" onClick={() => zoom(1.2)}>+</button>
        <button className={btn} aria-label="Herauszoomen" onClick={() => zoom(1 / 1.2)}>−</button>
        <button className={btn} aria-label="Ansicht zurücksetzen" onClick={() => { ctl.current.az = 0; ctl.current.zoom = 1.15; stage.current?.resize(); }}>⟲</button>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-4 text-xs text-white/50">Wischen zum Drehen · zwei Finger zum Zoomen</div>
    </div>
  );
}
