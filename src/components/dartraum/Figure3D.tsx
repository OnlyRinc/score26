"use client";
// 3D-Vorschau der Spielerfigur für den Kleiderschrank: dreht sich langsam, mit dem Finger drehbar.
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Look } from "@/lib/dartraum/catalog";
import { buildCharacter, type Character } from "./three/character";

export function Figure3D({ look, name, className = "", pose = "stand" }: { look: Look; name: string; className?: string; pose?: "stand" | "wave" }) {
  const wrap = useRef<HTMLDivElement>(null);
  const st = useRef<{ scene: THREE.Scene; char?: Character; rot: number; drag: boolean; idle: number } | null>(null);

  useEffect(() => {
    const el = wrap.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    Object.assign(renderer.domElement.style, { display: "block", width: "100%", height: "100%", touchAction: "pan-y" });
    el.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    camera.position.set(0, 1.3, 4.9); camera.lookAt(0, 0.95, 0);
    scene.add(new THREE.HemisphereLight("#fff4ea", "#3a2440", 1.6));
    const key = new THREE.DirectionalLight("#ffffff", 2.4); key.position.set(2.5, 4, 3); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -1.5, right: 1.5, top: 2.5, bottom: -0.5 }); key.shadow.radius = 4; scene.add(key);
    const rim1 = new THREE.PointLight("#d63ce0", 6, 6, 1.5); rim1.position.set(-2, 1.8, -1.5); scene.add(rim1);
    const rim2 = new THREE.PointLight("#5fe3f0", 5, 6, 1.5); rim2.position.set(2, 1.4, -1.6); scene.add(rim2);
    // Podest
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.08, 48), new THREE.MeshStandardMaterial({ color: "#1d1826", roughness: 0.35, metalness: 0.2 }));
    disc.position.y = -0.04; disc.receiveShadow = true; scene.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.012, 8, 64), new THREE.MeshStandardMaterial({ color: "#d63ce0", emissive: "#d63ce0", emissiveIntensity: 2 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.0; scene.add(ring);

    st.current = { scene, rot: 0.35, drag: false, idle: 0 };
    const resize = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();

    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dt = clock.getDelta(), s = st.current!;
      if (!s.drag) { s.idle += dt; if (s.idle > 1.5) s.rot += dt * 0.45; }
      if (s.char) { s.char.root.rotation.y = s.rot; s.char.update(pose_.current, 0, clock.elapsedTime, true); }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    let lastX = 0;
    const c = renderer.domElement;
    const down = (e: PointerEvent) => { st.current!.drag = true; lastX = e.clientX; };
    const move = (e: PointerEvent) => { const s = st.current!; if (!s.drag) return; s.rot += (e.clientX - lastX) * 0.012; lastX = e.clientX; s.idle = 0; };
    const up = () => { st.current!.drag = false; st.current!.idle = 0; };
    c.addEventListener("pointerdown", down); window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      c.removeEventListener("pointerdown", down); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      st.current?.char?.dispose();
      scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); } });
      renderer.dispose(); c.remove(); st.current = null;
    };
  }, []);

  const pose_ = useRef(pose); pose_.current = pose;

  useEffect(() => {
    let cancelled = false;
    const make = () => {
      const s = st.current; if (!s || cancelled) return;
      const ch = buildCharacter(look, name);
      s.char?.root.removeFromParent(); s.char?.dispose();
      s.scene.add(ch.root); s.char = ch;
    };
    if (document.fonts) document.fonts.ready.then(make); else make();
    return () => { cancelled = true; };
  }, [look, name]);

  /** Vorne / Hinten per Knopf */
  const turn = (to: number) => { const s = st.current; if (s) { s.rot = to; s.idle = -2; } };

  return (
    <div className={`relative ${className}`}>
      <div ref={wrap} className="h-full w-full" role="img" aria-label="Spielerfigur in 3D" />
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-black/40 p-1 text-xs backdrop-blur">
        <button className="rounded-full px-3 py-1 font-semibold uppercase tracking-wider text-white/80 active:scale-95" onClick={() => turn(0)}>Vorne</button>
        <button className="rounded-full px-3 py-1 font-semibold uppercase tracking-wider text-white/80 active:scale-95" onClick={() => turn(Math.PI)}>Hinten</button>
      </div>
    </div>
  );
}
