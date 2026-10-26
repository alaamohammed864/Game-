import { UnitSimulation } from "./UnitSimulation.js";

/**
 * Creates and initializes a demo unit simulation with ship, aircraft, and vehicle units.
 * Compatible with Three.js and Babylon.js transform objects.
 *
 * @param {Object} models - Object containing transformable mesh models { ship, aircraft, vehicle }
 * @returns {UnitSimulation} Configured unit simulation ready for update loop
 */
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

export { UnitSimulation };
