import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { outputOf } from "./helpers.ts";

const dir = join(import.meta.dir, "..", "ejemplos");
const read = (name: string) => Bun.file(join(dir, name)).text();

describe("ejemplos", () => {
  test("hola.arg", async () => {
    expect(outputOf(await read("hola.arg"))).toEqual(["¡Hola, Che!", "5", "0", "1", "2"]);
  });

  test("fibonacci.arg", async () => {
    const lines = outputOf(await read("fibonacci.arg"));
    expect(lines).toHaveLength(11);
    expect(lines.at(-1)).toBe("fibonacci(10) = 55");
  });

  test("contador.arg", async () => {
    expect(outputOf(await read("contador.arg"))).toEqual(["Primer contador: 3", "Segundo contador: 101", "18"]);
  });

  test("legible.arg", async () => {
    expect(outputOf(await read("legible.arg"))).toEqual(["1", "2", "1"]);
  });

  test("fizzbuzz.arg", async () => {
    const lines = outputOf(await read("fizzbuzz.arg"));
    expect(lines.slice(0, 5)).toEqual(["1", "2", "Fizz", "4", "Buzz"]);
    expect(lines.at(-1)).toBe("FizzBuzz");
  });

  test("fizzbuzz-legible.arg", async () => {
    expect(outputOf(await read("fizzbuzz-legible.arg"))).toEqual(
      "1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz".split(" "),
    );
  });
});
