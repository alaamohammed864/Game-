import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Country, Province } from '../types';

interface Globe3DProps {
  provinces: Record<string, Province>;
  countries: Record<string, Country>;
  selectedProvinceId: string | null;
  onSelectProvince: (provinceId: string) => void;
  playerCountryId: string;
  isPaused: boolean;
}

export const Globe3D: React.FC<Globe3DProps> = ({
  provinces,
  countries,
  selectedProvinceId,
  onSelectProvince,
  playerCountryId,
  isPaused
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetRotationRef = useRef<{ x: number; y: number }>({ x: 0.2, y: 0 });
  const zoomDistanceRef = useRef<number>(2.4);

  // Helper to convert lat/lng to 3D sphere coordinates
  const latLngToVector3 = (lat: number, lng: number, radius: number): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // Initialize Three.js Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, zoomDistanceRef.current);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Studio Environment map via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 2.5);
    dirLight1.position.set(5, 4, 3);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x818cf8, 1.0);
    dirLight2.position.set(-5, -2, -3);
    scene.add(dirLight2);

    // Master Globe Group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // Procedural Military Hologram Earth Texture
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Deep ocean base
    ctx.fillStyle = '#030816';
    ctx.fillRect(0, 0, 2048, 1024);

    // Tactical latitude/longitude lines
    ctx.strokeStyle = 'rgba(30, 58, 138, 0.35)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 2048; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    for (let y = 0; y <= 1024; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(2048, y);
      ctx.stroke();
    }

    // Equator highlight
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 512);
    ctx.lineTo(2048, 512);
    ctx.stroke();

    // Draw stylized continental landmass silhouettes
    ctx.fillStyle = '#0a1936';
    // North America / Valyria cluster
    ctx.beginPath();
    ctx.ellipse(450, 320, 220, 150, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // Eurasia / Aethelgard / Kalyan
    ctx.beginPath();
    ctx.ellipse(1250, 280, 420, 180, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Africa / Solaria / Zul-Qarnain
    ctx.beginPath();
    ctx.ellipse(1050, 580, 220, 250, 0.15, 0, Math.PI * 2);
    ctx.fill();
    // Oceania / Archipelagos
    ctx.beginPath();
    ctx.ellipse(1680, 720, 160, 130, -0.1, 0, Math.PI * 2);
    ctx.fill();
    // South America
    ctx.beginPath();
    ctx.ellipse(620, 680, 170, 230, 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Landmass contour glow
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();

    const globeTexture = new THREE.CanvasTexture(canvas);
    globeTexture.colorSpace = THREE.SRGBColorSpace;

    // Base Sphere
    const sphereGeo = new THREE.SphereGeometry(1.0, 48, 48);
    const sphereMat = new THREE.MeshStandardMaterial({
      map: globeTexture,
      roughness: 0.6,
      metalness: 0.2,
      emissive: new THREE.Color(0x020617),
      emissiveIntensity: 0.8
    });
    const globeMesh = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(globeMesh);

    // Atmospheric Glow Outer Sphere
    const atmoGeo = new THREE.SphereGeometry(1.035, 32, 32);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.14,
      side: THREE.BackSide
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    globeGroup.add(atmoMesh);

    // Group for province markers and links
    const markersGroup = new THREE.Group();
    globeGroup.add(markersGroup);
    markersGroupRef.current = markersGroup;

    // Mouse drag handlers
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const deltaX = e.clientX - previousMousePositionRef.current.x;
        const deltaY = e.clientY - previousMousePositionRef.current.y;

        targetRotationRef.current.y += deltaX * 0.005;
        targetRotationRef.current.x += deltaY * 0.005;
        targetRotationRef.current.x = Math.max(-1.4, Math.min(1.4, targetRotationRef.current.x));

        previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomDistanceRef.current = Math.max(1.4, Math.min(4.0, zoomDistanceRef.current + e.deltaY * 0.0015));
      if (cameraRef.current) {
        cameraRef.current.position.z = zoomDistanceRef.current;
      }
    };

    // Click handler for raycasting selection
    const onClick = (e: MouseEvent) => {
      if (!container || !cameraRef.current || !markersGroupRef.current) return;
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(markersGroupRef.current.children, true);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hit.userData && hit.userData.provinceId) {
          onSelectProvince(hit.userData.provinceId);
        }
      }
    };

    // Touch support for mobile devices
    let touchStartX = 0;
    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - touchStartX;
        const deltaY = e.touches[0].clientY - touchStartY;
        targetRotationRef.current.y += deltaX * 0.006;
        targetRotationRef.current.x += deltaY * 0.006;
        targetRotationRef.current.x = Math.max(-1.4, Math.min(1.4, targetRotationRef.current.x));
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domElement.addEventListener('wheel', onWheel, { passive: false });
    domElement.addEventListener('click', onClick);
    domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    domElement.addEventListener('touchmove', onTouchMove, { passive: true });

    // Animation Loop
    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const dt = clock.getDelta();

      if (globeGroupRef.current) {
        // Smooth rotation damping
        globeGroupRef.current.rotation.y = THREE.MathUtils.damp(
          globeGroupRef.current.rotation.y,
          targetRotationRef.current.y,
          6,
          dt
        );
        globeGroupRef.current.rotation.x = THREE.MathUtils.damp(
          globeGroupRef.current.rotation.x,
          targetRotationRef.current.x,
          6,
          dt
        );

        // Auto slow rotation if not dragging and running
        if (!isDraggingRef.current && !isPaused) {
          targetRotationRef.current.y += 0.0008;
        }
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domElement.removeEventListener('mousedown', onMouseDown);
      domElement.removeEventListener('wheel', onWheel);
      domElement.removeEventListener('click', onClick);
      domElement.removeEventListener('touchstart', onTouchStart);
      domElement.removeEventListener('touchmove', onTouchMove);

      if (container && domElement.parentNode === container) {
        container.removeChild(domElement);
      }
      renderer.dispose();
      sphereGeo.dispose();
      sphereMat.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      globeTexture.dispose();
    };
  }, []);

  // Update Province Markers and Border connections
  useEffect(() => {
    if (!markersGroupRef.current) return;
    const group = markersGroupRef.current;

    // Clear previous children
    while (group.children.length > 0) {
      const child = group.children[0] as THREE.Mesh;
      group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose());
      } else if (child.material) {
        child.material.dispose();
      }
    }

    const radius = 1.015;

    // 1. Draw Province 3D Nodes
    Object.values(provinces).forEach(prov => {
      const country = countries[prov.countryId];
      const colorHex = country ? parseInt(country.color.replace('#', '0x'), 16) : 0x94a3b8;
      const isSelected = prov.id === selectedProvinceId;

      const pos = latLngToVector3(prov.lat, prov.lng, radius);

      // Node mesh: cylinder + sphere cap (composite procedural model)
      const markerGroup = new THREE.Group();
      markerGroup.position.copy(pos);
      markerGroup.lookAt(new THREE.Vector3(0, 0, 0));

      const pinGeo = new THREE.CylinderGeometry(
        isSelected ? 0.024 : 0.014,
        isSelected ? 0.015 : 0.008,
        isSelected ? 0.06 : 0.035,
        12
      );
      const pinMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0x38bdf8 : colorHex,
        emissive: isSelected ? 0x38bdf8 : colorHex,
        emissiveIntensity: isSelected ? 0.9 : 0.4,
        roughness: 0.3,
        metalness: 0.8
      });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.rotation.x = Math.PI / 2;
      pinMesh.userData = { provinceId: prov.id };
      markerGroup.add(pinMesh);

      // Capital / Port / Airbase Rings
      if (prov.hasCapital || isSelected) {
        const ringGeo = new THREE.RingGeometry(0.03, 0.045, 16);
        const ringMat = new THREE.MeshBasicMaterial({
          color: isSelected ? 0x38bdf8 : 0xfacc15,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.z = -0.01;
        markerGroup.add(ringMesh);
      }

      markerGroup.userData = { provinceId: prov.id };
      group.add(markerGroup);
    });

    // 2. Draw 3D Arc Connections to Neighbors
    const renderedPairs = new Set<string>();
    Object.values(provinces).forEach(p1 => {
      p1.neighborIds.forEach(nId => {
        const p2 = provinces[nId];
        if (!p2) return;
        const pairKey = [p1.id, p2.id].sort().join('--');
        if (renderedPairs.has(pairKey)) return;
        renderedPairs.add(pairKey);

        const v1 = latLngToVector3(p1.lat, p1.lng, radius);
        const v2 = latLngToVector3(p2.lat, p2.lng, radius);

        // Compute curved midpoint
        const mid = v1.clone().add(v2).multiplyScalar(0.5);
        const distance = v1.distanceTo(v2);
        mid.normalize().multiplyScalar(radius + Math.min(0.12, distance * 0.25));

        const curve = new THREE.QuadraticBezierCurve3(v1, mid, v2);
        const points = curve.getPoints(16);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);

        const isSameCountry = p1.countryId === p2.countryId;
        const lineMat = new THREE.LineBasicMaterial({
          color: isSameCountry ? 0x1e3a8a : 0xef4444,
          transparent: true,
          opacity: isSameCountry ? 0.35 : 0.65,
          linewidth: 1
        });

        const line = new THREE.Line(lineGeo, lineMat);
        group.add(line);
      });
    });
  }, [provinces, countries, selectedProvinceId]);

  return (
    <div className="relative w-full h-full select-none cursor-grab active:cursor-grabbing">
      <div ref={mountRef} className="w-full h-full" />
      {/* Tactical Compass & Coordinates Readout */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none flex flex-col gap-1 text-[11px] font-mono text-cyan-400/80 bg-slate-950/70 p-2.5 rounded border border-cyan-900/40 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
          <span className="font-bold text-white tracking-wider">TACTICAL ORBITAL GLOBE</span>
        </div>
        <div className="text-slate-400">PROJECTION: SPHERICAL 3D GEO-DATUM</div>
        <div className="text-slate-400">CONTROL: DRAG TO ROTATE · SCROLL ZOOM</div>
      </div>
    </div>
  );
};
