/**
 * AircraftController.js
 * 3D aircraft flight controller with waypoint steering, pitch/heading rotation,
 * and aerodynamic atmospheric bobbing.
 */

export class AircraftController {
  constructor(mesh, options = {}) {
    this.mesh = mesh;

    this.speed =
      options.speed ?? 15;

    this.turnSpeed =
      options.turnSpeed ?? 1.2;

    this.altitude =
      options.altitude ?? 15;

    this.route =
      options.route ?? [];

    this.routeIndex = 0;

    this.heading = 0;
    this.pitch = 0;
    this.time = 0;
  }

  setRoute(route) {
    this.route =
      Array.isArray(route)
        ? route
        : [];

    this.routeIndex = 0;
  }

  update(delta) {
    if (
      !this.mesh ||
      !this.route.length
    ) {
      return;
    }

    this.time += delta;

    const target =
      this.route[
        this.routeIndex
      ];

    if (!target) return;

    const position =
      this.mesh.position;

    const targetY =
      target.y !== undefined
        ? target.y
        : this.altitude;

    const dx =
      target.x - position.x;

    const dy =
      targetY - position.y;

    const dz =
      target.z - position.z;

    const distance =
      Math.sqrt(
        dx * dx +
        dy * dy +
        dz * dz
      );

    if (distance < 2) {
      this.routeIndex++;

      if (
        this.routeIndex >=
        this.route.length
      ) {
        this.routeIndex = 0;
      }

      return;
    }

    const horizontalDistance =
      Math.sqrt(
        dx * dx +
        dz * dz
      );

    const desiredHeading =
      Math.atan2(dx, dz);

    let headingDifference =
      desiredHeading -
      this.heading;

    headingDifference =
      Math.atan2(
        Math.sin(
          headingDifference
        ),
        Math.cos(
          headingDifference
        )
      );

    this.heading +=
      headingDifference *
      Math.min(
        1,
        this.turnSpeed *
        delta
      );

    const amount =
      this.speed *
      delta /
      Math.max(distance, 0.001);

    position.x += dx * amount;
    position.y += dy * amount;
    position.z += dz * amount;

    this.pitch =
      Math.atan2(
        dy,
        horizontalDistance
      );

    if (this.mesh.rotation) {
      this.mesh.rotation.y =
        this.heading;

      this.mesh.rotation.x =
        -this.pitch;
    }

    // Slight natural aircraft motion.
    this.mesh.position.y +=
      Math.sin(
        this.time * 1.8
      ) * 0.01;
  }
}
