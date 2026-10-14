export const KEYWORDS = {
  var: "Var",
  si: "Si",
  sino: "Sino",
  mientras: "Mientras",
  funcion: "Funcion",
  devolver: "Devolver",
  verdadero: "Verdadero",
  falso: "Falso",
  nulo: "Nulo",
  y: "Y",
  o: "O",
  no: "No",
} as const;

export type KeywordType = (typeof KEYWORDS)[keyof typeof KEYWORDS];

export type TokenType =
  | KeywordType
  | "Number"
  | "String"
  | "Identifier"
  | "Plus"
  | "Minus"
  | "Star"
  | "Slash"
  | "Percent"
  | "Equal"
  | "EqualEqual"
  | "BangEqual"
  | "Less"
  | "LessEqual"
  | "Greater"
  | "GreaterEqual"
  | "LeftParen"
  | "RightParen"
  | "LeftBrace"
  | "RightBrace"
  | "Comma"
  | "Semicolon"
  | "Newline"
  | "EOF";

export interface Token {
  readonly type: TokenType;
  /** Raw source text of the token. */
  readonly lexeme: string;
  /** Decoded literal value for numbers and strings. */
  readonly literal?: number | string;
  readonly line: number;
}

export function isKeyword(word: string): word is keyof typeof KEYWORDS {
  return Object.hasOwn(KEYWORDS, word);
}
