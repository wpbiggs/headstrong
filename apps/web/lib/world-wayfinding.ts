import type { IslandLocation } from "./awakening";

export type WorldMarker = { location: IslandLocation; x: number; y: number };

// Projected CSS pixels, not device pixels. Keep real buttons inside the canvas
// and separate their touch targets; the permanent trail handles off-screen stops.
export function layoutWorldMarkers(
  points: WorldMarker[],
  width: number,
  height: number,
): WorldMarker[] {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 116 ||
    height < 104
  )
    return [];
  const placed: WorldMarker[] = [];
  for (const point of [...points].sort((a, b) => a.y - b.y)) {
    if (
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      point.x < 0 ||
      point.x > width ||
      point.y < 0 ||
      point.y > height
    )
      continue;
    const x = Math.max(58, Math.min(width - 58, point.x));
    for (const shift of [0, -52, 52, -104, 104]) {
      const y = Math.max(28, Math.min(height - 28, point.y + shift));
      if (
        placed.some(
          (other) => Math.abs(other.x - x) < 116 && Math.abs(other.y - y) < 52,
        )
      )
        continue;
      placed.push({ location: point.location, x, y });
      break;
    }
  }
  return placed.map((point) => ({
    ...point,
    x: (point.x / width) * 100,
    y: (point.y / height) * 100,
  }));
}
