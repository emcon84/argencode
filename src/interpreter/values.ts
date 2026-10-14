import type { Stmt } from "../parser/index.ts";
import type { Environment } from "./environment.ts";

/** A function defined in Argencode source; captures its defining environment. */
export interface UserFunction {
  readonly kind: "function";
  readonly name: string | null;
  readonly params: readonly string[];
  readonly body: readonly Stmt[];
  readonly closure: Environment;
}

/** A function implemented in TypeScript and exposed to Argencode programs. */
export interface NativeFunction {
  readonly kind: "native";
  readonly name: string;
  /** Expected argument count, or null for variadic functions. */
  readonly arity: number | null;
  readonly call: (args: Value[], line: number) => Value;
}

export type Callable = UserFunction | NativeFunction;
export type Value = number | string | boolean | null | Callable;

export function isCallable(value: Value): value is Callable {
  return typeof value === "object" && value !== null;
}

/** Only `falso` and `nulo` are falsy; every other value is truthy. */
export function isTruthy(value: Value): boolean {
  return value !== false && value !== null;
}

export function typeName(value: Value): string {
  if (value === null) return "nulo";
  switch (typeof value) {
    case "number": return "número";
    case "string": return "texto";
    case "boolean": return "booleano";
    default: return "función";
  }
}

/** Renders a value the way `mostrar` prints it. */
export function formatValue(value: Value): string {
  if (value === null) return "nulo";
  switch (typeof value) {
    case "boolean": return value ? "verdadero" : "falso";
    case "number": return Object.is(value, -0) ? "0" : String(value);
    case "string": return value;
    default:
      if (value.kind === "native") return `<funcion nativa ${value.name}>`;
      return value.name === null ? "<funcion anónima>" : `<funcion ${value.name}>`;
  }
}
