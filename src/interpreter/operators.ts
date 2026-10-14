import type { BinaryOperator, UnaryOperator } from "../parser/index.ts";
import { runtimeError } from "./runtime-error.ts";
import { formatValue, isTruthy, typeName, type Value } from "./values.ts";

export function applyUnary(operator: UnaryOperator, operand: Value, line: number): Value {
  if (operator === "no") return !isTruthy(operand);
  if (typeof operand !== "number") {
    throw runtimeError(line, `el operador '-' necesita un número, pero recibió ${typeName(operand)}`);
  }
  return -operand;
}

export function applyBinary(operator: BinaryOperator, left: Value, right: Value, line: number): Value {
  switch (operator) {
    case "==": return left === right;
    case "!=": return left !== right;
    case "+": return add(left, right, line);
    case "<":
    case "<=":
    case ">":
    case ">=":
      return compare(operator, left, right, line);
    default:
      return arithmetic(operator, left, right, line);
  }
}

function add(left: Value, right: Value, line: number): Value {
  if (typeof left === "number" && typeof right === "number") return left + right;
  if (typeof left === "string" || typeof right === "string") {
    return formatValue(left) + formatValue(right);
  }
  throw invalidOperands("+", left, right, line);
}

function compare(operator: "<" | "<=" | ">" | ">=", left: Value, right: Value, line: number): boolean {
  const comparable =
    (typeof left === "number" && typeof right === "number") ||
    (typeof left === "string" && typeof right === "string");
  if (!comparable) throw invalidOperands(operator, left, right, line);

  const a = left as number | string;
  const b = right as number | string;
  switch (operator) {
    case "<": return a < b;
    case "<=": return a <= b;
    case ">": return a > b;
    case ">=": return a >= b;
  }
}

function arithmetic(operator: "-" | "*" | "/" | "%", left: Value, right: Value, line: number): number {
  if (typeof left !== "number" || typeof right !== "number") {
    throw invalidOperands(operator, left, right, line);
  }
  if ((operator === "/" || operator === "%") && right === 0) {
    throw runtimeError(line, "división por cero");
  }
  switch (operator) {
    case "-": return left - right;
    case "*": return left * right;
    case "/": return left / right;
    case "%": return left % right;
  }
}

function invalidOperands(operator: string, left: Value, right: Value, line: number) {
  return runtimeError(
    line,
    `no se puede aplicar '${operator}' entre ${typeName(left)} y ${typeName(right)}`,
  );
}
