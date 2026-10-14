import { describe, expect, test } from "bun:test";
import { tokenize } from "../src/lexer/index.ts";
import { parse, type Expr, type Stmt } from "../src/parser/index.ts";

const program = (src: string) => parse(tokenize(src)).body;

function firstExpr(src: string): Expr {
  const [stmt] = program(src);
  if (stmt?.kind !== "ExprStmt") throw new Error(`expected ExprStmt, got ${stmt?.kind}`);
  return stmt.expression;
}

/** Renders an expression as a fully parenthesized string to assert precedence. */
function show(expr: Expr): string {
  switch (expr.kind) {
    case "NumberLiteral": return String(expr.value);
    case "StringLiteral": return JSON.stringify(expr.value);
    case "BooleanLiteral": return String(expr.value);
    case "NullLiteral": return "nulo";
    case "Identifier": return expr.name;
    case "Unary": return `(${expr.operator} ${show(expr.operand)})`;
    case "Binary":
    case "Logical": return `(${show(expr.left)} ${expr.operator} ${show(expr.right)})`;
    case "Assign": return `(${expr.name} = ${show(expr.value)})`;
    case "Call": return `${show(expr.callee)}(${expr.args.map(show).join(", ")})`;
    case "FunctionExpr": return `funcion(${expr.params.join(", ")})`;
  }
}

describe("parser", () => {
  test("respects arithmetic precedence and left associativity", () => {
    expect(show(firstExpr("1 + 2 * 3 - 4"))).toBe("((1 + (2 * 3)) - 4)");
    expect(show(firstExpr("10 - 4 - 3"))).toBe("((10 - 4) - 3)");
    expect(show(firstExpr("(1 + 2) * 3"))).toBe("((1 + 2) * 3)");
  });

  test("orders logical, equality and comparison operators", () => {
    expect(show(firstExpr("a o b y c == d < e"))).toBe("(a o (b y (c == (d < e))))");
  });

  test("parses unary operators tighter than binary ones", () => {
    expect(show(firstExpr("-a * b"))).toBe("((- a) * b)");
    expect(show(firstExpr("no a y b"))).toBe("((no a) y b)");
  });

  test("parses right-associative assignment", () => {
    expect(show(firstExpr("a = b = 3"))).toBe("(a = (b = 3))");
  });

  test("parses calls, including chained calls", () => {
    expect(show(firstExpr("f(1, g(2))(3)"))).toBe("f(1, g(2))(3)");
  });

  test("parses declarations and control flow", () => {
    const body = program(`
      var x = 1
      funcion doble(n) { devolver n * 2 }
      mientras x < 3 { x = x + 1 }
    `);
    expect(body.map((s) => s.kind)).toEqual(["VarDecl", "FunctionDecl", "While"]);
  });

  test("chains 'sino si' as a nested if", () => {
    const [stmt] = program("si a { x } sino si b { w } sino { z }");
    expect(stmt?.kind).toBe("If");
    const otherwise = (stmt as Extract<Stmt, { kind: "If" }>).otherwise;
    expect(otherwise?.[0]?.kind).toBe("If");
  });

  test("accepts 'sino' on the line after the closing brace", () => {
    const [stmt] = program("si a {\n  x\n}\nsino {\n  w\n}");
    expect((stmt as Extract<Stmt, { kind: "If" }>).otherwise).not.toBeNull();
  });

  test("accepts optional semicolons", () => {
    expect(program("var a = 1; var b = 2;").length).toBe(2);
  });

  test("reports a missing closing brace with its line", () => {
    expect(() => program("si x {\n  mostrar(1)\n")).toThrow("Error en la línea 3: falta '}' para cerrar el bloque");
  });

  test("rejects two statements on the same line", () => {
    expect(() => program("var a = 1 var b = 2")).toThrow(
      "Error en la línea 1: se esperaba fin de línea pero se encontró 'var'",
    );
  });

  test("rejects assignment to a non-variable", () => {
    expect(() => program("1 = 2")).toThrow("Error en la línea 1: solo se puede asignar a una variable");
  });
});

describe("readable syntax", () => {
  const declaration = <K extends Stmt["kind"]>(src: string, kind: K): Extract<Stmt, { kind: K }> => {
    const [stmt] = program(src);
    if (stmt?.kind !== kind) throw new Error(`expected ${kind}, got ${stmt?.kind}`);
    return stmt as Extract<Stmt, { kind: K }>;
  };

  test("accepts 'para' before the name of a variable, with either keyword", () => {
    expect(declaration("var para x = 1", "VarDecl").name).toBe("x");
    expect(declaration("variable para x = 1", "VarDecl").name).toBe("x");
    expect(declaration("variable x = 1", "VarDecl").name).toBe("x");
  });

  test("accepts 'para' before the name of a declared function, with either keyword", () => {
    expect(declaration("funcion para f() {}", "FunctionDecl").name).toBe("f");
    expect(declaration("función para f() {}", "FunctionDecl").name).toBe("f");
    expect(declaration("función f() {}", "FunctionDecl").name).toBe("f");
  });

  test("accepts 'recibe' before the first parameter or before each one", () => {
    expect(declaration("funcion f(recibe a, b) {}", "FunctionDecl").params).toEqual(["a", "b"]);
    expect(declaration("funcion f(recibe a, recibe b) {}", "FunctionDecl").params).toEqual(["a", "b"]);
    expect(declaration("funcion f(a, b) {}", "FunctionDecl").params).toEqual(["a", "b"]);
    expect(show(firstExpr("funcion(recibe n) { devuelve n }"))).toBe("funcion(n)");
  });

  test("parses 'devuelve' as a return statement", () => {
    const fn = declaration("funcion f() { devuelve 1 }", "FunctionDecl");
    expect(fn.body[0]?.kind).toBe("Return");
  });

  test("still parses anonymous functions", () => {
    expect(show(firstExpr("funcion() {}"))).toBe("funcion()");
    expect(show(firstExpr("función(x) {}"))).toBe("funcion(x)");
  });

  test("reports 'para' without a function name", () => {
    expect(() => program("funcion para (x) {}")).toThrow(
      "Error en la línea 1: se esperaba el nombre de la función después de 'para' (se encontró '(')",
    );
  });

  test("reports 'para' without a variable name", () => {
    expect(() => program("variable para = 1")).toThrow(
      "Error en la línea 1: se esperaba un nombre de variable después de 'para' (se encontró '=')",
    );
  });

  test("reports 'recibe' without a parameter", () => {
    expect(() => program("funcion f(recibe) {}")).toThrow(
      "Error en la línea 1: se esperaba el nombre de un parámetro después de 'recibe' (se encontró ')')",
    );
  });

  test("reports 'para' in an anonymous function", () => {
    expect(() => program("var f = funcion para g() {}")).toThrow(
      "Error en la línea 1: 'para' solo puede usarse antes del nombre de una función declarada",
    );
  });

  test("rejects filler words used as names", () => {
    expect(() => program("var recibe = 1")).toThrow(
      "Error en la línea 1: 'recibe' es una palabra reservada y no puede usarse como nombre",
    );
    expect(() => program("funcion f(recibe recibe) {}")).toThrow("'recibe' es una palabra reservada");
    expect(() => program("mostrar(para)")).toThrow("'para' es una palabra reservada");
  });
});

describe("assignment expressions", () => {
  test("parses assignment as the lowest-precedence operator", () => {
    expect(show(firstExpr("a = b o c"))).toBe("(a = (b o c))");
    expect(show(firstExpr("a = b + 1"))).toBe("(a = (b + 1))");
  });

  test("allows assignment inside other expressions", () => {
    expect(show(firstExpr("f(a = 1)"))).toBe("f((a = 1))");
    expect(show(firstExpr("(a = 1) + 2"))).toBe("((a = 1) + 2)");
  });

  test("keeps '==' as a comparison", () => {
    expect(show(firstExpr("a = b == c"))).toBe("(a = (b == c))");
  });

  test("reports a non-variable assignment target on its line", () => {
    expect(() => program("\na + b = 3")).toThrow("Error en la línea 2: solo se puede asignar a una variable");
    expect(() => program("f() = 3")).toThrow("Error en la línea 1: solo se puede asignar a una variable");
  });
});
