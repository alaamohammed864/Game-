import { OceanSystem } from './OceanSystem';

export interface RouteWaypoint2D {
  x: number;
  z: number;
  y?: number;
}

export interface TransformableShipMesh {
  position: {
    x: number;
    y: number;
    z: number;
    set?: (x: number, y: number, z: number) => void;
  };
  rotation?: {
    x: number;
    y: number;
    z: number;
  };
}

export interface OceanSystemLike {
  getSurfaceY: (x: number, z: number) => number;
}

export interface ShipControllerOptions {
  speed?: number;
  turnSpeed?: number;
  route?: RouteWaypoint2D[];
  heading?: number;
  waveOffset?: number;
}

export class ShipController {
  public mesh: TransformableShipMesh | null;
  public ocean: OceanSystemLike | OceanSystem | null;

  public speed: number;
  public turnSpeed: number;

  public route: RouteWaypoint2D[];
  public routeIndex: number;

  public heading: number;
  public waveOffset: number;
  public time: number;

  constructor(
    mesh: TransformableShipMesh | null,
    ocean: OceanSystemLike | OceanSystem | null = null,
    options: ShipControllerOptions = {}
  ) {
    this.mesh = mesh;
    this.ocean = ocean;

    this.speed = options.speed ?? 4;
    this.turnSpeed = options.turnSpeed ?? 1.8;

    this.route = options.route ?? [];
    this.routeIndex = 0;

    this.heading = options.heading ?? 0;
    this.waveOffset = options.waveOffset ?? Math.random() * Math.PI * 2;
    this.time = 0;
  }

  public setRoute(route: RouteWaypoint2D[]): void {
    this.route = route || [];
    this.routeIndex = 0;
  }

  public update(delta: number): void {
    if (!this.mesh || !this.route.length) {
      return;
    }

    this.time += delta;

    const target = this.route[this.routeIndex];
    if (!target) return;

    const dx = target.x - this.mesh.position.x;
    const dz = target.z - this.mesh.position.z;

    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance < 1.5) {
      this.routeIndex++;

      if (this.routeIndex >= this.route.length) {
        this.routeIndex = this.route.length - 1;
      }

      return;
    }

    const desiredHeading = Math.atan2(dx, dz);

    let difference = desiredHeading - this.heading;

    difference = Math.atan2(Math.sin(difference), Math.cos(difference));

    this.heading += difference * Math.min(1, this.turnSpeed * delta);

    const movement = this.speed * delta;

    this.mesh.position.x += Math.sin(this.heading) * movement;
    this.mesh.position.z += Math.cos(this.heading) * movement;

    if (this.ocean) {
      const wave = this.ocean.getSurfaceY(this.mesh.position.x, this.mesh.position.z);

      this.mesh.position.y = wave + 0.25;

      if (this.mesh.rotation) {
        this.mesh.rotation.x = Math.sin(this.time * 1.4 + this.waveOffset) * 0.025;
        this.mesh.rotation.z = Math.cos(this.time * 1.1 + this.waveOffset) * 0.035;
      }
    }

    if (this.mesh.rotation) {
      this.mesh.rotation.y = this.heading;
    }
  }
}
