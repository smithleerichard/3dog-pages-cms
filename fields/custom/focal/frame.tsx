"use client";

import { useEffect, useId, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DEFAULT_FOCAL,
  finalizeFocal,
  focalImageStyle,
  focalRenderCss,
  formatZoom,
  frameMetrics,
  panFocal,
  parseFocal,
  zoomFocal,
  type FocalPoint,
  type FrameAspect,
  type FrameMetrics,
} from "./value";

type Point = { x: number; y: number };

type Gesture = {
  focal: FocalPoint;
  points: Point[];
};

const sameFocal = (a: FocalPoint, b: FocalPoint) => a.x === b.x && a.y === b.y && a.zoom === b.zoom;

const FocalFrame = ({
  value,
  onChange,
  aspect,
  src,
  readonly = false,
  emptyLabel,
}: {
  value?: unknown;
  onChange: (value: FocalPoint) => void;
  aspect: FrameAspect;
  src?: string | null;
  readonly?: boolean;
  emptyLabel: string;
}) => {
  const initial = parseFocal(value) ?? DEFAULT_FOCAL;
  const [focal, setFocal] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const focalRef = useRef(initial);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const frameRef = useRef<HTMLDivElement>(null);
  const naturalRef = useRef<{ width: number; height: number } | null>(null);
  const srcRef = useRef(src);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture | null>(null);
  const zoomBaseline = useRef<FocalPoint | null>(null);
  const commitRef = useRef<(next: FocalPoint) => void>(() => {});
  const zoomId = useId();

  if (srcRef.current !== src) {
    srcRef.current = src;
    naturalRef.current = null;
  }

  onChangeRef.current = onChange;
  valueRef.current = value;

  const commit = (next: FocalPoint) => {
    const rounded = finalizeFocal(next.x, next.y, next.zoom);
    if (!rounded) return;
    const current = parseFocal(valueRef.current);
    focalRef.current = rounded;
    setFocal(rounded);
    if (current == null || !sameFocal(rounded, current)) onChangeRef.current(rounded);
  };
  commitRef.current = commit;

  const readMetrics = (): FrameMetrics | null => {
    const frame = frameRef.current;
    const size = naturalRef.current;
    if (!frame || !size) return null;
    const rect = frame.getBoundingClientRect();
    return frameMetrics(rect.width, rect.height, size.width, size.height);
  };

  useEffect(() => {
    if (gesture.current) return;
    const next = parseFocal(value) ?? DEFAULT_FOCAL;
    if (sameFocal(focalRef.current, next)) return;
    focalRef.current = next;
    setFocal(next);
  }, [value]);

  useEffect(() => {
    const node = frameRef.current;
    if (!node || readonly) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const current = focalRef.current;
      const rect = node.getBoundingClientRect();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
      const nextZoom = current.zoom * Math.exp(-event.deltaY * unit * 0.0012);
      const size = naturalRef.current;
      const metrics = size ? frameMetrics(rect.width, rect.height, size.width, size.height) : null;
      if (!metrics) {
        commitRef.current(finalizeFocal(current.x, current.y, nextZoom) ?? current);
        return;
      }
      commitRef.current(zoomFocal(
        current,
        metrics,
        nextZoom,
        event.clientX - rect.left,
        event.clientY - rect.top,
      ));
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [readonly]);

  const applyGesture = () => {
    const currentGesture = gesture.current;
    const frame = frameRef.current;
    const metrics = readMetrics();
    if (!currentGesture || !frame || !metrics) return;

    const current = [...pointers.current.values()];
    const start = currentGesture.points;
    if (!current.length || !start.length) return;

    if (current.length < 2 || start.length < 2) {
      commit(panFocal(
        currentGesture.focal,
        metrics,
        current[0].x - start[0].x,
        current[0].y - start[0].y,
      ));
      return;
    }

    const startDistance = Math.hypot(start[0].x - start[1].x, start[0].y - start[1].y);
    const distance = Math.hypot(current[0].x - current[1].x, current[0].y - current[1].y);
    const startMid = { x: (start[0].x + start[1].x) / 2, y: (start[0].y + start[1].y) / 2 };
    const mid = { x: (current[0].x + current[1].x) / 2, y: (current[0].y + current[1].y) / 2 };
    const rect = frame.getBoundingClientRect();
    const nextZoom = startDistance > 0
      ? currentGesture.focal.zoom * (distance / startDistance)
      : currentGesture.focal.zoom;
    const zoomed = zoomFocal(
      currentGesture.focal,
      metrics,
      nextZoom,
      startMid.x - rect.left,
      startMid.y - rect.top,
    );
    commit(panFocal(zoomed, metrics, mid.x - startMid.x, mid.y - startMid.y));
  };

  const rebaseGesture = () => {
    const points = [...pointers.current.values()];
    gesture.current = points.length ? { focal: focalRef.current, points } : null;
    setDragging(points.length > 0);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (readonly || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    rebaseGesture();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    applyGesture();
  };

  const endPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.delete(event.pointerId);
    rebaseGesture();
  };

  const nudge = (dx: number, dy: number) => {
    const metrics = readMetrics();
    if (!metrics) return;
    commit(panFocal(focalRef.current, metrics, dx, dy));
  };

  const nudgeZoom = (delta: number) => {
    const metrics = readMetrics();
    const current = focalRef.current;
    if (!metrics) {
      commit(finalizeFocal(current.x, current.y, current.zoom + delta) ?? current);
      return;
    }
    commit(zoomFocal(current, metrics, current.zoom + delta, metrics.width / 2, metrics.height / 2));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (readonly) return;
    const distance = event.shiftKey ? 24 : 8;
    const zoomStep = event.shiftKey ? 0.2 : 0.05;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      nudge(-distance, 0);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      nudge(distance, 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      nudge(0, -distance);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      nudge(0, distance);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      nudgeZoom(zoomStep);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      nudgeZoom(-zoomStep);
    } else if (event.key === "0" || event.key === "Home") {
      event.preventDefault();
      commit(DEFAULT_FOCAL);
    }
  };

  const onSliderChange = (nextZoom: number) => {
    const base = zoomBaseline.current ?? focalRef.current;
    const metrics = readMetrics();
    if (!metrics) {
      commit({ ...base, zoom: nextZoom });
      return;
    }
    commit(zoomFocal(base, metrics, nextZoom, metrics.width / 2, metrics.height / 2));
  };

  const css = focalRenderCss(focal, aspect.css);
  const saved = JSON.stringify({ x: focal.x, y: focal.y, zoom: focal.zoom });
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <div className="flex flex-col gap-3">
      <div className="w-full max-w-sm overflow-hidden rounded-md border bg-muted">
        <div
          ref={frameRef}
          role="application"
          tabIndex={readonly ? -1 : 0}
          aria-label="Frame the photo. Drag to reposition, scroll or pinch to zoom."
          className={cn(
            "relative overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-ring",
            readonly ? "cursor-default" : dragging ? "cursor-grabbing" : "cursor-grab",
          )}
          style={{ aspectRatio: aspect.css, touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onKeyDown={onKeyDown}
        >
          {showImage ? (
            <img
              src={src ?? undefined}
              alt=""
              draggable={false}
              className="pointer-events-none select-none"
              style={focalImageStyle(focal)}
              onLoad={(event) => {
                const image = event.currentTarget;
                if (image.getAttribute("src") !== srcRef.current) return;
                if (!image.naturalWidth || !image.naturalHeight) return;
                naturalRef.current = { width: image.naturalWidth, height: image.naturalHeight };
              }}
              onError={() => setFailedSrc(src ?? null)}
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-muted-foreground">
              {src ? "Could not load the photo." : emptyLabel}
            </span>
          )}
        </div>
      </div>
      <div className="flex max-w-sm flex-col gap-2">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <label htmlFor={zoomId}>Zoom</label>
          <span className="tabular-nums">{formatZoom(focal.zoom)}×</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            id={zoomId}
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={focal.zoom}
            disabled={readonly}
            aria-valuemin={1}
            aria-valuemax={3}
            aria-valuenow={focal.zoom}
            aria-valuetext={`${formatZoom(focal.zoom)}×`}
            className="h-2 min-w-0 flex-1 cursor-pointer accent-foreground disabled:cursor-not-allowed"
            onPointerDown={() => {
              zoomBaseline.current = focalRef.current;
            }}
            onPointerUp={() => {
              zoomBaseline.current = null;
            }}
            onPointerCancel={() => {
              zoomBaseline.current = null;
            }}
            onChange={(event) => onSliderChange(Number(event.target.value))}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => commit(DEFAULT_FOCAL)}
            disabled={readonly || sameFocal(focal, DEFAULT_FOCAL)}
          >
            <RotateCcw />
            Reset
          </Button>
        </div>
      </div>
      <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
        Drag the photo inside the frame. Scroll, pinch, or use the slider to zoom from 1× to 3×.
        At 1×, cover can only slide the axis that already overflows; zoom opens the other axis.
        Arrow keys nudge, and + or − zoom.
      </p>
      <pre className="max-w-sm overflow-x-auto rounded-md border bg-muted px-3 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
        {`/* saved: ${saved} */\n${css}`}
      </pre>
      <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
        Publish that CSS on a frame with this aspect ratio. x and y are the centre point, from 0 to 100, and are both object-position and transform-origin. zoom defaults to 1. Existing {"{x, y}"} values read as zoom 1. Field option aspect accepts 4/5 (default), 16/9, 1/1, or any width/height.
      </p>
    </div>
  );
};

export { FocalFrame };
