import * as THREE_MODULE from 'three';

export class WakeEffect {
  constructor(scene) {
    this.scene = scene ?? null;
    this.effects = [];
  }

  create(ship) {
    if (!ship) return null;

    const THREE = (typeof globalThis !== 'undefined' && globalThis.THREE) || THREE_MODULE;

    if (!THREE) {
      console.warn("Three.js is required for WakeEffect.");
      return null;
    }

    const geometry =
      new THREE.PlaneGeometry(
        1.5,
        7
      );

    const material =
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.35,
        depthWrite: false
      });

    const wake =
      new THREE.Mesh(
        geometry,
        material
      );

    wake.rotation.x =
      -Math.PI / 2;

    if (this.scene?.add) {
      this.scene.add(wake);
    }

    const effect = {
      mesh: wake,
      ship,
      life: 0
    };

    this.effects.push(effect);

    return effect;
  }

  update(delta) {
    for (
      const effect of this.effects
    ) {
      const ship =
        effect.ship;

      if (!ship?.position) continue;

      effect.life += delta;

      const wake =
        effect.mesh;

      if (wake.position?.copy && typeof wake.position.copy === 'function') {
        wake.position.copy(
          ship.position
        );
      } else if (wake.position) {
        wake.position.x = ship.position.x ?? 0;
        wake.position.y = ship.position.y ?? 0;
        wake.position.z = ship.position.z ?? 0;
      }

      wake.position.y += 0.05;

      if (wake.rotation && ship.rotation) {
        wake.rotation.y =
          ship.rotation.y;
      }

      if (wake.scale) {
        wake.scale.z =
          1 +
          Math.sin(effect.life * 2) *
          0.1;
      }

      if (wake.material) {
        wake.material.opacity =
          Math.max(
            0.05,
            0.35 -
            effect.life * 0.02
          );
      }
    }
  }

  clear() {
    for (const effect of this.effects) {
      if (this.scene?.remove && effect.mesh) {
        this.scene.remove(effect.mesh);
      }
      effect.mesh?.geometry?.dispose();
      effect.mesh?.material?.dispose();
    }
    this.effects = [];
  }
}
