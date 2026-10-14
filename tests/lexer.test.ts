import { describe, expect, test } from "bun:test";
import { tokenize } from "../src/lexer/index.ts";
import { ArgencodeError } from "../src/errors.ts";

const types = (src: string) => tokenize(src).map((t) => t.type);

describe("lexer", () => {
  test("recognizes Spanish keywords", () => {
    expect(types("var si sino mientras funcion devolver verdadero falso nulo y o no")).toEqual([
      "Var", "Si", "Sino", "Mientras", "Funcion", "Devolver",
      "Verdadero", "Falso", "Nulo", "Y", "O", "No", "EOF",
    ]);
  });

  test("maps keyword synonyms to the same token types", () => {
    expect(types("variable devuelve función")).toEqual(["Var", "Devolver", "Funcion", "EOF"]);
  });

  test("keeps the original spelling of a synonym as its lexeme", () => {
    const [token] = tokenize("función");
    expect(token).toMatchObject({ type: "Funcion", lexeme: "función" });
  });

  test("recognizes 'función' written with a combining accent", () => {
    expect(types("función")).toEqual(["Funcion", "EOF"]);
  });

  test("reserves the filler words 'para' and 'recibe'", () => {
    expect(types("para recibe")).toEqual(["Para", "Recibe", "EOF"]);
  });

  test("reserves only 'es' from the comparisons in words", () => {
    expect(types("es igual a mayor menor que distinto de ejecutar")).toEqual([
      "Es", "Identifier", "Identifier", "Identifier", "Identifier",
      "Identifier", "Identifier", "Identifier", "Identifier", "EOF",
    ]);
  });

  test("does not treat words that merely contain a keyword as keywords", () => {
    expect(types("variables parar recibido")).toEqual(["Identifier", "Identifier", "Identifier", "EOF"]);
  });

  test("reads integer and decimal numbers", () => {
    const tokens = tokenize("42 3.14");
    expect(tokens[0]?.literal).toBe(42);
    expect(tokens[1]?.literal).toBe(3.14);
  });

  test("reads UTF-8 strings with escapes", () => {
    const [token] = tokenize('"¡Hola, ñandú! ¿Qué tal?\\n"');
    expect(token?.type).toBe("String");
    expect(token?.literal).toBe("¡Hola, ñandú! ¿Qué tal?\n");
  });

  test("allows Unicode letters in identifiers", () => {
    const [token] = tokenize("año_niño");
    expect(token).toMatchObject({ type: "Identifier", lexeme: "año_niño" });
  });

  test("reads one- and two-character operators", () => {
    expect(types("+ - * / % = == != < <= > >=")).toEqual([
      "Plus", "Minus", "Star", "Slash", "Percent", "Equal",
      "EqualEqual", "BangEqual", "Less", "LessEqual", "Greater", "GreaterEqual", "EOF",
    ]);
  });

  test("skips comments and tracks lines", () => {
    const tokens = tokenize("// comentario\nvar x // otro\nx");
    expect(tokens.map((t) => t.type)).toEqual(["Newline", "Var", "Identifier", "Newline", "Identifier", "EOF"]);
    expect(tokens[4]?.line).toBe(3);
  });

  test("reports an unterminated string with its line", () => {
    expect(() => tokenize('\n"abierta')).toThrow("Error en la línea 2: cadena sin cerrar");
  });

  test("reports unexpected characters", () => {
    try {
      tokenize("var x = @");
      throw new Error("should have failed");
    } catch (error) {
      expect(error).toBeInstanceOf(ArgencodeError);
      expect((error as ArgencodeError).message).toBe("Error en la línea 1: carácter inesperado '@'");
    }
  });
});
