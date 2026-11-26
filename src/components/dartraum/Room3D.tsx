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
import { buildPlayer, loadPlayerAssets, type Player } from "./three/player";
import { BOARD, OCHE_Z, buildRoom, type BuiltRoom } from "./three/room";

// ---------------- Ablauf ----------------
type Task = { kind: "walk"; to: [number, number] } | { kind: Exclude<Pose3D, "walk">; dur: number; face: number };
const FACE = { board: Math.PI, east: Math.PI / 2, south: 0, west: -Math.PI / 2 };
const STAND: [number, number] = [4.08, OCHE_Z + 0.32];
const CALLS = ["Game on!", "Ton!", "Shot!", "Double!", "Come on!", "180!!"];

function plan(level: number, rand: () => number): Task[] {
  const t: Task[] = [];
  const go = (x: number, z: number) => t.push({ kind: "walk", to: [NaN, z] }, { kind: "walk", to: [x, z] });
  go(...STAND);
  t.push({ kind: "throw", dur: 3 * 1.2 + 0.4, face: FACE.board });
  t.push({ kind: "walk", to: [4, 0.62] }, { kind: "collect", dur: 1.2, face: FACE.board }, { kind: "walk", to: [4, 1.8] });
  const extra: (() => void)[] = [
    () => { go(2.6 + rand() * 2.6, 3.2 + rand() * 1.0); t.push({ kind: "wave", dur: 1.6, face: FACE.south }, { kind: "stand", dur: 1 + rand() * 1.5, face: FACE.south }); },
  ];
  if (level >= 2) {
    // Weg zwischen Couch und Couchtisch hindurch, nicht durch den Tisch
    extra.push(() => { go(1.5, 3.9); t.push({ kind: "walk", to: [1.5, 5.6] }, { kind: "walk", to: [0.8, 5.6] }, { kind: "sit", dur: 4.5 + rand() * 3, face: FACE.east }, { kind: "walk", to: [1.5, 5.6] }, { kind: "walk", to: [1.5, 3.9] }); });
    extra.push(() => { go(5.85, 6.0); t.push({ kind: "drink", dur: 3.6, face: FACE.east }); });
  }
  if (level >= 3) extra.push(() => { go(5.6, 2.6); t.push({ kind: "walk", to: [6.9, 2.6] }, { kind: "walk", to: [6.9, 2.02] }, { kind: "desk", dur: 5 + rand() * 2, face: FACE.board }, { kind: "walk", to: [6.9, 2.6] }); });
  extra[Math.floor(rand() * extra.length)]();
  if (rand() < 0.45) extra[Math.floor(rand() * extra.length)]();
  return t;
}

interface Sim {
  x: number; z: number; rot: number; pose: Pose3D; phase: number; tasks: Task[]; t: number;
  stuck: { x: number; y: number }[]; flying: { from: THREE.Vector3; to: [number, number]; t: number } | null; bubble: string | null; thrown: number;
}

const lerpAngle = (a: number, b: number, k: number) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * k; };

export function Room3D({ level, look, name, trophies, medals }: { level: number; look: Look; name: string; trophies: number; medals: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const ctl = useRef({ zoom: 1.15, az: 0, target: new THREE.Vector3(4, 0.9, 4) });
  const stage = useRef<{ scene: THREE.Scene; room?: BuiltRoom; char?: Player; resize: () => void } | null>(null);
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
    const sim: Sim = { x: 3.2, z: 4.2, rot: 0, pose: "stand", phase: 0, tasks: [], t: 0, stuck: [], flying: null, bubble: null, thrown: 0 };
    const rand = Math.random;
    const stuckGroup = new THREE.Group(); scene.add(stuckGroup);
    let flyDart: THREE.Group | null = null;
    let dartsFor: unknown = null;
    const target = ctl.current.target;
    Object.assign(window as unknown as Record<string, unknown>, { __room3d: ctl.current, __sim: sim });
    const v = new THREE.Vector3();

    const clock = new THREE.Clock();
    let raf = 0, levelSeen = -1, appliedZoom = ctl.current.zoom;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, clock.getDelta()), time = clock.elapsedTime;
      const st = stage.current!;
      if (ctl.current.zoom !== appliedZoom) { appliedZoom = ctl.current.zoom; resize(); }
      const char = st.char, room = st.room;
      // Kamera
      const az = ctl.current.az, dist = 20;
      camera.position.set(target.x + Math.sin(Math.PI / 4 + az) * dist, target.y + dist * 0.82, target.z + Math.cos(Math.PI / 4 + az) * dist);
      camera.lookAt(target);
      if (!char || !room) { composer.render(); return; }
      const lvl = (room as unknown as { level: number }).level;
      if (lvl !== levelSeen) { levelSeen = lvl; sim.tasks = []; sim.stuck = []; sim.flying = null; }
      // Pfeil-Modelle passend zum Look
      if (dartsFor !== look_.current) {
        dartsFor = look_.current;
        flyDart = buildDart(look_.current.darts, 1.5);
        flyDart.visible = false; scene.add(flyDart);
      }

      if (!sim.tasks.length) sim.tasks = plan(lvl, rand);
      const task = sim.tasks[0];
      if (task.kind === "walk") {
        const tx = Number.isNaN(task.to[0]) ? sim.x : task.to[0];
        const tz = Number.isNaN(task.to[1]) ? sim.z : task.to[1];
        const dx = tx - sim.x, dz = tz - sim.z, dist2 = Math.hypot(dx, dz);
        if (dist2 < 0.02) { sim.x = tx; sim.z = tz; sim.tasks.shift(); sim.t = 0; }
        else {
          const k = Math.min(1, (1.25 * dt) / dist2);
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
          sim.phase = n < 3 ? within : 0.99;
          if (n < 3 && within >= 0.74 && !sim.flying && sim.thrown <= n) {
            const a = rand() * Math.PI * 2, rad = Math.sqrt(rand()) * 0.24;
            sim.flying = { from: char.handWorld(new THREE.Vector3()), to: [Math.cos(a) * rad, Math.sin(a) * rad], t: 0 };
            sim.thrown = n + 1;
          }
          if (sim.t > 3.5 && !sim.bubble && rand() < 0.6) sim.bubble = CALLS[Math.floor(rand() * CALLS.length)];
        } else sim.phase = (sim.t / 1.8) % 1;
        if (task.kind === "collect" && sim.t > 0.7) sim.stuck = [];
        if (sim.t >= task.dur) { sim.tasks.shift(); sim.t = 0; sim.bubble = null; if (task.kind === "throw") sim.thrown = 0; }
      }
      // Figur setzen
      char.root.position.set(sim.x, room.floorAt(sim.x, sim.z), sim.z);
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
      room.animate(time);
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
    const onDown = (e: PointerEvent) => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); renderer.domElement.setPointerCapture(e.pointerId); };
    const onMove = (e: PointerEvent) => {
      const p = pts.get(e.pointerId); if (!p) return;
      if (pts.size === 1) { ctl.current.az = Math.max(-0.65, Math.min(0.65, ctl.current.az - (e.clientX - p.x) * 0.005)); }
      p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) { ctl.current.zoom = Math.max(0.8, Math.min(4, ctl.current.zoom * (d / pinch))); resize(); }
        pinch = d;
      }
    };
    const onUp = (e: PointerEvent) => { pts.delete(e.pointerId); pinch = 0; };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); ctl.current.zoom = Math.max(0.8, Math.min(4, ctl.current.zoom * (e.deltaY < 0 ? 1.1 : 0.9))); resize(); };
    const c = renderer.domElement;
    c.addEventListener("pointerdown", onDown); c.addEventListener("pointermove", onMove); c.addEventListener("pointerup", onUp); c.addEventListener("pointercancel", onUp); c.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      c.removeEventListener("pointerdown", onDown); c.removeEventListener("pointermove", onMove); c.removeEventListener("pointerup", onUp); c.removeEventListener("pointercancel", onUp); c.removeEventListener("wheel", onWheel);
      stage.current?.room?.dispose(); stage.current?.char?.dispose();
      scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); });
      composer.dispose(); renderer.dispose(); c.remove();
      stage.current = null;
    };
  }, []);

  // aktueller Look für die Schleife
  const look_ = useRef(look);
  look_.current = look;

  // Raum bei Stufenwechsel neu bauen
  useEffect(() => {
    const st = stage.current; if (!st) return;
    const room = buildRoom(level, { name, trophies, medals });
    (room as unknown as { level: number }).level = level;
    st.room?.group.removeFromParent(); st.room?.dispose();
    st.scene.add(room.group); st.room = room;
  }, [level, name, trophies, medals]);

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
