# Hack VM Compiler

This is project 8 in the Nand to Tetris course, a compiler for the Hack VM language into the Hack assembly language. [Try it for yourself here](https://evoniuk.github.io/Hack-VM-Compiler/).

## How It Works

This compiler works in three main stages.

1. First, we proprocess the data, which means inserting bootstrap code and changing the labels present in the program.
2. Next, we parse the input, removing whitespace and transforming each line into an array of the tokens it includes.
3. Finally, we perform the compilation. This is (obviously) the bulk of the program.

These stages are handled in `preliminaries.js`, `parser.js`, and `compile.js`, respectively.

### A Note on the Architecture

Much like [my assembler for project 6](https://evoniuk.github.io/Hack-Assembler/), the implementation is largely functional. The preprocessing is done in place, but the compiler simply maps each line of VM code to its equivalent assembly code.

### preliminaries.js

This file contains the functionality for substituting labels and adding the bootstrap code.

There are two necessary substitions:

1. Exchanging label `LABEL` for `foo$LABEL`, where `foo` is the function that contains the label
2. Exchaning static variables for labels that reflect the file from which they come

Both these substitutions are necessary in order to avoid naming conflicts between different functions and files.

The bootsrap code initiaizes the stack pointer at 256 and calls `Sys.init`, an OS function defined in the VM code.

### preliminaries.js

This file contains the functionality for removing whitespace and transforming the source code into an array, each element of which represents a line. The representation for a line is yet another array, each element of which is a token in the line. So, for example, the input of

```
function main 0
push constant 0
return
```

into `parser` would produce an output of

```js
[
  ['function', 'main', '0'],
  ['push', 'constant', '0'],
  ['return'],
]
```

### compile.js

This file is the bulk of the program. The main function is `compile`.

`compile` takes as its input the array of arrays produced by `parser`, maps each element to the equivalent assembly code, and returns a single string. It is implemented like so:

```js
function compile(code) {
  return code.map((line, lineNum) =>
    line.length === 1 ?
      line[0] === 'return' ?
        compReturn(): compArithmetic(line, lineNum):
    line.length === 2 ?
      line[0] === 'label' ? compLabel(line):
      line[0] === 'goto'  ? compGoto(line):
      compIfGoto(line):
    line[0] === 'call' ? compCall(line, lineNum):
    line[0] === 'function' ? compFunction(line):
    compPushPop(line))
    .join('\n\n');
}
```

The use of the ternary operator might be seen as excessive, but hopefully the indentation allows it to be read like a series of if - else's.

The basic design of this function is that it determines the type of instruction each line is, and sends that line to the function that handles that type of instruction. It then takes all those strings and combines them into a single string, where each instruction is seperated by two newline characters.
