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
