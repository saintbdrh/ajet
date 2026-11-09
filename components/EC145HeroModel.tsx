"use client";

import { useEffect, useRef } from "react";

type EC145HeroModelProps = {
  progress: number;
  reducedMotion: boolean;
  lowEnd: boolean;
  onReady: () => void;
  onError: (message: string) => void;
};

export default function EC145HeroModel({
  progress,
  reducedMotion,
  lowEnd,
  onReady,
  onError,
}: EC145HeroModelProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(progress);
  const reducedMotionRef = useRef(reducedMotion);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  progressRef.current = progress;
  reducedMotionRef.current = reducedMotion;
  onReadyRef.current = onReady;
  onErrorRef.current = onError;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let cleanup = () => {};
    void (async () => {
      const idleWindow = window as Window & {
        requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      };
      await new Promise<void>((resolve) => {
        if (idleWindow.requestIdleCallback) idleWindow.requestIdleCallback(resolve, { timeout: 1600 });
        else window.setTimeout(resolve, 250);
      });
      if (disposed) return;

      const [THREE, { GLTFLoader }, { DRACOLoader }] = await Promise.all([
        import("three"),
        import("three/addons/loaders/GLTFLoader.js"),
        import("three/addons/loaders/DRACOLoader.js"),
      ]);
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !lowEnd,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1 : 1.5));
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 500);
      const aircraftMotion = new THREE.Group();
      scene.add(aircraftMotion);

      scene.add(new THREE.HemisphereLight(0xffe6c6, 0x18202d, 2.2));
      const keyLight = new THREE.DirectionalLight(0xffe1b5, 3.2);
      keyLight.position.set(-7, 9, 6);
      scene.add(keyLight);
      const rimLight = new THREE.DirectionalLight(0xe4efff, 2);
      rimLight.position.set(6, 5, -8);
      scene.add(rimLight);

      let mainRotor: InstanceType<typeof THREE.Object3D> | null = null;
      let tailRotor: InstanceType<typeof THREE.Object3D> | null = null;
      let fittedDistance = 20;
      let inView = false;
      let previousFrame = 0;
      let elapsed = 0;

      const resize = () => {
        const width = host.clientWidth;
        const height = host.clientHeight;
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      };

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
      const intersectionObserver = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        if (inView) renderer.render(scene, camera);
      });
      intersectionObserver.observe(host);
      const contextLost = (event: Event) => {
        event.preventDefault();
        if (!disposed) onErrorRef.current("The helicopter preview lost its graphics context.");
      };
      renderer.domElement.addEventListener("webglcontextlost", contextLost);

      cleanup = () => {
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        renderer.setAnimationLoop(null);
        renderer.domElement.removeEventListener("webglcontextlost", contextLost);
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
              material.dispose();
            }
          }
        });
        renderer.dispose();
        renderer.domElement.remove();
      };

      const decoder = new DRACOLoader().setDecoderPath("/vendor/draco/").setWorkerLimit(2);
      let gltf;
      try {
        gltf = await new GLTFLoader().setDRACOLoader(decoder).loadAsync("/models/ajet-ec145-hero.glb");
      } finally {
        decoder.dispose();
      }

      if (disposed) {
        gltf.scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
              material.dispose();
            }
          }
        });
        return;
      }

      const aircraft = gltf.scene;
      aircraft.rotation.y = Math.PI;
      aircraft.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(aircraft);
      const center = bounds.getCenter(new THREE.Vector3());
      aircraft.position.sub(center);
      aircraftMotion.add(aircraft);

      camera.aspect = host.clientWidth / Math.max(1, host.clientHeight);
      camera.updateProjectionMatrix();
      const direction = new THREE.Vector3(-0.65, 0.19, 0.74).normalize();
      camera.position.copy(direction).multiplyScalar(10);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld(true);
      const cameraRight = new THREE.Vector3().crossVectors(camera.getWorldDirection(new THREE.Vector3()), camera.up).normalize();
      const cameraUp = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();
      const tangentY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const tangentX = tangentY * camera.aspect;
      fittedDistance = 1;
      aircraft.updateMatrixWorld(true);
      const localBounds = new THREE.Box3();
      const point = new THREE.Vector3();
      aircraft.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
        const meshBounds = object.geometry.boundingBox;
        if (!meshBounds) return;
        for (const x of [meshBounds.min.x, meshBounds.max.x]) {
          for (const y of [meshBounds.min.y, meshBounds.max.y]) {
            for (const z of [meshBounds.min.z, meshBounds.max.z]) {
              point.set(x, y, z).applyMatrix4(object.matrixWorld);
              fittedDistance = Math.max(
                fittedDistance,
                point.dot(direction) + Math.abs(point.dot(cameraRight)) / tangentX,
                point.dot(direction) + Math.abs(point.dot(cameraUp)) / tangentY,
              );
            }
          }
        }
      });
      fittedDistance *= 1.22;
      camera.position.copy(direction).multiplyScalar(fittedDistance);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld(true);
      mainRotor = aircraft.getObjectByName("MainRotor_Pivot") ?? null;
      tailRotor = aircraft.getObjectByName("TailRotor_Pivot") ?? null;
      if (!mainRotor || !tailRotor) {
        throw new Error("The EC145 hero model is missing its rotor pivots.");
      }

      resize();
      onReadyRef.current();
      renderer.setAnimationLoop((now) => {
        if (disposed || !inView || document.hidden) return;
        if (reducedMotionRef.current) {
          if (previousFrame !== -1) {
            aircraftMotion.position.set(0, 0, 0);
            aircraftMotion.rotation.set(0, 0, 0);
            aircraftMotion.scale.setScalar(1);
            mainRotor.rotation.set(0, 0, 0);
            tailRotor.rotation.set(0, 0, 0);
            renderer.render(scene, camera);
          }
          previousFrame = -1;
          return;
        }
        if (previousFrame === -1) previousFrame = now;
        const frameInterval = lowEnd ? 50 : 16;
        if (now - previousFrame < frameInterval) return;
        const delta = Math.min((now - previousFrame) / 1000, 0.05);
        previousFrame = now;
        elapsed += delta;

        const flightProgress = Math.min(1, Math.max(0, progressRef.current));
        aircraftMotion.position.copy(cameraRight).multiplyScalar((1 - flightProgress) * fittedDistance * 0.07);
        aircraftMotion.position.y += (1 - flightProgress) * -0.3;
        aircraftMotion.rotation.set(
          (1 - flightProgress) * -0.035,
          (1 - flightProgress) * 0.07,
          (1 - flightProgress) * 0.055,
        );
        aircraftMotion.scale.setScalar(1.08 + flightProgress * 0.04);
        mainRotor.rotation.y = elapsed * 41;
        tailRotor.rotation.x = elapsed * -220;
        renderer.render(scene, camera);
      });
    })().catch((cause: unknown) => {
      if (!disposed) {
        cleanup();
        onErrorRef.current(cause instanceof Error ? cause.message : "The EC145 model could not be loaded.");
      }
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [lowEnd]);

  return <div className="flight-scene__webgl" ref={hostRef} aria-hidden="true" />;
}
