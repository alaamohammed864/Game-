import * as THREE_MODULE from 'three';

/**
 * EventEffectSystem.js
 * Particle and mesh VFX manager for combat impact spheres, smoke plumes, and tactical alerts.
 */

export class EventEffectSystem {
  constructor(scene = null) {
    this.scene = scene;
    this.effects = [];
  }

  createImpact(position) {
    const THREE = (typeof globalThis !== 'undefined' && globalThis.THREE) || THREE_MODULE;

    if (!THREE) return null;

    const geometry =
      new THREE.SphereGeometry(
        0.25,
        12,
        12
      );

    const material =
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.85
      });

    const mesh =
      new THREE.Mesh(
        geometry,
        material
      );

    if (mesh.position?.copy && typeof mesh.position.copy === 'function') {
      mesh.position.copy(position);
    } else if (mesh.position && position) {
      mesh.position.x = position.x ?? 0;
      mesh.position.y = position.y ?? 0;
      mesh.position.z = position.z ?? 0;
    }

    if (this.scene?.add) {
      this.scene.add(mesh);
    }

    const effect = {
      mesh,
      age: 0,
      lifetime: 0.8
    };

    this.effects.push(effect);
    return effect;
  }

  createSmoke(position) {
    const THREE = (typeof globalThis !== 'undefined' && globalThis.THREE) || THREE_MODULE;

    if (!THREE) return null;

    const geometry =
      new THREE.SphereGeometry(
        0.4,
        10,
        10
      );

    const material =
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.35
      });

    const smoke =
      new THREE.Mesh(
        geometry,
        material
      );

    if (smoke.position?.copy && typeof smoke.position.copy === 'function') {
      smoke.position.copy(position);
    } else if (smoke.position && position) {
      smoke.position.x = position.x ?? 0;
      smoke.position.y = position.y ?? 0;
      smoke.position.z = position.z ?? 0;
    }

    if (this.scene?.add) {
      this.scene.add(smoke);
    }

    const effect = {
      mesh: smoke,
      age: 0,
      lifetime: 2
    };

    this.effects.push(effect);
    return effect;
  }

  update(delta) {
    for (
      let i =
        this.effects.length - 1;
      i >= 0;
      i--
    ) {
      const effect =
        this.effects[i];

      effect.age += delta;

      const progress =
        effect.age /
        effect.lifetime;

      if (effect.mesh.scale?.setScalar) {
        effect.mesh.scale.setScalar(
          1 + progress * 2
        );
      } else if (effect.mesh.scale) {
        effect.mesh.scale.x = 1 + progress * 2;
        effect.mesh.scale.y = 1 + progress * 2;
        effect.mesh.scale.z = 1 + progress * 2;
      }

      if (effect.mesh.material) {
        effect.mesh.material.opacity =
          Math.max(
            0,
            0.8 - progress * 0.8
          );
      }

      if (
        effect.age >=
        effect.lifetime
      ) {
        if (this.scene?.remove) {
          this.scene.remove(
            effect.mesh
          );
        }

        effect.mesh.geometry?.dispose();
        effect.mesh.material?.dispose();

        this.effects.splice(
          i,
          1
        );
      }
    }
  }

  clear() {
    for (const effect of this.effects) {
      if (this.scene?.remove) {
        this.scene.remove(effect.mesh);
      }
      effect.mesh.geometry?.dispose();
      effect.mesh.material?.dispose();
    }
    this.effects = [];
  }

  // Compatibility helpers
  triggerExplosion(x, y, z) {
    return this.createImpact({ x, y, z });
  }

  triggerRadarPing(x, y, z) {
    return this.createSmoke({ x, y, z });
  }
}
