"use client";

import { focalToCss, parseFocal } from "./value";

const ViewComponent = ({ value }: { value: unknown }) => {
  const point = parseFocal(value);
  if (!point) return null;

  return (
    <span className="text-muted-foreground text-xs tabular-nums">
      {focalToCss(point)}
    </span>
  );
};

export { ViewComponent };
