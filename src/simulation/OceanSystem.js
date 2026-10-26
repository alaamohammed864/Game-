import * as THREE_MODULE from "three";

export class OceanSystem {
  constructor(scene, options = {}) {
    this.scene = scene;

    this.size = options.size ?? 1000;
    this.segments = options.segments ?? 128;
    this.time = 0;

    this.waveHeight = options.waveHeight ?? 0.35;
    this.waveLength = options.waveLength ?? 18;
    this.waveSpeed = options.waveSpeed ?? 0.8;

    this.mesh = null;
    this.geometry = null;
    this.basePositions = null;
    this.options = options;

    this.create();
  }

  create() {
    const THREE = (typeof globalThis !== "undefined" && globalThis.THREE) || this.options?.THREE || THREE_MODULE;

    if (!THREE) {
      console.warn("Three.js is required for OceanSystem.");
      return;
    }

    this.geometry = new THREE.PlaneGeometry(
      this.size,
      this.size,
      this.segments,
      this.segments
    );

    this.geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      roughness: 0.25,
      metalness: 0.05,
      transparent: true,
      opacity: 0.92
    });

    this.mesh = new THREE.Mesh(
      this.geometry,
      material
    );

    this.mesh.receiveShadow = true;

    const position =
      this.geometry.attributes.position;

    this.basePositions =
      new Float32Array(position.array);

    if (this.scene?.add) {
      this.scene.add(this.mesh);
    }
  }

  getWaveHeight(x, z, time = this.time) {
    const wave1 =
      Math.sin(
        x / this.waveLength +
        time * this.waveSpeed
      );

    const wave2 =
      Math.cos(
        z / (this.waveLength * 0.75) +
        time * this.waveSpeed * 0.8
      );

    const wave3 =
      Math.sin(
        (x + z) /
        (this.waveLength * 1.4) +
        time * this.waveSpeed * 1.25
      );

    return (
      wave1 * this.waveHeight * 0.55 +
      wave2 * this.waveHeight * 0.30 +
      wave3 * this.waveHeight * 0.15
    );
  }

  update(delta) {
    if (!this.geometry) return;

    this.time += Math.min(delta, 0.05);

    const position =
      this.geometry.attributes.position;

    for (
      let i = 0;
      i < position.count;
      i++
    ) {
      const x = this.basePositions[i * 3];
      const z = this.basePositions[i * 3 + 2];

      position.array[i * 3 + 1] =
        this.getWaveHeight(x, z);
    }

    position.needsUpdate = true;

    this.geometry.computeVertexNormals();
  }

  getSurfaceY(x, z) {
    return this.getWaveHeight(x, z);
  }

  applyToShip(ship, x, z) {
    if (!ship) return;

    const y = this.getSurfaceY(x, z);

    if (ship.position) {
      ship.position.y = y;
    }
  }

  dispose() {
    if (!this.mesh) return;

    this.geometry?.dispose();
    if (this.mesh.material) {
      if (Array.isArray(this.mesh.material)) {
        this.mesh.material.forEach(m => m.dispose());
      } else {
        this.mesh.material.dispose();
      }
    }

    if (this.scene?.remove) {
      this.scene.remove(this.mesh);
    }

    this.mesh = null;
  }
}
