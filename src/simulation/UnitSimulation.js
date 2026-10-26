/**
 * UnitSimulation.js
 * Engine-friendly 3D unit movement system.
 * Works with Three.js and Babylon.js-style transform objects.
 */

export class UnitSimulation {
  constructor() {
    this.units = new Map();
    this.time = 0;
    this.paused = false;
    this.speedMultiplier = 1;
  }

  addUnit(config) {
    if (!config?.id || this.units.has(config.id)) {
      throw new Error("Unit must have a unique id.");
    }

    const unit = {
      id: config.id,
      type: config.type ?? "vehicle",
      mesh: config.mesh ?? null,

      // World-space position.
      position: {
        x: config.x ?? 0,
        y: config.y ?? 0,
        z: config.z ?? 0
      },

      route: Array.isArray(config.route)
        ? config.route.map(p => ({
            x: Number(p.x),
            y: Number(p.y ?? 0),
            z: Number(p.z)
          })).filter(p =>
            Number.isFinite(p.x) &&
            Number.isFinite(p.y) &&
            Number.isFinite(p.z)
          )
        : [],

      routeIndex: 0,
      speed: Math.max(0, config.speed ?? 5),
      turnRate: Math.max(0.1, config.turnRate ?? 2.5),
      heading: config.heading ?? 0,
      bobAmplitude: config.type === "ship" ? 0.08 : 0,
      bobFrequency: config.type === "ship" ? 1.5 : 0,
      baseY: config.y ?? 0,
      active: true,
      reachedDestination: false
    };

    this.units.set(unit.id, unit);
    this.syncMesh(unit);
    return unit;
  }

  setRoute(id, route) {
    const unit = this.units.get(id);
    if (!unit || !Array.isArray(route)) return false;

    const points = route.map(p => ({
      x: Number(p.x),
      y: Number(p.y ?? 0),
      z: Number(p.z)
    }));

    if (points.some(p =>
      !Number.isFinite(p.x) ||
      !Number.isFinite(p.y) ||
      !Number.isFinite(p.z)
    )) {
      return false;
    }

    unit.route = points;
    unit.routeIndex = 0;
    unit.reachedDestination = points.length === 0;
    return true;
  }

  setSpeed(id, speed) {
    const unit = this.units.get(id);
    if (!unit || !Number.isFinite(speed)) return;
    unit.speed = Math.max(0, speed);
  }

  getUnit(id) {
    return this.units.get(id) ?? null;
  }

  removeUnit(id) {
    return this.units.delete(id);
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  setSimulationSpeed(multiplier) {
    if (Number.isFinite(multiplier)) {
      this.speedMultiplier = Math.max(
        0,
        Math.min(4, multiplier)
      );
    }
  }

  get simulationSpeed() {
    return this.speedMultiplier;
  }

  set simulationSpeed(val) {
    this.setSimulationSpeed(val);
  }

  update(deltaSeconds) {
    if (this.paused) return;

    // Avoid huge jumps after tab suspension.
    const dt = Math.min(
      Math.max(deltaSeconds || 0, 0),
      0.05
    ) * this.speedMultiplier;

    this.time += dt;

    for (const unit of this.units.values()) {
      if (!unit.active) continue;

      this.moveUnit(unit, dt);
      this.syncMesh(unit);
    }
  }

  moveUnit(unit, dt) {
    if (!unit.route.length ||
        unit.routeIndex >= unit.route.length) {
      unit.reachedDestination = true;
      return;
    }

    const target = unit.route[unit.routeIndex];
    const dx = target.x - unit.position.x;
    const dy = target.y - unit.position.y;
    const dz = target.z - unit.position.z;

    const distance = Math.hypot(dx, dy, dz);
    const step = unit.speed * dt;

    if (distance < 0.001 || step >= distance) {
      unit.position.x = target.x;
      unit.position.y = target.y;
      unit.position.z = target.z;
      unit.routeIndex++;

      if (unit.routeIndex >= unit.route.length) {
        unit.reachedDestination = true;
      }
      return;
    }

    // Move smoothly toward the next waypoint.
    const amount = step / distance;
    unit.position.x += dx * amount;
    unit.position.y += dy * amount;
    unit.position.z += dz * amount;

    // Heading follows the route direction.
    const desiredHeading = Math.atan2(dx, dz);
    let angleDifference =
      desiredHeading - unit.heading;

    angleDifference = Math.atan2(
      Math.sin(angleDifference),
      Math.cos(angleDifference)
    );

    const turnAmount = Math.min(
      1,
      unit.turnRate * dt
    );

    unit.heading += angleDifference * turnAmount;
  }

  syncMesh(unit) {
    const mesh = unit.mesh;
    if (!mesh) return;

    const p = unit.position;
    const bob = unit.bobAmplitude *
      Math.sin(this.time * unit.bobFrequency);

    // Compatible with common Three.js and Babylon.js
    // transform objects. Meshes must already be created.
    if (mesh.position?.set) {
      mesh.position.set(
        p.x,
        p.y + bob,
        p.z
      );
    } else if (mesh.position) {
      mesh.position.x = p.x;
      mesh.position.y = p.y + bob;
      mesh.position.z = p.z;
    }

    if (mesh.rotation) {
      mesh.rotation.y = unit.heading;
    }
  }
}

export function createDemoSimulation(models = {}) {
  const simulation = new UnitSimulation();

  simulation.addUnit({
    id: "ship-01",
    type: "ship",
    mesh: models.ship,
    x: -30,
    y: 0,
    z: 0,
    speed: 4,
    route: [
      { x: -30, y: 0, z: 0 },
      { x: -10, y: 0, z: 8 },
      { x: 10, y: 0, z: 15 },
      { x: 30, y: 0, z: 10 }
    ]
  });

  simulation.addUnit({
    id: "aircraft-01",
    type: "aircraft",
    mesh: models.aircraft,
    x: -25,
    y: 12,
    z: -20,
    speed: 14,
    turnRate: 1.5,
    route: [
      { x: -25, y: 12, z: -20 },
      { x: -5, y: 18, z: -10 },
      { x: 15, y: 16, z: 5 },
      { x: 30, y: 12, z: 20 }
    ]
  });

  simulation.addUnit({
    id: "vehicle-01",
    type: "vehicle",
    mesh: models.vehicle,
    x: 0,
    y: 0,
    z: 30,
    speed: 3,
    route: [
      { x: 0, y: 0, z: 30 },
      { x: 10, y: 0, z: 30 },
      { x: 10, y: 0, z: 10 }
    ]
  });

  return simulation;
}
