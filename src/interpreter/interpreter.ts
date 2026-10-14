import type { Expr, Program, Stmt } from "../parser/index.ts";
import { defineBuiltins, type OutputFn } from "./builtins.ts";
import { Environment } from "./environment.ts";
import { applyBinary, applyUnary } from "./operators.ts";
import { ReturnSignal, runtimeError } from "./runtime-error.ts";
import { isCallable, isTruthy, typeName, type Callable, type Value } from "./values.ts";

const MAX_CALL_DEPTH = 1000;

export interface InterpreterOptions {
  output?: OutputFn;
}

/** Tree-walking evaluator. Keeps its global scope between `execute` calls (useful for a REPL). */
export class Interpreter {
  readonly globals = new Environment();
  private callDepth = 0;

  constructor(options: InterpreterOptions = {}) {
    defineBuiltins(this.globals, options.output ?? ((line) => console.log(line)));
  }

  /** Runs a program and returns the value of its last expression statement (or nulo). */
  execute(program: Program): Value {
    let last: Value = null;
    try {
      for (const stmt of program.body) {
        last = this.executeStatement(stmt, this.globals);
      }
    } catch (signal) {
      if (signal instanceof ReturnSignal) {
        throw runtimeError(signal.line, "'devolver' solo se puede usar dentro de una función");
      }
      throw signal;
    }
    return last;
  }

  // ---- statements ----------------------------------------------------------

  /** Executes a statement; expression statements yield their value, others yield nulo. */
  private executeStatement(stmt: Stmt, env: Environment): Value {
    switch (stmt.kind) {
      case "ExprStmt":
        return this.evaluate(stmt.expression, env);
      case "VarDecl":
        env.define(stmt.name, stmt.initializer === null ? null : this.evaluate(stmt.initializer, env));
        return null;
      case "Block":
        this.executeBlock(stmt.body, new Environment(env));
        return null;
      case "If": {
        const branch = isTruthy(this.evaluate(stmt.condition, env)) ? stmt.then : stmt.otherwise;
        if (branch !== null) this.executeBlock(branch, new Environment(env));
        return null;
      }
      case "While":
        while (isTruthy(this.evaluate(stmt.condition, env))) {
          this.executeBlock(stmt.body, new Environment(env));
        }
        return null;
      case "FunctionDecl":
        env.define(stmt.name, {
          kind: "function",
          name: stmt.name,
          params: stmt.params,
          body: stmt.body,
          closure: env,
        });
        return null;
      case "Return":
        throw new ReturnSignal(stmt.value === null ? null : this.evaluate(stmt.value, env), stmt.line);
    }
  }

  private executeBlock(body: readonly Stmt[], env: Environment): void {
    for (const stmt of body) this.executeStatement(stmt, env);
  }

  // ---- expressions ---------------------------------------------------------

  private evaluate(expr: Expr, env: Environment): Value {
    switch (expr.kind) {
      case "NumberLiteral":
      case "StringLiteral":
      case "BooleanLiteral":
        return expr.value;
      case "NullLiteral":
        return null;
      case "Identifier":
        return env.get(expr.name, expr.line);
      case "Assign": {
        const value = this.evaluate(expr.value, env);
        env.assign(expr.name, value, expr.line);
        return value;
      }
      case "Unary":
        return applyUnary(expr.operator, this.evaluate(expr.operand, env), expr.line);
      case "Binary":
        return applyBinary(expr.operator, this.evaluate(expr.left, env), this.evaluate(expr.right, env), expr.line);
      case "Logical": {
        const left = this.evaluate(expr.left, env);
        const shortCircuits = expr.operator === "o" ? isTruthy(left) : !isTruthy(left);
        return shortCircuits ? left : this.evaluate(expr.right, env);
      }
      case "FunctionExpr":
        return { kind: "function", name: null, params: expr.params, body: expr.body, closure: env };
      case "Call": {
        const callee = this.evaluate(expr.callee, env);
        const args = expr.args.map((arg) => this.evaluate(arg, env));
        return this.call(callee, args, expr.line);
      }
    }
  }

  private call(callee: Value, args: Value[], line: number): Value {
    if (!isCallable(callee)) {
      throw runtimeError(line, `no se puede llamar a un valor de tipo ${typeName(callee)}`);
    }
    checkArity(callee, args.length, line);
    if (callee.kind === "native") return callee.call(args, line);

    if (this.callDepth >= MAX_CALL_DEPTH) {
      throw runtimeError(line, "demasiadas llamadas anidadas (¿recursión infinita?)");
    }
    const scope = new Environment(callee.closure);
    callee.params.forEach((param, i) => scope.define(param, args[i] ?? null));

    this.callDepth++;
    try {
      this.executeBlock(callee.body, scope);
      return null;
    } catch (signal) {
      if (signal instanceof ReturnSignal) return signal.value;
      throw signal;
    } finally {
      this.callDepth--;
    }
  }
}

function checkArity(callee: Callable, received: number, line: number): void {
  const expected = callee.kind === "native" ? callee.arity : callee.params.length;
  if (expected === null || expected === received) return;
  const name = callee.name ?? "anónima";
  const plural = expected === 1 ? "argumento" : "argumentos";
  throw runtimeError(line, `la función '${name}' espera ${expected} ${plural} pero recibió ${received}`);
}
