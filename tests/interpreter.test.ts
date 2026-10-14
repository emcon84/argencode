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
