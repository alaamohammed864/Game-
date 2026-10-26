import * as THREE from 'three';

export interface OceanSystemOptions {
  size?: number;
  segments?: number;
  waveHeight?: number;
  waveLength?: number;
  waveSpeed?: number;
  THREE?: typeof THREE;
}

export interface ShipLikeObject {
  position?: {
    x?: number;
    y?: number;
    z?: number;
    set?: (x: number, y: number, z: number) => void;
  };
}

export class OceanSystem {
  public scene: THREE.Scene | { add?: (obj: any) => void; remove?: (obj: any) => void };
  public size: number;
  public segments: number;
  public time: number;
  public waveHeight: number;
  public waveLength: number;
  public waveSpeed: number;

  public mesh: THREE.Mesh | null;
  public geometry: THREE.PlaneGeometry | null;
  public basePositions: Float32Array | null;
  public options: OceanSystemOptions;

  constructor(
    scene: THREE.Scene | { add?: (obj: any) => void; remove?: (obj: any) => void },
    options: OceanSystemOptions = {}
  ) {
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

  public create(): void {
    const ThreeLib =
      (typeof globalThis !== 'undefined' && (globalThis as any).THREE) ||
      this.options.THREE ||
      THREE;

    if (!ThreeLib) {
      console.warn('Three.js is required for OceanSystem.');
      return;
    }

    const geometry = new ThreeLib.PlaneGeometry(
      this.size,
      this.size,
      this.segments,
      this.segments
    );

    geometry.rotateX(-Math.PI / 2);

    const material = new ThreeLib.MeshStandardMaterial({
      roughness: 0.25,
      metalness: 0.05,
      transparent: true,
      opacity: 0.92
    });

    const mesh = new ThreeLib.Mesh(geometry, material);
    mesh.receiveShadow = true;

    this.geometry = geometry;
    this.mesh = mesh;

    const position = geometry.attributes.position;
    this.basePositions = new Float32Array(position.array);

    if (this.scene && typeof this.scene.add === 'function') {
      this.scene.add(mesh);
    }
  }

  public getWaveHeight(x: number, z: number, time: number = this.time): number {
    const wave1 = Math.sin(x / this.waveLength + time * this.waveSpeed);
    const wave2 = Math.cos(z / (this.waveLength * 0.75) + time * this.waveSpeed * 0.8);
    const wave3 = Math.sin((x + z) / (this.waveLength * 1.4) + time * this.waveSpeed * 1.25);

    return (
      wave1 * this.waveHeight * 0.55 +
      wave2 * this.waveHeight * 0.30 +
      wave3 * this.waveHeight * 0.15
    );
  }

  public update(delta: number): void {
    if (!this.geometry || !this.basePositions) return;

    this.time += Math.min(delta, 0.05);

    const position = this.geometry.attributes.position;
    const array = position.array as Float32Array;

    for (let i = 0; i < position.count; i++) {
      const x = this.basePositions[i * 3];
      const z = this.basePositions[i * 3 + 2];

      array[i * 3 + 1] = this.getWaveHeight(x, z);
    }

    position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  public getSurfaceY(x: number, z: number): number {
    return this.getWaveHeight(x, z);
  }

  public applyToShip(ship: ShipLikeObject | null | undefined, x: number, z: number): void {
    if (!ship) return;

    const y = this.getSurfaceY(x, z);

    if (ship.position) {
      ship.position.y = y;
    }
  }

  public dispose(): void {
    if (!this.mesh) return;

    this.geometry?.dispose();
    if (this.mesh.material) {
      if (Array.isArray(this.mesh.material)) {
        this.mesh.material.forEach(m => m.dispose());
      } else {
        (this.mesh.material as THREE.Material).dispose();
      }
    }

    if (this.scene && typeof this.scene.remove === 'function') {
      this.scene.remove(this.mesh);
    }

    this.mesh = null;
    this.geometry = null;
    this.basePositions = null;
  }
}
