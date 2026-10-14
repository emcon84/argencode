import type { TokenType } from "../lexer/index.ts";
import type { BinaryOperator, LogicalOperator } from "./ast.ts";

export type InfixOperator =
  | { kind: "Logical"; operator: LogicalOperator }
  | { kind: "Binary"; operator: BinaryOperator };

interface InfixRule {
  readonly precedence: number;
  readonly op: InfixOperator;
}

/** Binding power for infix operators; higher binds tighter. All are left-associative. */
export const INFIX_RULES: Partial<Record<TokenType, InfixRule>> = {
  O: { precedence: 1, op: { kind: "Logical", operator: "o" } },
  Y: { precedence: 2, op: { kind: "Logical", operator: "y" } },
  EqualEqual: { precedence: 3, op: { kind: "Binary", operator: "==" } },
  BangEqual: { precedence: 3, op: { kind: "Binary", operator: "!=" } },
  Less: { precedence: 4, op: { kind: "Binary", operator: "<" } },
  LessEqual: { precedence: 4, op: { kind: "Binary", operator: "<=" } },
  Greater: { precedence: 4, op: { kind: "Binary", operator: ">" } },
  GreaterEqual: { precedence: 4, op: { kind: "Binary", operator: ">=" } },
  Plus: { precedence: 5, op: { kind: "Binary", operator: "+" } },
  Minus: { precedence: 5, op: { kind: "Binary", operator: "-" } },
  Star: { precedence: 6, op: { kind: "Binary", operator: "*" } },
  Slash: { precedence: 6, op: { kind: "Binary", operator: "/" } },
  Percent: { precedence: 6, op: { kind: "Binary", operator: "%" } },
};
