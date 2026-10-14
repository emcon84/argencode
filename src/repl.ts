import { ArgencodeError, Interpreter, formatValue, runOn } from "./index.ts";
import { tokenize } from "./lexer/index.ts";

const HELP_COMMAND = ".ayuda";
const EXIT_COMMAND = ".salir";

const BANNER = `Argencode v0.1 — escriba ${HELP_COMMAND} para ver la ayuda o ${EXIT_COMMAND} para salir.`;

const HELP_TEXT = `Ejecutar un archivo:
  bun run src/cli.ts archivo.arg
  argencode archivo.arg        (después de instalarlo con 'bun link')

Comandos de la consola:
  ${HELP_COMMAND}   muestra esta ayuda
  ${EXIT_COMMAND}   sale de la consola (también Ctrl+D)

Ejemplos:
  var nombre = "Che"
  mostrar("¡Hola, " + nombre + "!")
  si 10 es mayor que 5 mostrar("diez es más grande")
  funcion doble(n) { devolver n * 2 }
  doble(21)
`;

const FILE_HINT = "¿Quiso ejecutar un archivo? Salga de la consola y use: bun run src/cli.ts <archivo>";

const HELP_HINT = `Para ver la ayuda, escriba ${HELP_COMMAND}`;
const EXIT_HINT = `Para salir, escriba ${EXIT_COMMAND} o presione Ctrl+D`;
/** Bare words people often type expecting a command, and the hint shown for each. */
const COMMAND_HINTS = new Map([
  ["help", HELP_HINT],
  ["ayuda", HELP_HINT],
  ["exit", EXIT_HINT],
  ["salir", EXIT_HINT],
]);

export interface ReplIO {
  lines: AsyncIterable<string>;
  write: (text: string) => void;
  writeError: (text: string) => void;
}

/**
 * Interactive loop. Keeps one interpreter alive so variables persist between inputs,
 * and keeps reading lines while a `{` block is still open.
 */
export async function startRepl(io: ReplIO): Promise<void> {
  const interpreter = new Interpreter({ output: (line) => io.write(`${line}\n`) });
  let buffer = "";

  io.write(`${BANNER}\n> `);
  for await (const line of io.lines) {
    if (buffer === "") {
      const input = line.trim();
      if (input === EXIT_COMMAND) break;
      const reply = replyWithoutRunning(input, interpreter);
      if (reply !== null) {
        io.write(`${reply}\n> `);
        continue;
      }
    }
    buffer += `${line}\n`;

    if (hasOpenBlock(buffer)) {
      io.write("... ");
      continue;
    }

    try {
      const result = runOn(interpreter, buffer);
      if (result !== null) io.write(`${formatValue(result)}\n`);
    } catch (error) {
      if (!(error instanceof ArgencodeError)) throw error;
      io.writeError(`${error.message}\n`);
    }
    buffer = "";
    io.write("> ");
  }
  io.write("\n¡Chau!\n");
}

/** Answers console commands and common mistakes; returns null when the input should run as code. */
function replyWithoutRunning(input: string, interpreter: Interpreter): string | null {
  if (input === HELP_COMMAND) return HELP_TEXT.trimEnd();
  if (input.endsWith(".arg")) return FILE_HINT;
  const hint = COMMAND_HINTS.get(input);
  if (hint !== undefined && !interpreter.globals.has(input)) return hint;
  return null;
}

function hasOpenBlock(source: string): boolean {
  try {
    let depth = 0;
    for (const token of tokenize(source)) {
      if (token.type === "LeftBrace") depth++;
      if (token.type === "RightBrace") depth--;
    }
    return depth > 0;
  } catch {
    // Let the real run report lexer errors.
    return false;
  }
}
