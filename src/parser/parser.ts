import { ArgencodeError } from "../errors.ts";
import type { Token, TokenType } from "../lexer/index.ts";
import type { Expr, Program, Stmt } from "./ast.ts";
import { INFIX_RULES, type InfixRule } from "./precedence.ts";

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

type ComparisonToken = "EqualEqual" | "BangEqual" | "Less" | "LessEqual" | "Greater" | "GreaterEqual";

/** `mayor`/`menor` with the strict operator and the `o igual` variant they produce. */
const ORDER_WORDS: ReadonlyArray<readonly [string, ComparisonToken, ComparisonToken]> = [
  ["mayor", "Greater", "GreaterEqual"],
  ["menor", "Less", "LessEqual"],
];

/** Word comparisons reuse the symbol rule so both spellings share precedence and AST. */
function comparisonRule(type: ComparisonToken): InfixRule {
  const rule = INFIX_RULES[type];
  if (rule === undefined) throw new Error(`missing infix rule for ${type}`);
  return rule;
}

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
    const keyword = this.advance();
    const condition = this.expression();
    const then = this.branchBody(keyword);
    let otherwise: Stmt[] | null = null;

    // `sino` may start on a later line, or after the ';' that ends a single-statement body.
    const sino = this.matchAfterSeparators("Sino");
    if (sino !== undefined) {
      otherwise = this.check("Si") ? [this.ifStatement()] : this.branchBody(sino);
    }
    return { kind: "If", condition, then, otherwise, line: keyword.line };
  }

  /** Body of `si` or `sino`: a block, or a single statement on the same line. */
  private branchBody(keyword: Token): Stmt[] {
    this.matchEjecutar();
    if (this.check("LeftBrace")) return this.block();
    if (this.atStatementEnd()) {
      const found = describe(this.peek());
      this.fail(this.peek(), `se esperaba '{' o una sentencia después de '${keyword.lexeme}' (se encontró ${found})`);
    }
    return [this.statement()];
  }

  private whileStatement(): Stmt {
    const line = this.advance().line;
    const condition = this.expression();
    this.matchEjecutar();
    const body = this.block();
    return { kind: "While", condition, body, line };
  }

  /** Skips the optional word `ejecutar` before a block; elsewhere it is an ordinary name. */
  private matchEjecutar(): void {
    if (this.checkWord("ejecutar") && this.peekAt(1).type === "LeftBrace") this.advance();
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
      const start = this.pos;
      const operatorToken = this.peek();
      const rule = this.infixOperator();
      if (rule === undefined || rule.precedence < minPrecedence) {
        this.pos = start;
        return left;
      }
      const inWords = operatorToken.type === "Es" || operatorToken.type === "No";
      if (inWords && this.atStatementEnd()) {
        const phrase = this.tokens.slice(start, this.pos).map((t) => t.lexeme).join(" ");
        this.fail(this.peek(), `se esperaba un valor después de '${phrase}'`);
      }
      this.skipNewlines();
      const right = this.binary(rule.precedence + 1);
      const line = operatorToken.line;
      left =
        rule.op.kind === "Logical"
          ? { kind: "Logical", operator: rule.op.operator, left, right, line }
          : { kind: "Binary", operator: rule.op.operator, left, right, line };
    }
  }

  /** Consumes the next infix operator, written as a symbol or in words, and returns its rule. */
  private infixOperator(): InfixRule | undefined {
    const token = this.peek();
    if (token.type === "Es") return this.wordComparison(false);
    if (token.type === "No" && this.peekAt(1).type === "Es") return this.wordComparison(true);
    const rule = INFIX_RULES[token.type];
    if (rule !== undefined) this.advance();
    return rule;
  }

  /**
   * Reads a comparison written in words and returns the rule of its symbol equivalent:
   * `es igual a` (==), `no es igual a` / `es distinto de` (!=), `es mayor que` (>),
   * `es menor que` (<), `es mayor o igual a|que` (>=), `es menor o igual a|que` (<=).
   * Only `es` is reserved; the other words are recognized here and stay valid names elsewhere.
   */
  private wordComparison(negated: boolean): InfixRule {
    if (negated) this.advance();
    const es = this.advance();
    const phrase = negated ? "no es" : "es";

    if (negated) {
      this.expectWord("igual", `se esperaba 'igual' después de '${phrase}'`);
      this.matchWord("a");
      return comparisonRule("BangEqual");
    }
    if (this.matchWord("igual")) {
      this.matchWord("a");
      return comparisonRule("EqualEqual");
    }
    if (this.matchWord("distinto")) {
      this.matchWord("de");
      return comparisonRule("BangEqual");
    }
    for (const [word, strict, orEqual] of ORDER_WORDS) {
      if (!this.matchWord(word)) continue;
      if (this.match("O")) {
        this.expectWord("igual", `se esperaba 'igual' después de '${word} o'`);
        if (!this.matchWord("a")) this.matchWord("que");
        return comparisonRule(orEqual);
      }
      this.matchWord("que");
      return comparisonRule(strict);
    }
    return this.fail(
      this.peek(),
      `se esperaba 'igual', 'mayor', 'menor' o 'distinto' después de '${es.lexeme}' (se encontró ${describe(this.peek())})`,
    );
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
      case "Es":
        return this.fail(token, "'es' debe ir entre dos valores, por ejemplo: x es igual a 1");
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

  /**
   * Matches `type` even if it appears after newlines or ';', returning the matched token.
   * Otherwise leaves the position unchanged, so the following statement is not swallowed.
   */
  private matchAfterSeparators(type: TokenType): Token | undefined {
    let offset = 0;
    while (this.peekAt(offset).type === "Newline" || this.peekAt(offset).type === "Semicolon") offset++;
    if (this.peekAt(offset).type !== type) return undefined;
    this.pos += offset;
    return this.advance();
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    return this.fail(this.peek(), `${message} (se encontró ${describe(this.peek())})`);
  }

  /** True when the current token is the identifier `word`, used as a contextual keyword. */
  private checkWord(word: string, offset = 0): boolean {
    const token = this.peekAt(offset);
    return token.type === "Identifier" && token.lexeme.normalize("NFC") === word;
  }

  private matchWord(word: string): boolean {
    if (!this.checkWord(word)) return false;
    this.advance();
    return true;
  }

  private expectWord(word: string, message: string): void {
    if (!this.matchWord(word)) this.fail(this.peek(), `${message} (se encontró ${describe(this.peek())})`);
  }

  /** Consumes an optional filler keyword, returning it when present. */
  private matchFiller(type: "Para" | "Recibe"): Token | undefined {
    return this.check(type) ? this.advance() : undefined;
  }

  /** Consumes an identifier used as a name, explaining when a filler word was used instead. */
  private consumeName(message: string): string {
    const token = this.peek();
    if (token.type === "Para" || token.type === "Recibe" || token.type === "Es") {
      this.fail(token, reservedWordMessage(token));
    }
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
