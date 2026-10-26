import * as THREE from 'three';

/**
 * Creates procedural 3-6 part military unit meshes (Vehicle, Ship, Aircraft)
 * adhering to the Three.js 3D domain directives with composite THREE.Groups.
 */

// Shared reusable materials & geometries cache for high performance
export function createVehicleMesh(colorHex: number = 0x38bdf8): THREE.Group {
  const group = new THREE.Group();

  // 1. Primary Hull / Armored Chassis
  const hullGeo = new THREE.BoxGeometry(0.035, 0.016, 0.055);
  const hullMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    metalness: 0.6,
    roughness: 0.35
  });
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.position.y = 0.008;
  group.add(hull);

  // 2. Turret
  const turretGeo = new THREE.CylinderGeometry(0.012, 0.014, 0.01, 8);
  const turretMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.7,
    roughness: 0.3
  });
  const turret = new THREE.Mesh(turretGeo, turretMat);
  turret.position.set(0, 0.019, -0.004);
  group.add(turret);

  // 3. Cannon Barrel
  const barrelGeo = new THREE.CylinderGeometry(0.002, 0.0025, 0.03, 6);
  barrelGeo.rotateX(Math.PI / 2);
  const barrelMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.85,
    roughness: 0.2
  });
  const barrel = new THREE.Mesh(barrelGeo, barrelMat);
  barrel.position.set(0, 0.019, 0.02);
  group.add(barrel);

  // 4. Dual Tracks / Treads
  const trackGeo = new THREE.BoxGeometry(0.006, 0.012, 0.058);
  const trackMat = new THREE.MeshStandardMaterial({
    color: 0x090d16,
    roughness: 0.8
  });
  const trackL = new THREE.Mesh(trackGeo, trackMat);
  trackL.position.set(-0.019, 0.006, 0);
  const trackR = new THREE.Mesh(trackGeo, trackMat);
  trackR.position.set(0.019, 0.006, 0);
  group.add(trackL);
  group.add(trackR);

  return group;
}

export function createShipMesh(colorHex: number = 0x06b6d4): THREE.Group {
  const group = new THREE.Group();

  // 1. Vessel Hull (Sleek naval hull with wedge bow)
  const hullShape = new THREE.Shape();
  hullShape.moveTo(0, 0.04);
  hullShape.lineTo(0.014, 0.02);
  hullShape.lineTo(0.014, -0.035);
  hullShape.lineTo(-0.014, -0.035);
  hullShape.lineTo(-0.014, 0.02);
  hullShape.closePath();

  const extrudeSettings = { depth: 0.015, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.002, bevelThickness: 0.002 };
  const hullGeo = new THREE.ExtrudeGeometry(hullShape, extrudeSettings);
  hullGeo.rotateX(-Math.PI / 2);

  const hullMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    metalness: 0.5,
    roughness: 0.35
  });
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.position.y = 0.005;
  group.add(hull);

  // 2. Superstructure / Command Bridge
  const bridgeGeo = new THREE.BoxGeometry(0.016, 0.014, 0.024);
  const bridgeMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.65,
    roughness: 0.3
  });
  const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
  bridge.position.set(0, 0.016, -0.006);
  group.add(bridge);

  // 3. Radar Mast
  const mastGeo = new THREE.CylinderGeometry(0.0015, 0.002, 0.015, 6);
  const mastMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.9,
    roughness: 0.15
  });
  const mast = new THREE.Mesh(mastGeo, mastMat);
  mast.position.set(0, 0.028, -0.006);
  group.add(mast);

  return group;
}

export function createAircraftMesh(colorHex: number = 0xef4444): THREE.Group {
  const group = new THREE.Group();

  // 1. Fuselage
  const fuselageGeo = new THREE.ConeGeometry(0.008, 0.06, 8);
  fuselageGeo.rotateX(Math.PI / 2);
  const fuselageMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    metalness: 0.7,
    roughness: 0.25
  });
  const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
  fuselage.position.y = 0.025;
  group.add(fuselage);

  // 2. Swept Delta Wings
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0.015);
  wingShape.lineTo(0.035, -0.015);
  wingShape.lineTo(-0.035, -0.015);
  wingShape.closePath();

  const wingGeo = new THREE.ShapeGeometry(wingShape);
  wingGeo.rotateX(-Math.PI / 2);
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.6,
    roughness: 0.3,
    side: THREE.DoubleSide
  });
  const wings = new THREE.Mesh(wingGeo, wingMat);
  wings.position.set(0, 0.024, -0.002);
  group.add(wings);

  // 3. Vertical Twin Stabilizers
  const tailGeo = new THREE.BoxGeometry(0.002, 0.012, 0.014);
  const tailMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    metalness: 0.65,
    roughness: 0.3
  });
  const tail = new THREE.Mesh(tailGeo, tailMat);
  tail.position.set(0, 0.031, -0.02);
  group.add(tail);

  return group;
}
