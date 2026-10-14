import { ArgencodeError, Interpreter, formatValue, runOn } from "./index.ts";
import { tokenize } from "./lexer/index.ts";

const EXIT_COMMAND = ".salir";

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

  io.write(`Argencode v0.1 — escriba ${EXIT_COMMAND} o presione Ctrl+D para salir.\n> `);
  for await (const line of io.lines) {
    if (buffer === "" && line.trim() === EXIT_COMMAND) break;
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
