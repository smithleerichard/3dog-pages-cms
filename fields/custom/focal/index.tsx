import { z } from "zod";
import { Field } from "@/types/field";
import { EditComponent } from "./edit-component";
import { ViewComponent } from "./view-component";
import { parseFocal } from "./value";

const schema = (_field: Field) =>
  z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  });

const read = (value: unknown) => parseFocal(value);

const write = (value: unknown) => parseFocal(value);

const defaultValue = { x: 50, y: 50 };

const label = "Focal point";

export { label, schema, defaultValue, read, write, EditComponent, ViewComponent };
