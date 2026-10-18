import { z } from "zod";
import { Field } from "@/types/field";
import { EditComponent } from "./edit-component";
import { ViewComponent } from "./view-component";
import { DEFAULT_FOCAL, parseFocal } from "./value";

const shape = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  zoom: z.number().min(1).max(3).default(1),
});

const schema = (field: Field) => {
  if (field.required) return shape;
  return z.union([z.null(), z.literal(""), shape]);
};

const read = (value: unknown) => parseFocal(value);

const write = (value: unknown) => parseFocal(value);

const defaultValue = DEFAULT_FOCAL;

const label = "Focal point";

export { label, schema, defaultValue, read, write, EditComponent, ViewComponent };
