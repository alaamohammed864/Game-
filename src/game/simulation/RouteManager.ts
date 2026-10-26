export interface Waypoint3D {
  x: number;
  y: number;
  z: number;
}

export interface RouteDefinition {
  id: string;
  points: Waypoint3D[];
  loop?: boolean;
  totalLength?: number;
}

export interface RouteOptions {
  loop?: boolean;
  reverseOnEnd?: boolean;
}

export class RouteManager {
  public routes: Map<string, Waypoint3D[]> = new Map();

  constructor() {
    this.routes = new Map();
  }

  public createRoute(id: string, points: Partial<Waypoint3D>[] = []): Waypoint3D[] {
    const formatted = points.map(point => ({
      x: Number(point.x),
      y: Number(point.y ?? 0),
      z: Number(point.z)
    }));

    this.routes.set(id, formatted);
    return this.routes.get(id) || [];
  }

  public getRoute(id: string): Waypoint3D[] {
    return this.routes.get(id) || [];
  }

  public deleteRoute(id: string): boolean {
    return this.routes.delete(id);
  }

  public clear(): void {
    this.routes.clear();
  }

  public findClosestPoint(
    position: { x: number; z: number; y?: number },
    route: Waypoint3D[]
  ): Waypoint3D | null {
    let closest: Waypoint3D | null = null;
    let shortest = Infinity;

    for (const point of route) {
      const distance = Math.hypot(
        position.x - point.x,
        position.z - point.z
      );

      if (distance < shortest) {
        shortest = distance;
        closest = point;
      }
    }

    return closest;
  }

  // Backward compatibility
  public registerRoute(
    id: string,
    waypoints: Partial<Waypoint3D>[],
    options: RouteOptions = {}
  ): RouteDefinition {
    const pts = this.createRoute(id, waypoints);
    return {
      id,
      points: pts,
      loop: options.loop ?? true,
      totalLength: this.calculateLength(pts)
    };
  }

  public removeRoute(id: string): boolean {
    return this.deleteRoute(id);
  }

  public calculateLength(points: Waypoint3D[]): number {
    let len = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      len += Math.hypot(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
    }
    return len;
  }

  public interpolatePoint(points: Waypoint3D[], progress: number): Waypoint3D {
    if (!points.length) return { x: 0, y: 0, z: 0 };
    if (points.length === 1) return { ...points[0] };

    const clamped = Math.max(0, Math.min(1, progress));
    const totalSegments = points.length - 1;
    const scaled = clamped * totalSegments;
    const index = Math.min(Math.floor(scaled), totalSegments - 1);
    const subProgress = scaled - index;

    const p1 = points[index];
    const p2 = points[index + 1];

    return {
      x: p1.x + (p2.x - p1.x) * subProgress,
      y: p1.y + (p2.y - p1.y) * subProgress,
      z: p1.z + (p2.z - p1.z) * subProgress
    };
  }
}
