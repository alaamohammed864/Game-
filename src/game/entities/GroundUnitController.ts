export interface GroundWaypoint {
  x: number;
  y?: number;
  z: number;
}

export interface TransformableGroundMesh {
  position: {
    x: number;
    y: number;
    z: number;
    set?: (x: number, y: number, z: number) => void;
  };
  rotation?: {
    x?: number;
    y?: number;
    z?: number;
  };
}

export interface GroundUnitControllerOptions {
  speed?: number;
  turnSpeed?: number;
  route?: GroundWaypoint[];
}

export class GroundUnitController {
  public mesh: TransformableGroundMesh | null;
  public speed: number;
  public turnSpeed: number;

  public route: GroundWaypoint[];
  public routeIndex: number;

  public heading: number;

  constructor(
    mesh: TransformableGroundMesh | null,
    options: GroundUnitControllerOptions = {}
  ) {
    this.mesh = mesh;

    this.speed = options.speed ?? 3;
    this.turnSpeed = options.turnSpeed ?? 3;

    this.route = options.route ?? [];
    this.routeIndex = 0;

    this.heading = 0;
  }

  public setRoute(route: GroundWaypoint[]): void {
    this.route = Array.isArray(route) ? route : [];
    this.routeIndex = 0;
  }

  public update(delta: number): void {
    if (!this.mesh || !this.route.length) {
      return;
    }

    const target = this.route[this.routeIndex];
    if (!target) return;

    const dx = target.x - this.mesh.position.x;
    const dz = target.z - this.mesh.position.z;

    const distance = Math.hypot(dx, dz);

    if (distance < 1) {
      this.routeIndex++;

      if (this.routeIndex >= this.route.length) {
        this.routeIndex = 0;
      }

      return;
    }

    const desired = Math.atan2(dx, dz);

    let difference = desired - this.heading;

    difference = Math.atan2(
      Math.sin(difference),
      Math.cos(difference)
    );

    this.heading += difference * Math.min(1, this.turnSpeed * delta);

    this.mesh.position.x += Math.sin(this.heading) * this.speed * delta;
    this.mesh.position.z += Math.cos(this.heading) * this.speed * delta;

    if (this.mesh.rotation) {
      this.mesh.rotation.y = this.heading;
    }
  }
}
