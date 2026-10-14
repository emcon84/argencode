import { ArgencodeError } from "../errors.ts";
import { KEYWORDS, isKeyword, type Token, type TokenType } from "./token.ts";

const IDENT_START = /[\p{L}_]/u;
const IDENT_PART = /[\p{L}\p{N}\p{M}_]/u;
const DIGIT = /[0-9]/;

const ESCAPES: Record<string, string> = {
  n: "\n",
  t: "\t",
  '"': '"',
  "\\": "\\",
};

/**
 * Converts Argencode source text into a flat list of tokens.
 * Iterates by Unicode code point so characters like ñ, ¡ and ¿ are handled safely.
 */
export function tokenize(source: string): Token[] {
  const chars = Array.from(source);
  const tokens: Token[] = [];
  let pos = 0;
  let line = 1;

  const peek = (offset = 0): string => chars[pos + offset] ?? "";
  const push = (type: TokenType, lexeme: string, literal?: number | string): void => {
    tokens.push(literal === undefined ? { type, lexeme, line } : { type, lexeme, literal, line });
  };
  const matchNext = (expected: string): boolean => {
    if (peek(1) !== expected) return false;
    pos++;
    return true;
  };

  while (pos < chars.length) {
    const ch = peek();

    if (ch === " " || ch === "\t" || ch === "\r") {
      pos++;
      continue;
    }
    if (ch === "\n") {
      push("Newline", "\n");
      line++;
      pos++;
      continue;
    }
    if (ch === "/" && peek(1) === "/") {
      while (pos < chars.length && peek() !== "\n") pos++;
      continue;
    }
    if (DIGIT.test(ch)) {
      pos = readNumber(chars, pos, line, push);
      continue;
    }
    if (ch === '"') {
      const result = readString(chars, pos, line);
      push("String", result.lexeme, result.value);
      line = result.line;
      pos = result.end;
      continue;
    }
    if (IDENT_START.test(ch)) {
      const start = pos;
      while (pos < chars.length && IDENT_PART.test(peek())) pos++;
      const word = chars.slice(start, pos).join("");
      push(isKeyword(word) ? KEYWORDS[word] : "Identifier", word);
      continue;
    }

    switch (ch) {
      case "+": push("Plus", ch); break;
      case "-": push("Minus", ch); break;
      case "*": push("Star", ch); break;
      case "/": push("Slash", ch); break;
      case "%": push("Percent", ch); break;
      case "(": push("LeftParen", ch); break;
      case ")": push("RightParen", ch); break;
      case "{": push("LeftBrace", ch); break;
      case "}": push("RightBrace", ch); break;
      case ",": push("Comma", ch); break;
      case ";": push("Semicolon", ch); break;
      case "=": matchNext("=") ? push("EqualEqual", "==") : push("Equal", "="); break;
      case "<": matchNext("=") ? push("LessEqual", "<=") : push("Less", "<"); break;
      case ">": matchNext("=") ? push("GreaterEqual", ">=") : push("Greater", ">"); break;
      case "!":
        if (matchNext("=")) {
          push("BangEqual", "!=");
          break;
        }
        throw new ArgencodeError("lexer", line, "carácter inesperado '!' (para negar, use 'no')");
      default:
        throw new ArgencodeError("lexer", line, `carácter inesperado '${ch}'`);
    }
    pos++;
  }

  tokens.push({ type: "EOF", lexeme: "", line });
  return tokens;
}

function readNumber(
  chars: string[],
  start: number,
  line: number,
  push: (type: TokenType, lexeme: string, literal?: number | string) => void,
): number {
  let pos = start;
  while (DIGIT.test(chars[pos] ?? "")) pos++;
  if (chars[pos] === "." && DIGIT.test(chars[pos + 1] ?? "")) {
    pos++;
    while (DIGIT.test(chars[pos] ?? "")) pos++;
  }
  if (IDENT_START.test(chars[pos] ?? "")) {
    throw new ArgencodeError("lexer", line, `número mal formado '${chars.slice(start, pos + 1).join("")}'`);
  }
  const lexeme = chars.slice(start, pos).join("");
  push("Number", lexeme, Number(lexeme));
  return pos;
}

function readString(
  chars: string[],
  start: number,
  startLine: number,
): { value: string; lexeme: string; end: number; line: number } {
  let pos = start + 1;
  let line = startLine;
  let value = "";

  while (pos < chars.length && chars[pos] !== '"') {
    const ch = chars[pos] ?? "";
    if (ch === "\n") line++;
    if (ch === "\\") {
      const next = chars[pos + 1] ?? "";
      const escaped = ESCAPES[next];
      if (escaped === undefined) {
        throw new ArgencodeError("lexer", line, `secuencia de escape no válida '\\${next}'`);
      }
      value += escaped;
      pos += 2;
      continue;
    }
    value += ch;
    pos++;
  }

  if (pos >= chars.length) {
    throw new ArgencodeError("lexer", startLine, "cadena sin cerrar");
  }
  return { value, lexeme: chars.slice(start, pos + 1).join(""), end: pos + 1, line };
}
