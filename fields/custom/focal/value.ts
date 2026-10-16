export type FocalPoint = {
  x: number;
  y: number;
};

const clamp = (value: number) => Math.min(100, Math.max(0, value));

const round = (value: number) => Math.round(value * 10) / 10;

const toPoint = (x: number, y: number): FocalPoint | null => {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x: round(clamp(x)), y: round(clamp(y)) };
};

export const parseFocal = (value: unknown): FocalPoint | null => {
  if (value == null || value === "") return null;

  if (typeof value === "string") {
    const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*%?\s+(-?\d+(?:\.\d+)?)\s*%?$/);
    if (!match) return null;
    return toPoint(Number(match[1]), Number(match[2]));
  }

  if (Array.isArray(value) && value.length >= 2) {
    return toPoint(Number(value[0]), Number(value[1]));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return toPoint(Number(record.x), Number(record.y));
  }

  return null;
};

export const focalToCss = (point: FocalPoint) => `${point.x}% ${point.y}%`;
