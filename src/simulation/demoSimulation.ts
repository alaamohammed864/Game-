import { UnitSimulation, TransformableMesh } from "./UnitSimulation";

export interface DemoModels {
  ship?: TransformableMesh | null;
  aircraft?: TransformableMesh | null;
  vehicle?: TransformableMesh | null;
  [key: string]: TransformableMesh | null | undefined;
}

export function createDemoSimulation(models: DemoModels = {}): UnitSimulation {
  const simulation = new UnitSimulation();

  simulation.addUnit({
    id: "ship-01",
    type: "ship",
    mesh: models.ship ?? null,
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
    mesh: models.aircraft ?? null,
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
    mesh: models.vehicle ?? null,
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
