import * as THREE from 'three';

export interface ShipMeshLike {
  position: {
    x: number;
    y: number;
    z: number;
    copy?: (v: { x: number; y: number; z: number }) => void;
  };
  rotation?: {
    x?: number;
    y?: number;
    z?: number;
  };
}

export interface ActiveWakeEffect {
  mesh: THREE.Mesh;
  ship: ShipMeshLike;
  life: number;
}

export interface WakeEffectOptions {
  scene?: any;
}

export class WakeEffect {
  public scene: any;
  public effects: ActiveWakeEffect[] = [];

  constructor(scene: any = null) {
    this.scene = scene ?? null;
    this.effects = [];
  }

  public create(ship: ShipMeshLike | null | undefined): ActiveWakeEffect | null {
    if (!ship) return null;

    const ThreeLib =
      (typeof globalThis !== 'undefined' && (globalThis as any).THREE) ||
      THREE;

    if (!ThreeLib) {
      console.warn('Three.js is required for WakeEffect.');
      return null;
    }

    const geometry = new ThreeLib.PlaneGeometry(1.5, 7);

    const material = new ThreeLib.MeshBasicMaterial({
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });

    const wake = new ThreeLib.Mesh(geometry, material);

    wake.rotation.x = -Math.PI / 2;

    if (this.scene && typeof this.scene.add === 'function') {
      this.scene.add(wake);
    }

    const effect: ActiveWakeEffect = {
      mesh: wake,
      ship,
      life: 0
    };

    this.effects.push(effect);

    return effect;
  }

  public update(delta: number): void {
    for (const effect of this.effects) {
      const ship = effect.ship;

      if (!ship?.position) continue;

      effect.life += delta;

      const wake = effect.mesh;

      if (wake.position?.copy && typeof wake.position.copy === 'function') {
        wake.position.copy(ship.position as THREE.Vector3);
      } else if (wake.position) {
        wake.position.x = ship.position.x ?? 0;
        wake.position.y = ship.position.y ?? 0;
        wake.position.z = ship.position.z ?? 0;
      }

      wake.position.y += 0.05;

      if (wake.rotation && ship.rotation && typeof ship.rotation.y === 'number') {
        wake.rotation.y = ship.rotation.y;
      }

      if (wake.scale) {
        wake.scale.z = 1 + Math.sin(effect.life * 2) * 0.1;
      }

      if (wake.material && 'opacity' in wake.material) {
        (wake.material as THREE.MeshBasicMaterial).opacity = Math.max(
          0.05,
          0.35 - effect.life * 0.02
        );
      }
    }
  }

  public clear(): void {
    for (const effect of this.effects) {
      if (this.scene && typeof this.scene.remove === 'function') {
        this.scene.remove(effect.mesh);
      }
      effect.mesh?.geometry?.dispose();
      if (effect.mesh?.material) {
        if (Array.isArray(effect.mesh.material)) {
          effect.mesh.material.forEach(m => m.dispose());
        } else {
          effect.mesh.material.dispose();
        }
      }
    }
    this.effects = [];
  }
}
