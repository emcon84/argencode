#!/usr/bin/env bun
import { ArgencodeError, run } from "./index.ts";
import { startRepl } from "./repl.ts";

const USAGE = "Uso: argencode [archivo.arg]";

async function main(args: string[]): Promise<number> {
  const [path, ...rest] = args;
  if (path === "-h" || path === "--help" || rest.length > 0) {
    console.log(USAGE);
    return rest.length > 0 ? 1 : 0;
  }

  if (path === undefined) {
    await startRepl({
      lines: console,
      write: (text) => process.stdout.write(text),
      writeError: (text) => process.stderr.write(text),
    });
    return 0;
  }

  return runFile(path);
}

async function runFile(path: string): Promise<number> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    console.error(`No se pudo abrir el archivo '${path}'.`);
    return 1;
  }

  try {
    run(await file.text());
    return 0;
  } catch (error) {
    if (!(error instanceof ArgencodeError)) throw error;
    console.error(error.message);
    return 1;
  }
}

process.exitCode = await main(process.argv.slice(2));
