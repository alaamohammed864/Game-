/**
 * ShipController.js
 * Hydrodynamic ship navigation controller integrating with OceanSystem.
 * Provides waypoint steering, angular interpolation, pitch/roll wave dynamics, and draft offset.
 */

export class ShipController {
  constructor(mesh, ocean, options = {}) {
    this.mesh = mesh;
    this.ocean = ocean;

    this.speed = options.speed ?? 4;
    this.turnSpeed = options.turnSpeed ?? 1.8;

    this.route = options.route ?? [];
    this.routeIndex = 0;

    this.heading = options.heading ?? 0;

    this.waveOffset =
      options.waveOffset ?? (Math.random() * Math.PI * 2);

    this.time = 0;
  }

  setRoute(route) {
    this.route = route || [];
    this.routeIndex = 0;
  }

  update(delta) {
    if (!this.mesh || !this.route.length) {
      return;
    }

    this.time += delta;

    const target =
      this.route[this.routeIndex];

    if (!target) return;

    const dx =
      target.x - this.mesh.position.x;

    const dz =
      target.z - this.mesh.position.z;

    const distance =
      Math.sqrt(dx * dx + dz * dz);

    if (distance < 1.5) {
      this.routeIndex++;

      if (
        this.routeIndex >=
        this.route.length
      ) {
        this.routeIndex =
          this.route.length - 1;
      }

      return;
    }

    const desiredHeading =
      Math.atan2(dx, dz);

    let difference =
      desiredHeading - this.heading;

    difference =
      Math.atan2(
        Math.sin(difference),
        Math.cos(difference)
      );

    this.heading +=
      difference *
      Math.min(
        1,
        this.turnSpeed * delta
      );

    const movement =
      this.speed * delta;

    this.mesh.position.x +=
      Math.sin(this.heading) *
      movement;

    this.mesh.position.z +=
      Math.cos(this.heading) *
      movement;

    if (this.ocean) {
      const wave =
        this.ocean.getSurfaceY(
          this.mesh.position.x,
          this.mesh.position.z
        );

      this.mesh.position.y =
        wave + 0.25;

      if (this.mesh.rotation) {
        this.mesh.rotation.x =
          Math.sin(
            this.time * 1.4 +
            this.waveOffset
          ) * 0.025;

        this.mesh.rotation.z =
          Math.cos(
            this.time * 1.1 +
            this.waveOffset
          ) * 0.035;
      }
    }

    if (this.mesh.rotation) {
      this.mesh.rotation.y =
        this.heading;
    }
  }
}
