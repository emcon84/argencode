import { ArgencodeError } from "../errors.ts";
import type { Value } from "./values.ts";

export function runtimeError(line: number, message: string): ArgencodeError {
  return new ArgencodeError("runtime", line, message);
}

/**
 * Control-flow signal used to unwind the call stack on `devolver`.
 * It is not an error and never reaches the user inside a function.
 */
export class ReturnSignal {
  constructor(
    readonly value: Value,
    readonly line: number,
  ) {}
}
