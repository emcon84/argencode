import { ArgencodeError } from "../errors.ts";
import type { Token, TokenType } from "../lexer/index.ts";
import type { Expr, Program, Stmt } from "./ast.ts";
import { INFIX_RULES } from "./precedence.ts";

const TOKEN_NAMES: Partial<Record<TokenType, string>> = {
  LeftParen: "'('",
  RightParen: "')'",
  LeftBrace: "'{'",
  RightBrace: "'}'",
  Comma: "','",
  Equal: "'='",
  Identifier: "un nombre",
  Newline: "fin de línea",
  EOF: "fin del archivo",
};

function reservedWordMessage(token: Token): string {
  return `'${token.lexeme}' es una palabra reservada y no puede usarse como nombre`;
}

function describe(token: Token): string {
  if (token.type === "Newline" || token.type === "EOF") return TOKEN_NAMES[token.type] ?? token.type;
  return `'${token.lexeme}'`;
}

/** Recursive-descent parser with precedence climbing for expressions. */
export class Parser {
  private pos = 0;

  constructor(private readonly tokens: Token[]) {}

  parseProgram(): Program {
    const body: Stmt[] = [];
    this.skipSeparators();
    while (!this.check("EOF")) {
      body.push(this.statement());
      this.endStatement();
      this.skipSeparators();
    }
    return { kind: "Program", body };
  }

  // ---- statements ----------------------------------------------------------

  private statement(): Stmt {
    const token = this.peek();
    switch (token.type) {
      case "Var": return this.varDeclaration();
      case "Si": return this.ifStatement();
      case "Mientras": return this.whileStatement();
      case "Devolver": return this.returnStatement();
      case "LeftBrace": return { kind: "Block", body: this.block(), line: token.line };
      case "Funcion": {
        const next = this.peekAt(1).type;
        if (next === "Identifier" || next === "Para") return this.functionDeclaration();
        break;
      }
    }
    const expression = this.expression();
    return { kind: "ExprStmt", expression, line: token.line };
  }

  private varDeclaration(): Stmt {
    const keyword = this.advance();
    const line = keyword.line;
    const before = this.matchFiller("Para") ?? keyword;
    const name = this.consumeName(`se esperaba un nombre de variable después de '${before.lexeme}'`);
    const initializer = this.match("Equal") ? this.expression() : null;
    return { kind: "VarDecl", name, initializer, line };
  }

  private ifStatement(): Stmt {
    const line = this.advance().line;
    const condition = this.expression();
    const then = this.block();
    let otherwise: Stmt[] | null = null;

    if (this.matchAfterNewlines("Sino")) {
      if (this.check("Si")) {
        otherwise = [this.ifStatement()];
      } else {
        otherwise = this.block();
      }
    }
    return { kind: "If", condition, then, otherwise, line };
  }

  private whileStatement(): Stmt {
    const line = this.advance().line;
    const condition = this.expression();
    const body = this.block();
    return { kind: "While", condition, body, line };
  }

  private returnStatement(): Stmt {
    const line = this.advance().line;
    const value = this.atStatementEnd() ? null : this.expression();
    return { kind: "Return", value, line };
  }

  private functionDeclaration(): Stmt {
    const keyword = this.advance();
    const line = keyword.line;
    const before = this.matchFiller("Para") ?? keyword;
    const name = this.consumeName(`se esperaba el nombre de la función después de '${before.lexeme}'`);
    const params = this.parameters();
    const body = this.block();
    return { kind: "FunctionDecl", name, params, body, line };
  }

  private parameters(): string[] {
    this.consume("LeftParen", "se esperaba '(' para abrir los parámetros");
    const params: string[] = [];
    this.skipNewlines();
    if (!this.check("RightParen")) {
      do {
        this.skipNewlines();
        const filler = this.matchFiller("Recibe");
        const param = this.consumeName(
          filler === undefined
            ? "se esperaba el nombre de un parámetro"
            : "se esperaba el nombre de un parámetro después de 'recibe'",
        );
        if (params.includes(param)) {
          this.fail(this.previous(), `parámetro '${param}' repetido`);
        }
        params.push(param);
        this.skipNewlines();
      } while (this.match("Comma"));
    }
    this.consume("RightParen", "se esperaba ')' para cerrar los parámetros");
    return params;
  }

  private block(): Stmt[] {
    this.consume("LeftBrace", "se esperaba '{' para abrir el bloque");
    const body: Stmt[] = [];
    this.skipSeparators();
    while (!this.check("RightBrace")) {
      if (this.check("EOF")) this.fail(this.peek(), "falta '}' para cerrar el bloque");
      body.push(this.statement());
      this.endStatement();
      this.skipSeparators();
    }
    this.advance();
    return body;
  }

  /** A statement must be followed by a newline, ';', '}' or end of file. */
  private endStatement(): void {
    if (this.atStatementEnd()) return;
    this.fail(this.peek(), `se esperaba fin de línea pero se encontró ${describe(this.peek())}`);
  }

  private atStatementEnd(): boolean {
    const type = this.peek().type;
    return type === "Newline" || type === "Semicolon" || type === "RightBrace" || type === "EOF";
  }

  // ---- expressions ---------------------------------------------------------

  private expression(): Expr {
    return this.assignment();
  }

  private assignment(): Expr {
    const target = this.binary(1);
    if (!this.check("Equal")) return target;

    const equals = this.advance();
    if (target.kind !== "Identifier") {
      this.fail(equals, "solo se puede asignar a una variable");
    }
    this.skipNewlines();
    const value = this.assignment();
    return { kind: "Assign", name: target.name, value, line: target.line };
  }

  private binary(minPrecedence: number): Expr {
    let left = this.unary();
    for (;;) {
      const rule = INFIX_RULES[this.peek().type];
      if (rule === undefined || rule.precedence < minPrecedence) return left;
      const operatorToken = this.advance();
      this.skipNewlines();
      const right = this.binary(rule.precedence + 1);
      const line = operatorToken.line;
      left =
        rule.op.kind === "Logical"
          ? { kind: "Logical", operator: rule.op.operator, left, right, line }
          : { kind: "Binary", operator: rule.op.operator, left, right, line };
    }
  }

  /** Unary operators bind tighter than every infix operator. */
  private unary(): Expr {
    const token = this.peek();
    if (token.type === "Minus" || token.type === "No") {
      this.advance();
      const operand = this.unary();
      return { kind: "Unary", operator: token.type === "Minus" ? "-" : "no", operand, line: token.line };
    }
    return this.call();
  }

  private call(): Expr {
    let expr = this.primary();
    while (this.check("LeftParen")) {
      const paren = this.advance();
      const args: Expr[] = [];
      this.skipNewlines();
      if (!this.check("RightParen")) {
        do {
          this.skipNewlines();
          args.push(this.expression());
          this.skipNewlines();
        } while (this.match("Comma"));
      }
      this.consume("RightParen", "se esperaba ')' después de los argumentos");
      expr = { kind: "Call", callee: expr, args, line: paren.line };
    }
    return expr;
  }

  private primary(): Expr {
    const token = this.advance();
    switch (token.type) {
      case "Number": return { kind: "NumberLiteral", value: token.literal as number, line: token.line };
      case "String": return { kind: "StringLiteral", value: token.literal as string, line: token.line };
      case "Verdadero": return { kind: "BooleanLiteral", value: true, line: token.line };
      case "Falso": return { kind: "BooleanLiteral", value: false, line: token.line };
      case "Nulo": return { kind: "NullLiteral", line: token.line };
      case "Identifier": return { kind: "Identifier", name: token.lexeme, line: token.line };
      case "Funcion": {
        if (this.check("Para")) {
          this.fail(this.peek(), "'para' solo puede usarse antes del nombre de una función declarada");
        }
        const params = this.parameters();
        const body = this.block();
        return { kind: "FunctionExpr", params, body, line: token.line };
      }
      case "LeftParen": {
        this.skipNewlines();
        const inner = this.expression();
        this.skipNewlines();
        this.consume("RightParen", "se esperaba ')' para cerrar la expresión");
        return inner;
      }
      case "Para":
      case "Recibe":
        return this.fail(token, reservedWordMessage(token));
      default:
        return this.fail(token, `expresión inesperada: ${describe(token)}`);
    }
  }

  // ---- token helpers -------------------------------------------------------

  private peek(): Token {
    return this.peekAt(0);
  }

  private peekAt(offset: number): Token {
    const index = Math.min(this.pos + offset, this.tokens.length - 1);
    const token = this.tokens[index];
    if (token === undefined) throw new Error("token stream must end with EOF");
    return token;
  }

  private previous(): Token {
    return this.tokens[this.pos - 1] ?? this.peek();
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private advance(): Token {
    const token = this.peek();
    if (token.type !== "EOF") this.pos++;
    return token;
  }

  private match(type: TokenType): boolean {
    if (!this.check(type)) return false;
    this.advance();
    return true;
  }

  /** Matches `type` even if it appears after blank lines; otherwise leaves the position unchanged. */
  private matchAfterNewlines(type: TokenType): boolean {
    let offset = 0;
    while (this.peekAt(offset).type === "Newline") offset++;
    if (this.peekAt(offset).type !== type) return false;
    this.pos += offset + 1;
    return true;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    return this.fail(this.peek(), `${message} (se encontró ${describe(this.peek())})`);
  }

  /** Consumes an optional filler keyword, returning it when present. */
  private matchFiller(type: "Para" | "Recibe"): Token | undefined {
    return this.check(type) ? this.advance() : undefined;
  }

  /** Consumes an identifier used as a name, explaining when a filler word was used instead. */
  private consumeName(message: string): string {
    const token = this.peek();
    if (token.type === "Para" || token.type === "Recibe") this.fail(token, reservedWordMessage(token));
    return this.consume("Identifier", message).lexeme;
  }

  private skipNewlines(): void {
    while (this.check("Newline")) this.advance();
  }

  private skipSeparators(): void {
    while (this.check("Newline") || this.check("Semicolon")) this.advance();
  }

  private fail(token: Token, message: string): never {
    throw new ArgencodeError("parser", token.line, message);
  }
}

export function parse(tokens: Token[]): Program {
  return new Parser(tokens).parseProgram();
}
