"use client";

import { useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/contexts/repo-context";
import { getRawUrl } from "@/lib/github-image";
import { cn } from "@/lib/utils";
import { focalToCss, parseFocal, type FocalPoint } from "./value";

type EditorProps = {
  value?: unknown;
  field: {
    name?: string;
    readonly?: boolean | null;
    options?: Record<string, unknown> | null;
  };
  name?: string;
  onChange: (value: FocalPoint) => void;
};

const imagePathFrom = (value: unknown) => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === "string" && item.trim());
    return typeof first === "string" ? first.trim() : null;
  }
  return null;
};

const siblingName = (fieldName: string | undefined, imageField: string) => {
  if (!fieldName) return imageField;
  const separator = fieldName.lastIndexOf(".");
  if (separator === -1) return imageField;
  return `${fieldName.slice(0, separator)}.${imageField}`;
};

const EditComponent = ({ value, field, name, onChange }: EditorProps) => {
  const point = parseFocal(value) ?? { x: 50, y: 50 };
  const isReadonly = Boolean(field.readonly);
  const imageField = typeof field.options?.image === "string" && field.options.image.trim()
    ? field.options.image.trim()
    : "src";
  const { getValues } = useFormContext();
  const watchedImage = useWatch({ name: siblingName(name, imageField) });
  const imagePath = imagePathFrom(watchedImage) ?? imagePathFrom(getValues(siblingName(name, imageField)));

  const { config } = useConfig();
  const { owner, repo, isPrivate } = useRepo();
  const branch = config?.branch;
  const mediaName = (typeof field.options?.media === "string" && field.options.media)
    || config?.object?.media?.[0]?.name
    || "";

  const [rawUrl, setRawUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!imagePath || !branch || !mediaName) {
      setRawUrl(null);
      return;
    }

    getRawUrl(owner, repo, branch, mediaName, imagePath, isPrivate)
      .then((url) => {
        if (!cancelled) setRawUrl(url ?? null);
      })
      .catch(() => {
        if (!cancelled) setRawUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [branch, imagePath, isPrivate, mediaName, owner, repo]);

  const setPoint = (next: FocalPoint) => {
    if (isReadonly) return;
    const parsed = parseFocal(next);
    if (parsed) onChange(parsed);
  };

  const setFromPointer = (event: React.PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    setPoint({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        className={cn(
          "relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-md border bg-muted",
          isReadonly ? "cursor-default" : "cursor-crosshair",
        )}
        onPointerDown={setFromPointer}
        disabled={isReadonly}
        aria-label="Set focal point"
      >
        {rawUrl ? (
          <img
            src={rawUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: focalToCss(point) }}
            draggable={false}
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-muted-foreground">
            {imagePath ? "Loading image…" : `Choose the ${imageField} image to preview the crop.`}
          </span>
        )}
        <span
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black/70 shadow"
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        />
      </button>
      <div className="grid max-w-sm grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Horizontal
          <Input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={point.x}
            readOnly={isReadonly}
            onChange={(event) => setPoint({ ...point, x: Number(event.target.value) })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Vertical
          <Input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={point.y}
            readOnly={isReadonly}
            onChange={(event) => setPoint({ ...point, y: Number(event.target.value) })}
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        object-position: {focalToCss(point)}
      </p>
    </div>
  );
};

export { EditComponent };
