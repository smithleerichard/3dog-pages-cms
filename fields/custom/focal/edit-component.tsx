"use client";

import { useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useConfig } from "@/contexts/config-context";
import { useRepo } from "@/contexts/repo-context";
import { getRawUrl } from "@/lib/github-image";
import { FocalFrame } from "./frame";
import { parseAspect, type FocalPoint } from "./value";

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
  const aspect = parseAspect(field.options?.aspect);
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

  return (
    <FocalFrame
      value={value}
      onChange={onChange}
      aspect={aspect}
      src={rawUrl}
      readonly={Boolean(field.readonly)}
      emptyLabel={imagePath ? "Loading image…" : `Choose the ${imageField} image to preview the frame.`}
    />
  );
};

export { EditComponent };
