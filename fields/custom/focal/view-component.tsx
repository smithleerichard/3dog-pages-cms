"use client";

import { formatFocal, parseFocal } from "./value";

const ViewComponent = ({ value }: { value: unknown }) => {
  const focal = parseFocal(value);
  if (!focal) return null;

  return (
    <span className="text-muted-foreground text-xs tabular-nums">
      {formatFocal(focal)}
    </span>
  );
};

export { ViewComponent };
