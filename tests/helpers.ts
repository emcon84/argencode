import { run } from "../src/index.ts";

/** Runs a program and returns every line it printed. */
export function outputOf(source: string): string[] {
  const lines: string[] = [];
  run(source, { output: (line) => lines.push(line) });
  return lines;
}
