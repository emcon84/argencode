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

  test("greets with a banner that mentions .ayuda and .salir", async () => {
    const { out } = await session();
    expect(out.startsWith("Argencode v0.1 — escriba .ayuda para ver la ayuda o .salir para salir.\n> ")).toBe(true);
  });

  test(".ayuda explains how to run files, the console commands and some syntax", async () => {
    const { out, err } = await session(".ayuda");
    expect(err).toBe("");
    expect(out).toContain("bun run src/cli.ts archivo.arg");
    expect(out).toContain("argencode archivo.arg");
    expect(out).toContain(".ayuda");
    expect(out).toContain(".salir");
    expect(out).toContain('mostrar("¡Hola, " + nombre + "!")');
  });

  test(".salir ends the session", async () => {
    const { out } = await session(".salir", "mostrar(1)");
    expect(out).not.toContain("1\n");
    expect(out.endsWith("¡Chau!\n")).toBe(true);
  });

  test("suggests leaving the console when a file path is typed", async () => {
    const { out, err } = await session("ejemplos/hola.arg", "  fizzbuzz.arg  ");
    expect(err).toBe("");
    const hint = "¿Quiso ejecutar un archivo? Salga de la consola y use: bun run src/cli.ts <archivo>\n";
    expect(out.split(hint)).toHaveLength(3);
  });

  test("points to .ayuda and .salir when bare command words are typed", async () => {
    const { out, err } = await session("help", "ayuda", "exit", "salir");
    expect(err).toBe("");
    expect(out.match(/Para ver la ayuda, escriba \.ayuda\n/g)).toHaveLength(2);
    expect(out.match(/Para salir, escriba \.salir o presione Ctrl\+D\n/g)).toHaveLength(2);
  });

  test("evaluates bare command words normally when a variable has that name", async () => {
    const { out, err } = await session("var ayuda = 7", "ayuda", "var salir = 8", "salir");
    expect(err).toBe("");
    expect(out).toContain("> 7\n");
    expect(out).toContain("> 8\n");
    expect(out).not.toContain("Para ver la ayuda");
    expect(out).not.toContain("Para salir");
  });

  test("reports errors and keeps going", async () => {
    const { out, err } = await session("mostrar(nada)", "mostrar(1)");
    expect(err).toBe("Error en la línea 1: variable 'nada' no definida\n");
    expect(out).toContain("1\n");
  });
});
