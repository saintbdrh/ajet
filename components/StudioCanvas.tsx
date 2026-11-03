"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/lib/i18n";

export type StudioControls = { view: (angle: number) => void; zoom: (scale: number) => void; reset: () => void };

export default function StudioCanvas({ locale, playing, controls, onReady, onError, onInteract }: {
  locale: Locale; playing: boolean; controls: React.MutableRefObject<StudioControls | null>;
  onReady: () => void; onError: () => void; onInteract: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const autoplay = useRef(playing);
  useEffect(() => { autoplay.current = playing; }, [playing]);

  useEffect(() => {
    if (!host.current) return;
    const container = host.current;
    let disposed = false;
    let cleanup = () => {};
    void (async () => {
      const [THREE, { GLTFLoader }, { OrbitControls }, { Reflector }, { RoomEnvironment }, { DRACOLoader }] = await Promise.all([
        import("three"), import("three/addons/loaders/GLTFLoader.js"), import("three/addons/controls/OrbitControls.js"),
        import("three/addons/objects/Reflector.js"), import("three/addons/environments/RoomEnvironment.js"), import("three/addons/loaders/DRACOLoader.js"),
      ]);
      if (disposed) return;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setClearColor(0x020609);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      container.appendChild(renderer.domElement);
      const canvas = renderer.domElement;
      canvas.tabIndex = 0;
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", locale === "mn" ? "EC145 нисдэг тэрэг. Чирж эргүүлнэ. Сумтай товчоор өнцөг солино." : "EC145 helicopter. Drag to orbit. Use arrow keys to change the view.");
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x020609, .014);
      const camera = new THREE.PerspectiveCamera(36, 1, .1, 250);
      const orbit = new OrbitControls(camera, canvas);
      orbit.enableDamping = true;
      orbit.dampingFactor = .075;
      orbit.enablePan = false;
      orbit.enableZoom = false; // Page scrolling stays available; explicit controls zoom the model.
      orbit.minPolarAngle = .18;
      orbit.maxPolarAngle = Math.PI / 2 - .04;
      orbit.rotateSpeed = .55;
      const pmrem = new THREE.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      const environment = pmrem.fromScene(room, .04);
      scene.environment = environment.texture;
      scene.environmentIntensity = .45;
      room.dispose();
      const key = new THREE.SpotLight(0xe6efff, 800, 80, Math.PI / 4, .85, 1.5);
      key.position.set(-5, 12, 6); scene.add(key, key.target);
      const rim = new THREE.SpotLight(0x6ba2c8, 1000, 80, Math.PI / 3, .9, 1.5);
      rim.position.set(7, 9, -6); scene.add(rim, rim.target);
      const fill = new THREE.HemisphereLight(0xbedbff, 0x081018, .65); scene.add(fill);
      const floor = new Reflector(new THREE.PlaneGeometry(120, 120), {
        color: 0x333c43, textureWidth: 768, textureHeight: 768, clipBias: .003, multisample: 0,
      });
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -.025;
      // A restrained, slightly softened reflection rather than a perfect mirror.
      if (floor.material instanceof THREE.ShaderMaterial) floor.material.fragmentShader = floor.material.fragmentShader.replace(
        "vec4 base = texture2DProj( tDiffuse, vUv );",
        `vec2 uv = vUv.xy / vUv.w;
         vec4 base = texture2D(tDiffuse, uv) * 0.4;
         base += texture2D(tDiffuse, uv + vec2(0.0018, 0.0)) * 0.15;
         base += texture2D(tDiffuse, uv - vec2(0.0018, 0.0)) * 0.15;
         base += texture2D(tDiffuse, uv + vec2(0.0, 0.0018)) * 0.15;
         base += texture2D(tDiffuse, uv - vec2(0.0, 0.0018)) * 0.15;
         base.rgb *= 0.28;`,
      );
      scene.add(floor);
      let inView = true;
      let model: InstanceType<typeof THREE.Group> | undefined;
      let bounds = new THREE.Box3();
      const fitPoints: InstanceType<typeof THREE.Vector3>[] = [];
      let fittedDistance = 20;
      let angle = -Math.PI * .72;
      const target = new THREE.Vector3(0, 1.8, 0);
      function fit(nextAngle = angle) {
        angle = nextAngle;
        const direction = new THREE.Vector3(Math.sin(angle), .3, Math.cos(angle)).normalize();
        const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
        const up = new THREE.Vector3().crossVectors(direction, right).normalize();
        const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const tanX = tanY * camera.aspect;
        let distance = 1;
        for (const point of fitPoints) {
          const corner = point.clone().sub(target);
          distance = Math.max(distance, corner.dot(direction) + Math.abs(corner.dot(right)) / tanX, corner.dot(direction) + Math.abs(corner.dot(up)) / tanY);
        }
        fittedDistance = distance * 1.1;
        orbit.minDistance = fittedDistance * .65; orbit.maxDistance = fittedDistance * 1.8;
        orbit.target.copy(target);
        camera.position.copy(target).addScaledVector(direction, fittedDistance);
        camera.lookAt(target); orbit.update();
      }
      function resize() {
        if (!container.clientWidth || !container.clientHeight) return;
        renderer.setSize(container.clientWidth, container.clientHeight, false);
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        if (model) fit();
      }
      const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(container); resize();
      const intersection = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }); intersection.observe(container);
      const interacted = () => onInteract(); orbit.addEventListener("start", interacted);
      function keyboard(event: KeyboardEvent) {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(event.key)) return;
        event.preventDefault(); onInteract();
        if (event.key === "Home") fit(-Math.PI * .72);
        else if (event.key === "ArrowLeft" || event.key === "ArrowRight") fit(orbit.getAzimuthalAngle() + (event.key === "ArrowLeft" ? -.12 : .12));
        else camera.position.sub(target).multiplyScalar(event.key === "ArrowUp" ? .9 : 1.1).add(target);
      }
      canvas.addEventListener("keydown", keyboard);
      const lost = (event: Event) => { event.preventDefault(); if (!disposed) onError(); };
      canvas.addEventListener("webglcontextlost", lost);
      let previous = 0;
      let elapsed = 0;
      renderer.setAnimationLoop((now) => {
        if (disposed || !inView || document.hidden || now - previous < 32) return;
        const dt = Math.min((now - previous) / 1000, .05); previous = now;
        if (autoplay.current && model) {
          elapsed += dt;
          // A restrained 30-second sweep instead of a fast turntable.
          const a = -.72 * Math.PI + Math.sin(elapsed * Math.PI / 15) * .32;
          const direction = new THREE.Vector3(Math.sin(a), .3, Math.cos(a)).normalize();
          camera.position.copy(target).addScaledVector(direction, fittedDistance);
          key.position.x = -5 + Math.sin(elapsed * Math.PI / 15) * 3;
        }
        orbit.update(); renderer.render(scene, camera);
      });
      controls.current = {
        view: (a) => fit(a),
        zoom: (scale) => {
          const offset = camera.position.clone().sub(target);
          offset.setLength(THREE.MathUtils.clamp(offset.length() * scale, fittedDistance * .65, fittedDistance * 1.8));
          camera.position.copy(target).add(offset); orbit.update();
        },
        reset: () => { elapsed = 0; fit(-Math.PI * .72); },
      };
      cleanup = () => {
        resizeObserver.disconnect(); intersection.disconnect(); orbit.dispose(); renderer.setAnimationLoop(null);
        canvas.removeEventListener("keydown", keyboard); canvas.removeEventListener("webglcontextlost", lost);
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            for (const mat of Array.isArray(object.material) ? object.material : [object.material]) mat.dispose();
          }
        });
        floor.dispose(); environment.dispose(); pmrem.dispose(); renderer.dispose(); canvas.remove(); controls.current = null;
      };
      const decoder = new DRACOLoader().setDecoderPath("/vendor/draco/").setWorkerLimit(2);
      let gltf;
      try { gltf = await new GLTFLoader().setDRACOLoader(decoder).loadAsync("/models/ajet-ec145-studio.glb"); }
      finally { decoder.dispose(); }
      if (disposed) { gltf.scene.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); }); return; }
      model = gltf.scene;
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          if (material instanceof THREE.MeshPhysicalMaterial && material.name.includes("Laminated_Canopy")) {
            material.color.set(0x16313e);
            material.metalness = .08; material.roughness = .17; material.transmission = .15;
            material.ior = 1.5; material.thickness = .025;
          }
        }
      });
      bounds.setFromObject(model);
      const center = bounds.getCenter(new THREE.Vector3());
      model.position.set(-center.x, -bounds.min.y, -center.z);
      scene.add(model);
      bounds = new THREE.Box3().setFromObject(model);
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const positions = object.geometry.getAttribute("position");
        // Fit the actual silhouette, avoiding the oversized empty corners of a rotor-span box.
        for (let i = 0; i < positions.count; i += positions.count < 200 ? 1 : 4) {
          fitPoints.push(new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld));
        }
      });
      target.set(0, bounds.getSize(new THREE.Vector3()).y * .48, 0);
      key.target.position.copy(target); rim.target.position.copy(target);
      fit(); resize(); onReady();
    })().catch(() => { if (!disposed) { cleanup(); onError(); } });
    return () => { disposed = true; cleanup(); };
  }, [locale, controls, onReady, onError, onInteract]);

  return <div className="studio-canvas" ref={host} />;
}
