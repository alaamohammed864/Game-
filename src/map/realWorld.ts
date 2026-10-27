import * as THREE from 'three';
import { feature, mesh } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import worldTopology from 'world-atlas/countries-50m.json';

/**
 * Real-world geography (Natural Earth via the `world-atlas` package):
 *  - an equirectangular earth texture: ocean, country fills, graticule, borders
 *  - crisp 3D border / coastline lines that stay sharp when zooming in
 *
 * Mapping matches Globe3D.latLngToVector3 and THREE.SphereGeometry: u = (lng + 180) / 360.
 */
const topology = worldTopology as unknown as Topology;
const countriesObject = topology.objects.countries as GeometryCollection;

type Ring = number[][];

function countryHue(id: string | number | undefined, name: string): number {
  const s = `${id ?? ''}${name}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function tracePolygons(ctx: CanvasRenderingContext2D, rings: Ring[], W: number, H: number) {
  for (const ring of rings) {
    ring.forEach(([lng, lat], i) => {
      const x = ((lng + 180) / 360) * W;
      const y = ((90 - lat) / 180) * H;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  }
}

export function createEarthTexture(): THREE.CanvasTexture {
  const W = 4096;
  const H = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Ocean
  const sea = ctx.createLinearGradient(0, 0, 0, H);
  sea.addColorStop(0, '#071a38');
  sea.addColorStop(0.5, '#05122b');
  sea.addColorStop(1, '#071a38');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, W, H);

  // Graticule (every 30 degrees)
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
  ctx.lineWidth = 1;
  for (let lng = -180; lng <= 180; lng += 30) {
    const x = ((lng + 180) / 360) * W;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let lat = -90; lat <= 90; lat += 30) {
    const y = ((90 - lat) / 180) * H;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Country fills: each country gets its own muted tone so neighbours are easy to tell apart
  const countries = feature(topology, countriesObject) as unknown as {
    features: Array<{ id?: string | number; properties: { name: string }; geometry: any }>;
  };
  for (const f of countries.features) {
    const hash = countryHue(f.id, f.properties?.name ?? '');
    const hue = 195 + (hash % 60);          // blue → teal → green
    const light = 20 + ((hash >> 8) % 10);  // 20–29 %
    ctx.fillStyle = `hsl(${hue}, 38%, ${light}%)`;
    ctx.beginPath();
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'Polygon') tracePolygons(ctx, g.coordinates, W, H);
    else if (g.type === 'MultiPolygon') g.coordinates.forEach((p: Ring[]) => tracePolygons(ctx, p, W, H));
    ctx.fill('evenodd');
  }

  // Borders in the texture (soft glow underlay for readability at distance)
  const borders = mesh(topology, countriesObject, (a, b) => a !== b);
  const coast = mesh(topology, countriesObject, (a, b) => a === b);
  const strokeMesh = (m: any, color: string, width: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const line of m.coordinates as Ring[]) {
      line.forEach(([lng, lat], i) => {
        const x = ((lng + 180) / 360) * W;
        const y = ((90 - lat) / 180) * H;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
    }
    ctx.stroke();
  };
  strokeMesh(coast, 'rgba(56, 189, 248, 0.55)', 3);
  strokeMesh(borders, 'rgba(186, 230, 253, 0.95)', 1.6);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function toVec(lng: number, lat: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(-(r * Math.sin(phi) * Math.cos(theta)), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

function linesToSegments(lines: Ring[], radius: number): THREE.BufferGeometry {
  const pts: number[] = [];
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; i++) {
      const [lng1, lat1] = line[i];
      const [lng2, lat2] = line[i + 1];
      // subdivide long segments so they hug the sphere instead of cutting through it
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(lng2 - lng1), Math.abs(lat2 - lat1)) / 2));
      let prev = toVec(lng1, lat1, radius);
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const cur = toVec(lng1 + (lng2 - lng1) * t, lat1 + (lat2 - lat1) * t, radius);
        pts.push(prev.x, prev.y, prev.z, cur.x, cur.y, cur.z);
        prev = cur;
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return geo;
}

/** Sharp 3D lines: country borders (bright) and coastlines (cyan). Add to the globe group. */
export function createBorderLines(): THREE.Group {
  const group = new THREE.Group();
  const borders = mesh(topology, countriesObject, (a, b) => a !== b) as unknown as { coordinates: Ring[] };
  const coast = mesh(topology, countriesObject, (a, b) => a === b) as unknown as { coordinates: Ring[] };

  group.add(new THREE.LineSegments(
    linesToSegments(coast.coordinates, 1.0015),
    new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7 })
  ));
  group.add(new THREE.LineSegments(
    linesToSegments(borders.coordinates, 1.0025),
    new THREE.LineBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.95 })
  ));
  return group;
}
