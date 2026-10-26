import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BattleReport, Country, Province } from '../types';
import { evaluateProvinceUnitState, ProvinceUnitState } from '../utils/unitState';
import { UnitSimulation } from '../simulation/UnitSimulation';
import { createVehicleMesh, createShipMesh, createAircraftMesh } from '../simulation/unitMeshFactory';

interface Globe3DProps {
  provinces: Record<string, Province>;
  countries: Record<string, Country>;
  selectedProvinceId: string | null;
  onSelectProvince: (provinceId: string) => void;
  playerCountryId: string;
  isPaused: boolean;
  recentBattles?: BattleReport[];
  currentTurn?: number;
}

interface PulsingMeshItem {
  mesh: THREE.Mesh;
  type: 'combat' | 'fuel' | 'general' | 'selected';
  baseScale: number;
  maxScale: number;
  speed: number;
  phase: number;
  baseOpacity: number;
}

export const Globe3D: React.FC<Globe3DProps> = ({
  provinces,
  countries,
  selectedProvinceId,
  onSelectProvince,
  playerCountryId,
  isPaused,
  recentBattles = [],
  currentTurn = 1
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const unitsGroupRef = useRef<THREE.Group | null>(null);
  const unitSimulationRef = useRef<UnitSimulation>(new UnitSimulation());
  const pulsingMeshesRef = useRef<PulsingMeshItem[]>([]);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetRotationRef = useRef<{ x: number; y: number }>({ x: 0.2, y: 0 });
  const zoomDistanceRef = useRef<number>(2.4);
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

    // Tactical 3D Units Simulation Group
    const unitsGroup = new THREE.Group();
    globeGroup.add(unitsGroup);
    unitsGroupRef.current = unitsGroup;

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

      // Dynamic unit-state indicator pulses (under fire, low fuel, general aura, selection)
      const elapsedTime = clock.getElapsedTime();
      const pulseItems = pulsingMeshesRef.current;
      for (let i = 0; i < pulseItems.length; i++) {
        const item = pulseItems[i];
        const sinVal = Math.sin(elapsedTime * item.speed + item.phase);
        const norm = (sinVal + 1) * 0.5; // 0 to 1
        const s = item.baseScale + norm * (item.maxScale - item.baseScale);
        item.mesh.scale.set(s, s, s);
        if (item.mesh.material && 'opacity' in item.mesh.material) {
          (item.mesh.material as THREE.Material & { opacity: number }).opacity =
            item.baseOpacity * (0.3 + 0.7 * (1 - norm));
        }
      }

      // Update 3D military unit simulation (movement, heading, ship bobbing)
      const sim = unitSimulationRef.current;
      sim.update(dt);

      // Loop completed routes so units patrol continuously
      for (const unit of sim.units.values()) {
        if (unit.reachedDestination && unit.route && unit.route.length > 1) {
          unit.route = [...unit.route].reverse();
          unit.routeIndex = 0;
          unit.reachedDestination = false;
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
      if (unitsGroupRef.current) {
        unitsGroupRef.current.traverse(child => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            if (m.geometry) m.geometry.dispose();
            if (Array.isArray(m.material)) {
              m.material.forEach(mat => mat.dispose());
            } else if (m.material) {
              m.material.dispose();
            }
          }
        });
      }
      renderer.dispose();
      sphereGeo.dispose();
      sphereMat.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      globeTexture.dispose();
    };
  }, []);

  // Update Province Markers, Dynamic Unit States, and Border connections
  useEffect(() => {
    if (!markersGroupRef.current) return;
    const group = markersGroupRef.current;

    // Clear previous children and dispose WebGL resources
    group.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach(mat => mat.dispose());
        } else if (m.material) {
          m.material.dispose();
        }
      }
    });

    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    pulsingMeshesRef.current = [];

    const radius = 1.015;

    // 1. Draw Province 3D Nodes with Tactical Unit-State Indicators
    Object.values(provinces).forEach(prov => {
      const country = countries[prov.countryId];
      const colorHex = country ? parseInt(country.color.replace('#', '0x'), 16) : 0x94a3b8;
      const isSelected = prov.id === selectedProvinceId;

      // Evaluate tactical unit state (under fire, low fuel, general, entrenched)
      const unitState = evaluateProvinceUnitState(
        prov,
        countries,
        provinces,
        recentBattles,
        currentTurn
      );

      const pos = latLngToVector3(prov.lat, prov.lng, radius);

      // Node marker group
      const markerGroup = new THREE.Group();
      markerGroup.position.copy(pos);
      markerGroup.lookAt(new THREE.Vector3(0, 0, 0));

      // Determine pin tint and emissive glow based on unit state
      let pinColor = isSelected ? 0x38bdf8 : colorHex;
      let emissiveColor = isSelected ? 0x38bdf8 : colorHex;
      let emissiveIntensity = isSelected ? 1.0 : 0.45;

      if (unitState.underFire) {
        pinColor = 0xef4444;
        emissiveColor = 0xef4444;
        emissiveIntensity = 1.2;
      } else if (unitState.lowFuel) {
        pinColor = 0xf59e0b;
        emissiveColor = 0xf59e0b;
        emissiveIntensity = 0.85;
      }

      const pinGeo = new THREE.CylinderGeometry(
        isSelected ? 0.024 : (unitState.underFire ? 0.018 : 0.014),
        isSelected ? 0.015 : 0.008,
        isSelected ? 0.065 : (unitState.underFire ? 0.045 : 0.035),
        12
      );
      const pinMat = new THREE.MeshStandardMaterial({
        color: pinColor,
        emissive: emissiveColor,
        emissiveIntensity: emissiveIntensity,
        roughness: 0.3,
        metalness: 0.8
      });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.rotation.x = Math.PI / 2;
      pinMesh.userData = { provinceId: prov.id };
      markerGroup.add(pinMesh);

      // --- Unit-State Dynamic Pulse Rings & Indicators ---

      // A) Under Fire: Pulsing Red Combat Shockwave & Spire
      if (unitState.underFire) {
        const fireRingGeo = new THREE.RingGeometry(0.022, 0.042, 24);
        const fireRingMat = new THREE.MeshBasicMaterial({
          color: 0xef4444,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85
        });
        const fireRingMesh = new THREE.Mesh(fireRingGeo, fireRingMat);
        fireRingMesh.position.z = -0.008;
        markerGroup.add(fireRingMesh);

        pulsingMeshesRef.current.push({
          mesh: fireRingMesh,
          type: 'combat',
          baseScale: 1.0,
          maxScale: 2.2,
          speed: 4.5,
          phase: Math.random() * Math.PI,
          baseOpacity: 0.85
        });

        // Vertical warning spire
        const spireGeo = new THREE.ConeGeometry(0.008, 0.035, 6);
        const spireMat = new THREE.MeshBasicMaterial({
          color: 0xff2222,
          transparent: true,
          opacity: 0.9
        });
        const spireMesh = new THREE.Mesh(spireGeo, spireMat);
        spireMesh.rotation.x = Math.PI / 2;
        spireMesh.position.z = 0.035;
        markerGroup.add(spireMesh);
      }

      // B) Low Fuel: Pulsing Amber Resource Warning Ring
      if (unitState.lowFuel) {
        const fuelRingGeo = new THREE.RingGeometry(0.018, 0.032, 20);
        const fuelRingMat = new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.75
        });
        const fuelRingMesh = new THREE.Mesh(fuelRingGeo, fuelRingMat);
        fuelRingMesh.position.z = -0.006;
        markerGroup.add(fuelRingMesh);

        pulsingMeshesRef.current.push({
          mesh: fuelRingMesh,
          type: 'fuel',
          baseScale: 1.0,
          maxScale: 1.8,
          speed: 2.8,
          phase: Math.random() * Math.PI,
          baseOpacity: 0.75
        });
      }

      // C) Commanded by General: Golden Command Halo
      if (unitState.hasGeneral) {
        const genRingGeo = new THREE.RingGeometry(0.028, 0.042, 24);
        const genRingMat = new THREE.MeshBasicMaterial({
          color: 0xfacc15,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85
        });
        const genRingMesh = new THREE.Mesh(genRingGeo, genRingMat);
        genRingMesh.position.z = -0.012;
        markerGroup.add(genRingMesh);

        pulsingMeshesRef.current.push({
          mesh: genRingMesh,
          type: 'general',
          baseScale: 0.95,
          maxScale: 1.35,
          speed: 2.2,
          phase: 0,
          baseOpacity: 0.85
        });
      }

      // D) Entrenched: Cyan Fortification Hexagon
      if (unitState.entrenched) {
        const entrenchGeo = new THREE.RingGeometry(0.016, 0.026, 6);
        const entrenchMat = new THREE.MeshBasicMaterial({
          color: 0x06b6d4,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7
        });
        const entrenchMesh = new THREE.Mesh(entrenchGeo, entrenchMat);
        entrenchMesh.position.z = -0.004;
        markerGroup.add(entrenchMesh);
      }

      // E) Selection Ring or Capital Highlight
      if (isSelected) {
        const selRingGeo = new THREE.RingGeometry(0.032, 0.05, 24);
        const selRingMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9
        });
        const selRingMesh = new THREE.Mesh(selRingGeo, selRingMat);
        selRingMesh.position.z = -0.014;
        markerGroup.add(selRingMesh);

        pulsingMeshesRef.current.push({
          mesh: selRingMesh,
          type: 'selected',
          baseScale: 1.0,
          maxScale: 1.5,
          speed: 3.5,
          phase: 0,
          baseOpacity: 0.9
        });
      } else if (prov.hasCapital) {
        const capRingGeo = new THREE.RingGeometry(0.026, 0.038, 16);
        const capRingMat = new THREE.MeshBasicMaterial({
          color: 0xfacc15,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7
        });
        const capRingMesh = new THREE.Mesh(capRingGeo, capRingMat);
        capRingMesh.position.z = -0.005;
        markerGroup.add(capRingMesh);
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

    // 3. Populate Active 3D Military Units into UnitSimulation
    const unitsGroup = unitsGroupRef.current;
    if (unitsGroup) {
      unitsGroup.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach(mat => mat.dispose());
          } else if (m.material) {
            m.material.dispose();
          }
        }
      });
      while (unitsGroup.children.length > 0) {
        unitsGroup.remove(unitsGroup.children[0]);
      }
    }
    const sim = unitSimulationRef.current;
    sim.units.clear();

    Object.values(provinces).forEach(prov => {
      const country = countries[prov.countryId];
      const colorHex = country ? parseInt(country.color.replace('#', '0x'), 16) : 0x38bdf8;

      // 3A. Armored & Mechanized Ground Units
      const hasArmor = prov.units && prov.units.some(u => 
        ['armored_units', 'mechanized_infantry', 'artillery'].includes(u.type) && u.count > 0
      );
      const hasInfantry = prov.units && prov.units.some(u => 
        ['infantry', 'special_forces'].includes(u.type) && u.count > 20
      );

      if ((hasArmor || hasInfantry) && prov.neighborIds.length > 0 && unitsGroup) {
        const targetProv = provinces[prov.neighborIds[0]];
        if (targetProv) {
          const v1 = latLngToVector3(prov.lat, prov.lng, radius + 0.006);
          const v2 = latLngToVector3(targetProv.lat, targetProv.lng, radius + 0.006);
          const mid = v1.clone().add(v2).multiplyScalar(0.5).normalize().multiplyScalar(radius + 0.014);

          const vehMesh = createVehicleMesh(colorHex);
          unitsGroup.add(vehMesh);
          sim.addUnit({
            id: `veh-${prov.id}`,
            type: 'vehicle',
            mesh: vehMesh,
            x: v1.x,
            y: v1.y,
            z: v1.z,
            route: [
              { x: v1.x, y: v1.y, z: v1.z },
              { x: mid.x, y: mid.y, z: mid.z },
              { x: v2.x, y: v2.y, z: v2.z }
            ],
            speed: 0.09,
            turnRate: 3.2
          });
        }
      }

      // 3B. Naval Patrol Units (Ships with realistic hydrodynamic bobbing)
      const hasNavalUnits = prov.units && prov.units.some(u => 
        ['patrol_ships', 'frigates', 'destroyers', 'submarines', 'aircraft_carriers'].includes(u.type) && u.count > 0
      );
      if ((prov.hasPort || prov.terrain === 'Coastal' || hasNavalUnits) && unitsGroup) {
        const oceanRadius = radius + 0.004;
        const s1 = latLngToVector3(prov.lat + 1.2, prov.lng + 1.8, oceanRadius);
        const s2 = latLngToVector3(prov.lat - 1.2, prov.lng + 2.5, oceanRadius);
        const sMid = s1.clone().add(s2).multiplyScalar(0.5).normalize().multiplyScalar(oceanRadius + 0.008);

        const shipMesh = createShipMesh(colorHex);
        unitsGroup.add(shipMesh);
        sim.addUnit({
          id: `ship-${prov.id}`,
          type: 'ship',
          mesh: shipMesh,
          x: s1.x,
          y: s1.y,
          z: s1.z,
          route: [
            { x: s1.x, y: s1.y, z: s1.z },
            { x: sMid.x, y: sMid.y, z: sMid.z },
            { x: s2.x, y: s2.y, z: s2.z }
          ],
          speed: 0.05,
          turnRate: 1.8
        });
      }

      // 3C. Air Superiority Fighter Squadrons
      const hasAircraft = (prov.hasAirbase || prov.hasCapital) || (
        prov.units && prov.units.some(u => 
          ['fighters', 'bombers', 'transport_aircraft', 'recon_aircraft', 'drones'].includes(u.type) && u.count > 0
        )
      );
      if (hasAircraft && unitsGroup) {
        const airRadius = radius + 0.038;
        const a1 = latLngToVector3(prov.lat + 2.5, prov.lng, airRadius);
        const a2 = latLngToVector3(prov.lat - 2.5, prov.lng + 3.0, airRadius);
        const a3 = latLngToVector3(prov.lat, prov.lng - 3.0, airRadius);

        const airMesh = createAircraftMesh(colorHex);
        unitsGroup.add(airMesh);
        sim.addUnit({
          id: `air-${prov.id}`,
          type: 'aircraft',
          mesh: airMesh,
          x: a1.x,
          y: a1.y,
          z: a1.z,
          route: [
            { x: a1.x, y: a1.y, z: a1.z },
            { x: a2.x, y: a2.y, z: a2.z },
            { x: a3.x, y: a3.y, z: a3.z }
          ],
          speed: 0.18,
          turnRate: 4.5
        });
      }
    });
  }, [provinces, countries, selectedProvinceId, recentBattles, currentTurn]);

  // Synchronize Simulation Pause/Resume with Game Clock
  useEffect(() => {
    if (isPaused) {
      unitSimulationRef.current.pause();
    } else {
      unitSimulationRef.current.resume();
    }
  }, [isPaused]);

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

      {/* Situational Awareness Visual Telemetry Legend */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none bg-slate-950/85 p-2.5 rounded border border-slate-800/80 text-[10px] font-mono backdrop-blur-md flex flex-col gap-1.5 shadow-xl text-slate-300">
        <div className="text-cyan-400 font-bold uppercase tracking-wider text-[9px] border-b border-slate-800 pb-0.5">
          Situational Unit Telemetry
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
          <span className="text-red-400 font-bold">[FIRE]</span> Under Fire / Frontline Clashes
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block" />
          <span className="text-amber-400 font-bold">[FUEL]</span> Low Fuel Reserves (&lt;100 bbl)
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
          <span className="text-yellow-400 font-bold">[GEN]</span> Commanded by 5-Star General
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm bg-cyan-500 inline-block" />
          <span className="text-cyan-400 font-bold">[FORT]</span> Entrenched Fortification
        </div>
      </div>
    </div>
  );
};
