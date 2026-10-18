export type FocalPoint = {
  x: number;
  y: number;
  zoom: number;
};

export type FrameMetrics = {
  width: number;
  height: number;
  coverWidth: number;
  coverHeight: number;
};

export type FrameAspect = {
  width: number;
  height: number;
  css: string;
};

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;
export const DEFAULT_FOCAL: FocalPoint = { x: 50, y: 50, zoom: 1 };
export const DEFAULT_ASPECT: FrameAspect = { width: 4, height: 5, css: "4 / 5" };

const AXIS_EPSILON = 0.5;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const roundTo = (value: number, places: number) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

export const clampPercent = (value: number) => clamp(value, 0, 100);

export const clampZoom = (value: number) => clamp(value, MIN_ZOOM, MAX_ZOOM);

export const finalizeFocal = (x: number, y: number, zoom: number): FocalPoint | null => {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(zoom)) return null;
  return {
    x: roundTo(clampPercent(x), 1),
    y: roundTo(clampPercent(y), 1),
    zoom: roundTo(clampZoom(zoom), 2),
  };
};

const zoomFrom = (value: unknown) => {
  if (value == null || value === "") return 1;
  return Number(value);
};

export const parseFocal = (value: unknown): FocalPoint | null => {
  if (value == null || value === "") return null;

  if (typeof value === "string") {
    const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*%?\s+(-?\d+(?:\.\d+)?)\s*%?(?:\s+(-?\d+(?:\.\d+)?))?$/);
    if (!match) return null;
    return finalizeFocal(Number(match[1]), Number(match[2]), match[3] == null ? 1 : Number(match[3]));
  }

  if (Array.isArray(value)) {
    if (value.length < 2) return null;
    return finalizeFocal(Number(value[0]), Number(value[1]), value.length >= 3 ? zoomFrom(value[2]) : 1);
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.x == null || record.y == null) return null;
    return finalizeFocal(Number(record.x), Number(record.y), zoomFrom(record.zoom));
  }

  return null;
};

export const parseAspect = (value: unknown): FrameAspect => {
  if (typeof value !== "string") return DEFAULT_ASPECT;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (!match) return DEFAULT_ASPECT;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!(width > 0) || !(height > 0)) return DEFAULT_ASPECT;
  return { width, height, css: `${width} / ${height}` };
};

export const focalPosition = (focal: FocalPoint) => `${focal.x}% ${focal.y}%`;

export const formatZoom = (zoom: number) => {
  const rounded = roundTo(zoom, 2);
  return String(rounded);
};

export const formatFocal = (focal: FocalPoint) => `${focalPosition(focal)} · ${formatZoom(focal.zoom)}×`;

export const frameMetrics = (
  frameWidth: number,
  frameHeight: number,
  imageWidth: number,
  imageHeight: number,
): FrameMetrics | null => {
  if (!(frameWidth > 0) || !(frameHeight > 0) || !(imageWidth > 0) || !(imageHeight > 0)) return null;
  const cover = Math.max(frameWidth / imageWidth, frameHeight / imageHeight);
  return {
    width: frameWidth,
    height: frameHeight,
    coverWidth: imageWidth * cover,
    coverHeight: imageHeight * cover,
  };
};

const moveAxis = (percent: number, delta: number, frame: number, cover: number, zoom: number) => {
  const denom = frame - cover * zoom;
  if (!Number.isFinite(denom) || Math.abs(denom) < AXIS_EPSILON) return percent;
  return clampPercent(percent + (delta * 100) / denom);
};

// Dragging the photo by (dx, dy) pixels. A zero denominator is the cover axis
// that already fills the frame; that axis stays put until zoom opens it up.
export const panFocal = (focal: FocalPoint, metrics: FrameMetrics, dx: number, dy: number): FocalPoint => ({
  x: moveAxis(focal.x, dx, metrics.width, metrics.coverWidth, focal.zoom),
  y: moveAxis(focal.y, dy, metrics.height, metrics.coverHeight, focal.zoom),
  zoom: focal.zoom,
});

const zoomAxis = (
  percent: number,
  zoom: number,
  nextZoom: number,
  anchor: number,
  frame: number,
  cover: number,
) => {
  const denom = frame - cover * nextZoom;
  if (!Number.isFinite(denom) || Math.abs(denom) < AXIS_EPSILON || !(zoom > 0)) return clampPercent(percent);
  const imagePoint = (anchor - (frame - cover * zoom) * (percent / 100)) / zoom;
  return clampPercent(((anchor - imagePoint * nextZoom) / denom) * 100);
};

// Keep the image point under `anchor` (frame-local pixels) fixed while zoom changes.
export const zoomFocal = (
  focal: FocalPoint,
  metrics: FrameMetrics,
  nextZoom: number,
  anchorX: number,
  anchorY: number,
): FocalPoint => {
  const zoom = clampZoom(nextZoom);
  return {
    x: zoomAxis(focal.x, focal.zoom, zoom, anchorX, metrics.width, metrics.coverWidth),
    y: zoomAxis(focal.y, focal.zoom, zoom, anchorY, metrics.height, metrics.coverHeight),
    zoom,
  };
};

export const focalImageStyle = (focal: FocalPoint) => {
  const position = focalPosition(focal);
  return {
    position: "absolute" as const,
    inset: "0",
    width: "100%",
    height: "100%",
    maxWidth: "none" as const,
    objectFit: "cover" as const,
    objectPosition: position,
    transform: `scale(${formatZoom(focal.zoom)})`,
    transformOrigin: position,
  };
};

// The preview renders with focalImageStyle, which is this CSS.
export const focalRenderCss = (focal: FocalPoint, aspectCss: string) => {
  const position = focalPosition(focal);
  return [
    ".frame {",
    "  position: relative;",
    "  overflow: hidden;",
    `  aspect-ratio: ${aspectCss};`,
    "}",
    ".frame img {",
    "  position: absolute;",
    "  inset: 0;",
    "  width: 100%;",
    "  height: 100%;",
    "  max-width: none;",
    "  object-fit: cover;",
    `  object-position: ${position};`,
    `  transform: scale(${formatZoom(focal.zoom)});`,
    `  transform-origin: ${position};`,
    "}",
  ].join("\n");
};
