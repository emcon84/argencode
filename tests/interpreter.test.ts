import { describe, expect, test } from "bun:test";
import { outputOf } from "./helpers.ts";

describe("interpreter", () => {
  test("runs the reference program", () => {
    const source = `
var nombre = "Che"
si nombre == "Che" {
  mostrar("¡Hola, " + nombre + "!")
} sino {
  mostrar("¿Quién sos?")
}

funcion sumar(a, b) {
  devolver a + b
}
mostrar(sumar(2, 3))

var i = 0
mientras i < 3 {
  mostrar(i)
  i = i + 1
}
`;
    expect(outputOf(source)).toEqual(["¡Hola, Che!", "5", "0", "1", "2"]);
  });

  test("prints every value type in Spanish", () => {
    expect(outputOf("mostrar(verdadero, falso, nulo, 1.5, \"texto\")")).toEqual(["verdadero falso nulo 1.5 texto"]);
    expect(outputOf("funcion f() {}\nmostrar(f)")).toEqual(["<funcion f>"]);
  });

  test("evaluates arithmetic with precedence and float semantics", () => {
    expect(outputOf("mostrar(1 + 2 * 3, 7 / 2, 7 % 3, -(2 + 3))")).toEqual(["7 3.5 1 -5"]);
  });

  test("concatenates strings with numbers and booleans", () => {
    expect(outputOf('mostrar("n = " + 4, 2 + "!", "v: " + verdadero)')).toEqual(["n = 4 2! v: verdadero"]);
  });

  test("compares numbers and strings", () => {
    expect(outputOf('mostrar(1 < 2, 2 <= 1, "a" < "b", 3 == 3, "a" != "a")')).toEqual([
      "verdadero falso verdadero verdadero falso",
    ]);
  });

  test("short-circuits logical operators", () => {
    const source = `
funcion explotar() { mostrar("no debería ejecutarse") }
mostrar(falso y explotar())
mostrar(verdadero o explotar())
mostrar(no nulo, nulo o "defecto")
`;
    expect(outputOf(source)).toEqual(["falso", "verdadero", "verdadero defecto"]);
  });

  test("chains 'sino si' branches", () => {
    const source = `
funcion clasificar(n) {
  si n < 0 {
    devolver "negativo"
  } sino si n == 0 {
    devolver "cero"
  } sino {
    devolver "positivo"
  }
}
mostrar(clasificar(-1), clasificar(0), clasificar(5))
`;
    expect(outputOf(source)).toEqual(["negativo cero positivo"]);
  });

  test("supports recursion", () => {
    const source = `
funcion fibonacci(n) {
  si n < 2 { devolver n }
  devolver fibonacci(n - 1) + fibonacci(n - 2)
}
mostrar(fibonacci(15))
`;
    expect(outputOf(source)).toEqual(["610"]);
  });

  test("supports closures and first-class functions", () => {
    const source = `
funcion contador() {
  var cuenta = 0
  devolver funcion() {
    cuenta = cuenta + 1
    devolver cuenta
  }
}
var siguiente = contador()
siguiente()
siguiente()
mostrar(siguiente())

funcion aplicar(f, x) { devolver f(x) }
mostrar(aplicar(funcion(n) { devolver n * n }, 4))
`;
    expect(outputOf(source)).toEqual(["3", "16"]);
  });

  test("uses lexical scoping with shadowing", () => {
    const source = `
var x = "global"
si verdadero {
  var x = "local"
  mostrar(x)
}
mostrar(x)
`;
    expect(outputOf(source)).toEqual(["local", "global"]);
  });

  test("accepts Unicode identifiers and semicolons", () => {
    expect(outputOf('var año = 2026; var niño = "Ñandú"; mostrar(niño, año);')).toEqual(["Ñandú 2026"]);
  });

  test("returns nulo from functions without devolver", () => {
    expect(outputOf("funcion nada() {}\nmostrar(nada())")).toEqual(["nulo"]);
  });
});

describe("runtime errors", () => {
  const errorOf = (source: string) => () => outputOf(source);

  test("reports undefined variables with their line", () => {
    expect(errorOf("var a = 1\n\nmostrar(x)")).toThrow("Error en la línea 3: variable 'x' no definida");
  });

  test("reports assignment to undeclared variables", () => {
    expect(errorOf("x = 1")).toThrow("Error en la línea 1: variable 'x' no definida");
  });

  test("reports invalid operand types", () => {
    expect(errorOf("mostrar(verdadero - 1)")).toThrow(
      "Error en la línea 1: no se puede aplicar '-' entre booleano y número",
    );
  });

  test("reports division by zero", () => {
    expect(errorOf("mostrar(1 / 0)")).toThrow("Error en la línea 1: división por cero");
  });

  test("reports wrong argument counts", () => {
    expect(errorOf("funcion f(a, b) {}\nf(1)")).toThrow(
      "Error en la línea 2: la función 'f' espera 2 argumentos pero recibió 1",
    );
  });

  test("reports calls to non-functions", () => {
    expect(errorOf('var s = "hola"\ns()')).toThrow("Error en la línea 2: no se puede llamar a un valor de tipo texto");
  });

  test("reports 'devolver' outside a function", () => {
    expect(errorOf("devolver 1")).toThrow("Error en la línea 1: 'devolver' solo se puede usar dentro de una función");
  });

  test("stops infinite recursion with a friendly error", () => {
    expect(errorOf("funcion f() { devolver f() }\nf()")).toThrow("demasiadas llamadas anidadas");
  });
});

describe("readable syntax", () => {
  const counterProgram = `
funcion para crearContador(recibe inicio) {
  variable para contar = inicio
  devuelve funcion() {
    devuelve contar = contar + 1
  }
}
variable para a = crearContador(0)
mostrar(a())
mostrar(a())
var b = crearContador(0)
mostrar(b())
`;

  test("runs the readable counter with independent counters", () => {
    expect(outputOf(counterProgram)).toEqual(["1", "2", "1"]);
  });

  test("treats synonyms exactly like their base keywords", () => {
    const readable = 'variable x = 2\nfunción doble(n) { devuelve n * 2 }\nmostrar(doble(x))';
    const classic = "var x = 2\nfuncion doble(n) { devolver n * 2 }\nmostrar(doble(x))";
    expect(outputOf(readable)).toEqual(["4"]);
    expect(outputOf(readable)).toEqual(outputOf(classic));
  });

  test("runs the same with and without filler words", () => {
    const withFillers = "funcion para sumar(recibe a, recibe b) { devuelve a + b }\nvar para r = sumar(1, 2)\nmostrar(r)";
    const without = "funcion sumar(a, b) { devolver a + b }\nvar r = sumar(1, 2)\nmostrar(r)";
    expect(outputOf(withFillers)).toEqual(["3"]);
    expect(outputOf(without)).toEqual(["3"]);
  });

  test("accepts 'recibe' in anonymous functions", () => {
    expect(outputOf("var cuadrado = funcion(recibe n) { devuelve n * n }\nmostrar(cuadrado(5))")).toEqual(["25"]);
  });
});

describe("assignment expressions", () => {
  test("evaluates to the assigned value", () => {
    expect(outputOf("var x = 1\nmostrar(x = 5)\nmostrar(x)")).toEqual(["5", "5"]);
  });

  test("chains right-associatively", () => {
    expect(outputOf("var a\nvar b\na = b = 3\nmostrar(a, b)")).toEqual(["3 3"]);
  });

  test("can be returned directly", () => {
    expect(outputOf("var n = 0\nfuncion subir() { devuelve n = n + 1 }\nsubir()\nmostrar(subir(), n)")).toEqual([
      "2 2",
    ]);
  });

  test("does not change equality comparisons", () => {
    expect(outputOf("var x = 1\nvar igual = x == 1\nmostrar(igual, x)")).toEqual(["verdadero 1"]);
  });
});

describe("comparisons in words", () => {
  test("behave exactly like the symbol operators", () => {
    const pairs: Array<[string, string]> = [
      ["es igual a", "=="],
      ["no es igual a", "!="],
      ["es distinto de", "!="],
      ["es mayor que", ">"],
      ["es menor que", "<"],
      ["es mayor o igual a", ">="],
      ["es mayor o igual que", ">="],
      ["es menor o igual a", "<="],
      ["es menor o igual que", "<="],
    ];
    const operands = ["1, 2", "2, 2", "3, 2", '"a", "b"', '"b", "b"', '1, "1"', "nulo, nulo"];
    for (const [words, symbol] of pairs) {
      for (const args of operands) {
        const [left, right] = args.split(", ");
        const isOrdering = symbol !== "==" && symbol !== "!=";
        if (isOrdering && (args.includes("nulo") || args.includes('"1"'))) continue;
        const program = `mostrar(${left} ${words} ${right})\nmostrar(${left} ${symbol} ${right})`;
        const [fromWords, fromSymbol] = outputOf(program);
        expect(`${left} ${words} ${right} -> ${fromWords}`).toBe(`${left} ${words} ${right} -> ${fromSymbol}`);
      }
    }
  });

  test("work with variables named 'a', 'igual' and 'mayor'", () => {
    const source = `
var a = 3
var igual = 3
var mayor = 10
mostrar(a es igual a igual, mayor es mayor que a, a es menor o igual a igual)
`;
    expect(outputOf(source)).toEqual(["verdadero verdadero verdadero"]);
  });

  test("distinguish 'mayor o igual' from the logical 'o'", () => {
    expect(outputOf("mostrar(5 es mayor o igual a 5, 1 es mayor que 5 o verdadero)")).toEqual(["verdadero verdadero"]);
  });

  test("combine with arithmetic and logical operators", () => {
    expect(outputOf("var n = 9\nmostrar(n % 3 es igual a 0 y verdadero, n % 3 es igual a 0 y falso)")).toEqual([
      "verdadero falso",
    ]);
  });

  test("report runtime errors like their symbol equivalents", () => {
    const errorOf = (source: string): string => {
      try {
        outputOf(source);
        return "";
      } catch (error) {
        return (error as Error).message;
      }
    };
    expect(errorOf('mostrar(1 es mayor que "a")')).not.toBe("");
    expect(errorOf('mostrar(1 es mayor que "a")')).toBe(errorOf('mostrar(1 > "a")'));
  });
});

describe("single-statement 'si'", () => {
  test("runs the matching branch of an unbraced chain", () => {
    const source = `
funcion clasificar(n) {
  si n es menor que 0 devolver "negativo"
  sino si n es igual a 0 devolver "cero"
  sino devolver "positivo"
}
mostrar(clasificar(-2), clasificar(0), clasificar(5))
`;
    expect(outputOf(source)).toEqual(["negativo cero positivo"]);
  });

  test("runs the statement after an 'si' without 'sino'", () => {
    expect(outputOf("si falso mostrar(1)\nmostrar(2)\nsi verdadero mostrar(3)\nmostrar(4)")).toEqual(["2", "3", "4"]);
  });

  test("runs the readable FizzBuzz program", () => {
    const source = `
var n = 1
mientras n es menor o igual a 15 ejecutar {
  si n % 15 es igual a 0 mostrar("FizzBuzz")
  sino si n % 3 es igual a 0 mostrar("Fizz");
  sino si n % 5 es igual a 0 mostrar("Buzz")
  sino mostrar(n)
  n = n + 1
}
`;
    expect(outputOf(source)).toEqual(
      "1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz".split(" "),
    );
  });
});
