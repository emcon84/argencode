/** Phase in which an Argencode error was raised. */
export type ErrorPhase = "lexer" | "parser" | "runtime";

/**
 * Base error for every Argencode failure. The message shown to users is
 * always prefixed with the source line, in neutral Spanish.
 */
export class ArgencodeError extends Error {
  readonly phase: ErrorPhase;
  readonly line: number;
  readonly detail: string;

  constructor(phase: ErrorPhase, line: number, detail: string) {
    super(`Error en la línea ${line}: ${detail}`);
    this.name = "ArgencodeError";
    this.phase = phase;
    this.line = line;
    this.detail = detail;
  }
}
