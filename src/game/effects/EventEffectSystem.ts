import * as THREE from 'three';

export interface VisualEffectItem {
  mesh: THREE.Mesh;
  age: number;
  lifetime: number;
}

export interface Position3DLike {
  x: number;
  y: number;
  z: number;
  copy?: (v: { x: number; y: number; z: number }) => void;
}

export class EventEffectSystem {
  public scene: any;
  public effects: VisualEffectItem[] = [];

  constructor(scene: any = null) {
    this.scene = scene;
    this.effects = [];
  }

  public createImpact(position: Position3DLike): VisualEffectItem | null {
    const ThreeLib =
      (typeof globalThis !== 'undefined' && (globalThis as any).THREE) ||
      THREE;

    if (!ThreeLib) return null;

    const geometry = new ThreeLib.SphereGeometry(0.25, 12, 12);

    const material = new ThreeLib.MeshBasicMaterial({
      transparent: true,
      opacity: 0.85
    });

    const mesh = new ThreeLib.Mesh(geometry, material);

    if (mesh.position?.copy && typeof mesh.position.copy === 'function') {
      mesh.position.copy(position as THREE.Vector3);
    } else if (mesh.position && position) {
      mesh.position.x = position.x ?? 0;
      mesh.position.y = position.y ?? 0;
      mesh.position.z = position.z ?? 0;
    }

    if (this.scene && typeof this.scene.add === 'function') {
      this.scene.add(mesh);
    }

    const effect: VisualEffectItem = {
      mesh,
      age: 0,
      lifetime: 0.8
    };

    this.effects.push(effect);
    return effect;
  }

  public createSmoke(position: Position3DLike): VisualEffectItem | null {
    const ThreeLib =
      (typeof globalThis !== 'undefined' && (globalThis as any).THREE) ||
      THREE;

    if (!ThreeLib) return null;

    const geometry = new ThreeLib.SphereGeometry(0.4, 10, 10);

    const material = new ThreeLib.MeshBasicMaterial({
      transparent: true,
      opacity: 0.35
    });

    const smoke = new ThreeLib.Mesh(geometry, material);

    if (smoke.position?.copy && typeof smoke.position.copy === 'function') {
      smoke.position.copy(position as THREE.Vector3);
    } else if (smoke.position && position) {
      smoke.position.x = position.x ?? 0;
      smoke.position.y = position.y ?? 0;
      smoke.position.z = position.z ?? 0;
    }

    if (this.scene && typeof this.scene.add === 'function') {
      this.scene.add(smoke);
    }

    const effect: VisualEffectItem = {
      mesh: smoke,
      age: 0,
      lifetime: 2
    };

    this.effects.push(effect);
    return effect;
  }

  public update(delta: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];

      effect.age += delta;

      const progress = effect.age / effect.lifetime;

      if (effect.mesh.scale?.setScalar) {
        effect.mesh.scale.setScalar(1 + progress * 2);
      } else if (effect.mesh.scale) {
        effect.mesh.scale.x = 1 + progress * 2;
        effect.mesh.scale.y = 1 + progress * 2;
        effect.mesh.scale.z = 1 + progress * 2;
      }

      if (effect.mesh.material && 'opacity' in effect.mesh.material) {
        (effect.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
          0,
          0.8 - progress * 0.8
        );
      }

      if (effect.age >= effect.lifetime) {
        if (this.scene && typeof this.scene.remove === 'function') {
          this.scene.remove(effect.mesh);
        }

        effect.mesh.geometry?.dispose();
        if (effect.mesh.material) {
          if (Array.isArray(effect.mesh.material)) {
            effect.mesh.material.forEach(m => m.dispose());
          } else {
            effect.mesh.material.dispose();
          }
        }

        this.effects.splice(i, 1);
      }
    }
  }

  public clear(): void {
    for (const effect of this.effects) {
      if (this.scene && typeof this.scene.remove === 'function') {
        this.scene.remove(effect.mesh);
      }
      effect.mesh.geometry?.dispose();
      if (effect.mesh.material) {
        if (Array.isArray(effect.mesh.material)) {
          effect.mesh.material.forEach(m => m.dispose());
        } else {
          effect.mesh.material.dispose();
        }
      }
    }
    this.effects = [];
  }

  // Backward compatibility
  public triggerExplosion(x: number, y: number, z: number): VisualEffectItem | null {
    return this.createImpact({ x, y, z });
  }

  public triggerRadarPing(x: number, y: number, z: number): VisualEffectItem | null {
    return this.createSmoke({ x, y, z });
  }
}
