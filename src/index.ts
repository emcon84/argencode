import { Interpreter, type InterpreterOptions, type Value } from "./interpreter/index.ts";
import { tokenize } from "./lexer/index.ts";
import { parse } from "./parser/index.ts";

export { ArgencodeError } from "./errors.ts";
export { Interpreter, formatValue, type OutputFn, type Value } from "./interpreter/index.ts";

/** Lexes, parses and runs Argencode source on the given interpreter. */
export function runOn(interpreter: Interpreter, source: string): Value {
  return interpreter.execute(parse(tokenize(source)));
}

/** Convenience entry point: runs source on a fresh interpreter. */
export function run(source: string, options: InterpreterOptions = {}): Value {
  return runOn(new Interpreter(options), source);
}
