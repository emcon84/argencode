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

En el REPL, las variables se conservan entre entradas, los bloques abiertos con `{` continúan en la línea siguiente y el valor de la última expresión se muestra automáticamente. Para salir, escriba `.salir` o presione `Ctrl+D`.

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
| `=`                   | asignación (asociativa a derecha) |
| `o`                   | o lógico (cortocircuito)       |
| `y`                   | y lógico (cortocircuito)       |
| `==` `!=`             | igualdad                       |
| `<` `<=` `>` `>=`     | comparación (números o textos) |
| `+` `-`               | suma, resta, concatenación     |
| `*` `/` `%`           | multiplicación, división, resto |
| `-` `no`              | negativo y negación (unarios)  |

`+` concatena cuando alguno de los operandos es texto: `"total: " + 5` produce `"total: 5"`.

`y` y `o` devuelven uno de sus operandos, de modo que `nombre o "anónimo"` sirve como valor por defecto.

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

`var`, `si`, `sino`, `mientras`, `funcion`, `devolver`, `verdadero`, `falso`, `nulo`, `y`, `o`, `no`.

## Ejemplos

La carpeta [`ejemplos/`](ejemplos) contiene programas listos para ejecutar:

- `hola.arg`: variables, condicionales, funciones y ciclos.
- `fibonacci.arg`: recursión.
- `contador.arg`: clausuras y funciones de primera clase.
- `fizzbuzz.arg`: cadenas `sino si` y el operador `%`.

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
- [ ] Ciclo `para` sobre rangos y colecciones.
- [ ] `romper` y `continuar` dentro de ciclos.
- [ ] Más funciones integradas: `longitud`, `texto`, `numero`, `leer`.
- [ ] Módulos e importación de archivos.
- [ ] Resolución estática de variables y mensajes de error con columna.
- [ ] Compilación a bytecode y una máquina virtual.

## Licencia

[MIT](LICENSE) © 2026 emcon84
