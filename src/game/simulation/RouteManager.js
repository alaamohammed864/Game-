/**
 * RouteManager.js
 * Waypoint routing, spatial nearest-neighbor search, and path manager.
 */

export class RouteManager {
  constructor() {
    this.routes = new Map();
  }

  createRoute(id, points = []) {
    this.routes.set(
      id,
      points.map(point => ({
        x: Number(point.x),
        y: Number(point.y ?? 0),
        z: Number(point.z)
      }))
    );

    return this.routes.get(id);
  }

  getRoute(id) {
    return this.routes.get(id) || [];
  }

  deleteRoute(id) {
    return this.routes.delete(id);
  }

  clear() {
    this.routes.clear();
  }

  findClosestPoint(
    position,
    route
  ) {
    let closest = null;
    let shortest = Infinity;

    for (
      const point of route
    ) {
      const distance =
        Math.hypot(
          position.x - point.x,
          position.z - point.z
        );

      if (
        distance < shortest
      ) {
        shortest = distance;
        closest = point;
      }
    }

    return closest;
  }

  // Compatibility helpers
  registerRoute(id, waypoints, options = {}) {
    const pts = this.createRoute(id, waypoints);
    return {
      id,
      points: pts,
      loop: options.loop ?? true,
      totalLength: this.calculateLength(pts)
    };
  }

  removeRoute(id) {
    return this.deleteRoute(id);
  }

  calculateLength(points) {
    let len = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      len += Math.hypot(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
    }
    return len;
  }

  interpolatePoint(points, progress) {
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
