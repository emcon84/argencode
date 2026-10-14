export type BinaryOperator = "+" | "-" | "*" | "/" | "%" | "==" | "!=" | "<" | "<=" | ">" | ">=";
export type LogicalOperator = "y" | "o";
export type UnaryOperator = "-" | "no";

export type Expr =
  | { kind: "NumberLiteral"; value: number; line: number }
  | { kind: "StringLiteral"; value: string; line: number }
  | { kind: "BooleanLiteral"; value: boolean; line: number }
  | { kind: "NullLiteral"; line: number }
  | { kind: "Identifier"; name: string; line: number }
  | { kind: "Unary"; operator: UnaryOperator; operand: Expr; line: number }
  | { kind: "Binary"; operator: BinaryOperator; left: Expr; right: Expr; line: number }
  | { kind: "Logical"; operator: LogicalOperator; left: Expr; right: Expr; line: number }
  | { kind: "Assign"; name: string; value: Expr; line: number }
  | { kind: "Call"; callee: Expr; args: Expr[]; line: number }
  | { kind: "FunctionExpr"; params: string[]; body: Stmt[]; line: number };

export type Stmt =
  | { kind: "VarDecl"; name: string; initializer: Expr | null; line: number }
  | { kind: "ExprStmt"; expression: Expr; line: number }
  | { kind: "Block"; body: Stmt[]; line: number }
  | { kind: "If"; condition: Expr; then: Stmt[]; otherwise: Stmt[] | null; line: number }
  | { kind: "While"; condition: Expr; body: Stmt[]; line: number }
  | { kind: "FunctionDecl"; name: string; params: string[]; body: Stmt[]; line: number }
  | { kind: "Return"; value: Expr | null; line: number };

export interface Program {
  kind: "Program";
  body: Stmt[];
}
