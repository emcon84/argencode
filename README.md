# Argencode

Argencode es un lenguaje de programación de juguete cuyas palabras clave están en español. Está implementado como un intérprete de recorrido de árbol (*tree-walking interpreter*) en TypeScript y se ejecuta sobre [Bun](https://bun.sh).

Su objetivo es educativo: mostrar, con código pequeño y legible, cómo funcionan un analizador léxico, un analizador sintáctico y un evaluador.

```
var nombre = "Che"
si nombre == "Che" {
  mostrar("¡Hola, " + nombre + "!")
} sino {
  mostrar("¿Quién sos?")
}
```

## Instalación

Requisitos: Bun 1.2 o superior.

```sh
git clone <url-del-repositorio> argencode
cd argencode
bun install
```

Opcionalmente, para usar el comando `argencode` de forma global:

```sh
bun link
```

## Uso

Ejecutar un archivo `.arg`:

```sh
bun run src/cli.ts ejemplos/hola.arg
# o bien
bun start ejemplos/hola.arg
```

Iniciar el intérprete interactivo (REPL):

```sh
bun run src/cli.ts
```

En el REPL, las variables se conservan entre entradas, los bloques abiertos con `{` continúan en la línea siguiente y el valor de la última expresión se muestra automáticamente.

| Comando de la consola | Descripción                                          |
| --------------------- | ---------------------------------------------------- |
| `.ayuda`              | Muestra cómo ejecutar archivos, los comandos y ejemplos de sintaxis |
| `.salir`              | Sale de la consola (también `Ctrl+D`)                |

Si escribe la ruta de un archivo (por ejemplo `ejemplos/hola.arg`), la consola no la evalúa: le recuerda que debe salir y usar `bun run src/cli.ts <archivo>`. Si escribe `ayuda`, `help`, `salir` o `exit` sin el punto, y no existe una variable con ese nombre, muestra una pista hacia `.ayuda` o `.salir`.

Otros comandos útiles:

| Comando             | Descripción                         |
| ------------------- | ----------------------------------- |
| `bun test`          | Ejecuta las pruebas                 |
| `bun run typecheck` | Verifica los tipos con TypeScript   |

## Referencia de sintaxis

### Valores y tipos

| Tipo      | Ejemplos                       |
| --------- | ------------------------------ |
| número    | `42`, `3.14` (punto flotante)  |
| texto     | `"¡Hola, señor!"`              |
| booleano  | `verdadero`, `falso`           |
| nulo      | `nulo`                         |
| función   | `funcion(x) { devolver x }`    |

Las cadenas usan comillas dobles, admiten cualquier carácter UTF-8 y las secuencias de escape `\n`, `\t`, `\"` y `\\`.

Solo `falso` y `nulo` se consideran falsos; cualquier otro valor (incluidos `0` y `""`) es verdadero.

### Variables

```
var edad = 30        // declaración
edad = edad + 1      // asignación a una variable existente
var sinValor         // se inicializa en nulo
```

Los identificadores pueden contener letras Unicode: `var año = 2026`, `var niño = "Ñandú"`.

### Operadores

De menor a mayor precedencia:

| Operadores            | Descripción                    |
| --------------------- | ------------------------------ |
| `=`                   | asignación (asociativa a derecha, devuelve el valor asignado) |
| `o`                   | o lógico (cortocircuito)       |
| `y`                   | y lógico (cortocircuito)       |
| `==` `!=`             | igualdad                       |
| `<` `<=` `>` `>=`     | comparación (números o textos) |
| `+` `-`               | suma, resta, concatenación     |
| `*` `/` `%`           | multiplicación, división, resto |
| `-` `no`              | negativo y negación (unarios)  |

Las comparaciones también pueden escribirse en palabras; ver [Comparaciones en palabras](#comparaciones-en-palabras).

`+` concatena cuando alguno de los operandos es texto: `"total: " + 5` produce `"total: 5"`.

`y` y `o` devuelven uno de sus operandos, de modo que `nombre o "anónimo"` sirve como valor por defecto.

La asignación también es una expresión: `x = 5` vale `5`, por lo que `a = b = 3` asigna `3` a ambas variables y `devolver cuenta = cuenta + 1` actualiza y devuelve el valor en un solo paso. Solo se puede asignar a una variable.

### Control de flujo

```
si temperatura > 30 {
  mostrar("Hace calor")
} sino si temperatura < 10 {
  mostrar("Hace frío")
} sino {
  mostrar("Está agradable")
}

var i = 0
mientras i < 3 {
  mostrar(i)
  i = i + 1
}
```

### Comparaciones en palabras

Cada operador de comparación tiene una forma en palabras que produce exactamente el mismo resultado y tiene la misma precedencia que su símbolo:

| En palabras                                          | Símbolo |
| ---------------------------------------------------- | ------- |
| `x es igual a y`                                     | `==`    |
| `x no es igual a y`, `x es distinto de y`            | `!=`    |
| `x es mayor que y`                                   | `>`     |
| `x es menor que y`                                   | `<`     |
| `x es mayor o igual a y`, `x es mayor o igual que y` | `>=`    |
| `x es menor o igual a y`, `x es menor o igual que y` | `<=`    |

La palabra final (`a`, `que` o `de`) es opcional: `n es menor o igual 15` equivale a `n <= 15`. Dentro de `mayor o igual` y `menor o igual`, la `o` forma parte del operador y no es el o lógico. Como tienen la misma precedencia que los símbolos, se combinan con el resto de los operadores:

```
si n % 3 es igual a 0 y n es mayor que 10 {
  mostrar("múltiplo de 3 mayor que 10")
}
```

Solo `es` es una palabra reservada. `igual`, `mayor`, `menor`, `distinto`, `a`, `que` y `de` solo se interpretan así inmediatamente después de `es`, por lo que siguen sirviendo como nombres: `a es igual a b` compara las variables `a` y `b`. Una frase incompleta produce un error claro:

```
Error en la línea 1: se esperaba 'igual', 'mayor', 'menor' o 'distinto' después de 'es' (se encontró '3')
Error en la línea 1: se esperaba un valor después de 'es igual a'
```

### `ejecutar` y `si` de una sola línea

La palabra `ejecutar` puede ir, opcionalmente, antes del bloque de `mientras`, `si` o `sino`:

```
mientras n es menor que 10 ejecutar {
  n = n + 1
}
```

`ejecutar` no es una palabra reservada: solo se omite cuando aparece justo antes de `{`, así que puede usarse como nombre de variable o de función.

`si` y `sino` también aceptan una sola sentencia sin llaves, que termina con el fin de línea o con `;`. Las ramas `sino si` y `sino` pueden empezar en la línea siguiente, y las formas con y sin llaves pueden mezclarse:

```
var n = 1
mientras n es menor o igual a 15 ejecutar {
  si n % 15 es igual a 0 mostrar("FizzBuzz")
  sino si n % 3 es igual a 0 mostrar("Fizz");
  sino si n % 5 es igual a 0 mostrar("Buzz")
  sino mostrar(n)
  n = n + 1
}
```

Si después de un `si` no viene un `sino`, la línea siguiente es una sentencia independiente. `mientras` siempre requiere un bloque entre llaves.

### Funciones

Las funciones son valores de primera clase y capturan su entorno (clausuras).

```
funcion sumar(a, b) {
  devolver a + b
}

funcion crearContador() {
  var cuenta = 0
  devolver funcion() {
    cuenta = cuenta + 1
    devolver cuenta
  }
}
```

Una función sin `devolver` retorna `nulo`.

### Sintaxis legible

Para que los programas se lean como lenguaje natural, Argencode admite sinónimos y palabras de relleno opcionales. Ambas formas pueden mezclarse libremente.

| Sinónimo   | Equivale a |
| ---------- | ---------- |
| `variable` | `var`      |
| `devuelve` | `devolver` |
| `función`  | `funcion`  |

Palabras de relleno (opcionales):

- `para` puede ir entre `funcion`/`función` y el nombre de una función declarada, y entre `var`/`variable` y el nombre de la variable.
- `recibe` puede ir antes del primer parámetro, `(recibe a, b)`, o antes de cada uno, `(recibe a, recibe b)`.

```
funcion para crearContador(recibe inicio) {
  variable para contar = inicio
  devuelve funcion() {
    devuelve contar = contar + 1
  }
}
variable para a = crearContador(0)
mostrar(a())   // 1
mostrar(a())   // 2
```

Las funciones anónimas no llevan `para`: `funcion(recibe x) { devuelve x }`. `para` y `recibe` son palabras reservadas, por lo que no pueden usarse como nombres. Un uso incorrecto produce un error claro, por ejemplo:

```
Error en la línea 1: se esperaba el nombre de la función después de 'para' (se encontró '(')
Error en la línea 1: se esperaba el nombre de un parámetro después de 'recibe' (se encontró ')')
```

### Sentencias y comentarios

- Cada sentencia termina con un salto de línea; el `;` es opcional y permite escribir varias sentencias en una línea.
- Los bloques se delimitan con `{ }`.
- Los comentarios comienzan con `//` y llegan hasta el final de la línea.

### Funciones integradas

| Función            | Descripción                                                    |
| ------------------ | -------------------------------------------------------------- |
| `mostrar(a, b...)` | Imprime los valores separados por espacios (`verdadero`, `falso`, `nulo`) |

### Errores

Los errores léxicos, sintácticos y de ejecución indican la línea donde ocurrieron:

```
Error en la línea 3: variable 'x' no definida
Error en la línea 7: no se puede aplicar '-' entre booleano y número
Error en la línea 2: la función 'sumar' espera 2 argumentos pero recibió 1
```

### Palabras clave

`var`, `si`, `sino`, `mientras`, `funcion`, `devolver`, `verdadero`, `falso`, `nulo`, `y`, `o`, `no`, `es`.

Sinónimos: `variable`, `devuelve`, `función`. Palabras de relleno: `para`, `recibe`.

Palabras contextuales (no reservadas): `igual`, `mayor`, `menor`, `distinto`, `a`, `que` y `de` después de `es`, y `ejecutar` antes de un bloque.

## Ejemplos

La carpeta [`ejemplos/`](ejemplos) contiene programas listos para ejecutar:

- `hola.arg`: variables, condicionales, funciones y ciclos.
- `fibonacci.arg`: recursión.
- `contador.arg`: clausuras y funciones de primera clase.
- `fizzbuzz.arg`: cadenas `sino si` y el operador `%`.
- `legible.arg`: sintaxis legible con sinónimos y palabras de relleno.
- `fizzbuzz-legible.arg`: comparaciones en palabras, `ejecutar` y `si` de una sola línea.

## Arquitectura

```
src/
├── lexer/         # tipos de token y analizador léxico
├── parser/        # nodos del AST y analizador sintáctico (precedence climbing)
├── interpreter/   # entornos, evaluador, operadores, funciones integradas y errores
├── errors.ts      # error común con número de línea
├── index.ts       # API pública: run(), runOn(), Interpreter
├── repl.ts        # intérprete interactivo
└── cli.ts         # punto de entrada de la línea de comandos
```

El intérprete recibe una función de salida inyectable, lo que permite ejecutar programas en las pruebas sin modificar `console.log`:

```ts
import { run } from "./src/index.ts";

const lineas: string[] = [];
run('mostrar("hola")', { output: (linea) => lineas.push(linea) });
```

## Hoja de ruta

- [ ] Listas y diccionarios (`[1, 2, 3]`, `{ clave: valor }`).
- [ ] Ciclos sobre rangos y colecciones con `repetir` / `por cada` (`para` queda reservada como palabra de relleno).
- [ ] `romper` y `continuar` dentro de ciclos.
- [ ] Más funciones integradas: `longitud`, `texto`, `numero`, `leer`.
- [ ] Módulos e importación de archivos.
- [ ] Resolución estática de variables y mensajes de error con columna.
- [ ] Compilación a bytecode y una máquina virtual.

## Licencia

[MIT](LICENSE) © 2026 emcon84
