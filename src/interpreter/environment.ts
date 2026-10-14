import { runtimeError } from "./runtime-error.ts";
import type { Value } from "./values.ts";

/** Lexical scope: a variable table chained to its enclosing scope. */
export class Environment {
  private readonly values = new Map<string, Value>();

  constructor(readonly parent: Environment | null = null) {}

  /** Declares a variable in this scope. Redeclaring in the same scope overwrites it. */
  define(name: string, value: Value): void {
    this.values.set(name, value);
  }

  get(name: string, line: number): Value {
    const scope = this.resolve(name);
    if (scope === null) throw runtimeError(line, `variable '${name}' no definida`);
    return scope.values.get(name) as Value;
  }

  assign(name: string, value: Value, line: number): void {
    const scope = this.resolve(name);
    if (scope === null) {
      throw runtimeError(line, `variable '${name}' no definida (use 'var ${name} = ...' para declararla)`);
    }
    scope.values.set(name, value);
  }

  private resolve(name: string): Environment | null {
    for (let scope: Environment | null = this; scope !== null; scope = scope.parent) {
      if (scope.values.has(name)) return scope;
    }
    return null;
  }
}
