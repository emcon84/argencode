import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startRepl } from "../src/repl.ts";

const CLI = join(import.meta.dir, "..", "src", "cli.ts");
const workDir = mkdtempSync(join(tmpdir(), "argencode-"));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

function runCli(source: string) {
  const file = join(workDir, `programa-${crypto.randomUUID()}.arg`);
  writeFileSync(file, source);
  const result = Bun.spawnSync([process.execPath, CLI, file], { stdout: "pipe", stderr: "pipe" });
  return { code: result.exitCode, stdout: result.stdout.toString(), stderr: result.stderr.toString() };
}

describe("cli", () => {
  test("runs a .arg file", () => {
    const result = runCli('mostrar("¡Hola!")\n');
    expect(result).toEqual({ code: 0, stdout: "¡Hola!\n", stderr: "" });
  });

  test("prints errors to stderr and exits with code 1", () => {
    const result = runCli("mostrar(1)\nmostrar(x)\n");
    expect(result.code).toBe(1);
    expect(result.stdout).toBe("1\n");
    expect(result.stderr).toBe("Error en la línea 2: variable 'x' no definida\n");
  });
});

describe("repl", () => {
  async function session(...inputs: string[]) {
    let out = "";
    let err = "";
    async function* lines() {
      yield* inputs;
    }
    await startRepl({ lines: lines(), write: (t) => (out += t), writeError: (t) => (err += t) });
    return { out, err };
  }

  test("keeps state between inputs and echoes expression values", async () => {
    const { out } = await session("var x = 20", "x + 1");
    expect(out).toContain("> 21\n");
  });

  test("waits for open blocks to close before running", async () => {
    const { out } = await session("funcion doble(n) {", "devolver n * 2", "}", "doble(4)");
    expect(out).toContain("... ... > 8\n");
  });

  test("reports errors and keeps going", async () => {
    const { out, err } = await session("mostrar(nada)", "mostrar(1)");
    expect(err).toBe("Error en la línea 1: variable 'nada' no definida\n");
    expect(out).toContain("1\n");
  });
});
