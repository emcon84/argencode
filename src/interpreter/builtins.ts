import type { Environment } from "./environment.ts";
import { formatValue, type NativeFunction } from "./values.ts";

/** Receives each line printed by the program, without a trailing newline. */
export type OutputFn = (line: string) => void;

export function defineBuiltins(globals: Environment, output: OutputFn): void {
  const mostrar: NativeFunction = {
    kind: "native",
    name: "mostrar",
    arity: null,
    call: (args) => {
      output(args.map(formatValue).join(" "));
      return null;
    },
  };
  globals.define(mostrar.name, mostrar);
}
