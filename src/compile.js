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

function compArithmetic(line, lineNum) {
  const result = [
    `// ${line[0]}`,
    '@SP',
    'M = M - 1',
    'A = M',
  ];

  // arithmetic:
  if (line[0] === 'add' || line[0] === 'sub' ||
      line[0] === 'and' || line[0] === 'or')
    result.push(
      'D = M',
      '@SP',
      'M = M - 1',
      'A = M',
      `D = M ${
        line[0] === 'add' ? '+':
        line[0] === 'sub' ? '-':
        line[0] === 'and' ? '&':
                            '|'
      } D`,
      '@SP',
      'A = M',
      'M = D',
    );

  // comparisons:
  else if (line[0] === 'eq' || line[0] === 'gt' || line[0] === 'lt')
    result.push(
      'D = M',
      '@SP',
      'M = M - 1',
      'A = M',
      'D = M - D',
      `@${line[0] + lineNum}`,
      `D  ;J${line[0].toUpperCase()}`,
      '@SP',
      'A = M',
      'M = 0',
      `@END${line[0] + lineNum}`,
      '0;JMP',
      `(${line[0] + lineNum})`,
      '@SP',
      'A = M',
      'M = -1',
      `(END${line[0] + lineNum})`,
    );

  // unary operators:
  else result.push(`M = ${line[0] === 'neg' ? '-' : '!'}M`);

  return result.concat([
      '@SP',
      'M = M + 1',
    ]).join('\n');
}

function compPushPop(line) {
  const [command, segment, number] = line;

  const segmentName =
    segment === 'local'    ? 'LCL':
    segment === 'argument' ? 'ARG':
    segment === 'this'     ? 'THIS':
    segment === 'that'     ? 'THAT':
    null;

  return command === 'push' ?
    compPush(segment, segmentName, number):
    compPop(segment, segmentName, number);
}

function compPush(segment, segmentName, number) {
  const result = [`// push ${segment} ${number}`];

  if (segment === 'static'  || segment === 'temp' ||
      segment === 'pointer' || segment === 'constant')
    result.push(
      segment === 'constant' ? '@' + number:
      segment === 'static'   ? '@' + number: // in the case of static 'number' will be a label
      segment === 'temp'     ? '@' + (5 + parseInt(number, 10)):
      number  === '0'        ? '@THIS': '@THAT'
    );

  else result.push(
    `@${segmentName}`,
    'D = M',
    `@${number}`,
    'A = D + A',
  );

  return result.concat([
    `D = ${segment === 'constant' ? 'A' : 'M'}`,
    '@SP',
    'A = M',
    'M = D',
    '@SP',
    'M = M + 1',
  ]).join('\n');
}

function compPop(segment, segmentName, number) {
  const result = [
    `// pop ${segment} ${number}`,
    '@SP',
    'M = M - 1',
    'A = M',
    'D = M',      // D = pop value
  ];

  if (segment === 'static' || segment === 'temp' || segment === 'pointer')
    result.push(`${
      segment === 'static' ? '@' + number:
      segment === 'temp'   ? '@' + (5 + parseInt(number, 10)):
      number  === '0'      ? '@THIS': '@THAT'
    }`);

  else result.push(
    `@${segmentName}`,
    'D = D + M',  // D = pop value + base mem.
    `@${number}`
  );

  return result.concat([
    'D = D + A',  // D = pop value + address to pop to
    '@SP',
    'A = M',
    'A = M',      // A = pop value
    'A = D - A',  // A = address to pop to
    'M = D - A',  // M = pop value
  ]).join('\n');
}

function compLabel(line) {
  return [
    `// ${line.join(' ')}`,
    `(${line[1]})`,
  ].join('\n');
}

function compGoto(line) {
  return [
    `// ${line.join(' ')}`,
    `@${line[1]}`,
    '0;JMP',
  ].join('\n');
}

function compIfGoto(line) {
  const popPartOfGoto = compPop('temp', null, 0);
  const popPartWithoutComment = popPartOfGoto.substring(popPartOfGoto.indexOf('\n'));
  return `// ${line.join(' ')}` + popPartWithoutComment + '\n' + [
    '@5',
    'D = M',
    `@${line[1]}`,
    'D ;JNE',
  ].join('\n');
}

function compFunction(line) {
  const pushZeros = (compPush('constant', null, 0) + '\n').repeat(line[2]);

  return [
    `// ${line.join(' ')}`,
    `(${line[1]})`,
    pushZeros,
  ].join('\n');
}

function compCall(line, lineNum) {
  // call format: call function nargs
  const returnAddress = line[1] + '$ret.' + lineNum;
  const pushCode = [
    'D = M',
    '@SP',
    'A = M',
    'M = D',
    '@SP',
    'M = M + 1',
  ].join('\n');

  return [
    `// ${line.join(' ')}`,
    `@${returnAddress}`,
    'D = A',
    '@SP',
    'A = M',
    'M = D',
    '@SP',
    'M = M + 1',
    '@LCL',
    pushCode,
    '@ARG',
    pushCode,
    '@THIS',
    pushCode,
    '@THAT',
    pushCode,
    '@SP',
    'D = M',
    '@LCL',                         // LCL = SP
    'M = D',
    `@${5 + parseInt(line[2], 10)}`,
    'D = D - A',
    '@ARG',                         // ARG = SP - 5 - nargs
    'M = D',
    `@${line[1]}`,                  // goto function
    '0;JMP',
    `(${returnAddress})`,           // (returnAddress)
  ].join('\n');
}

function compReturn() {
  const endFrameLocation = 13;       // using temp registers for
  const returnAddressLocation = 14;  // endFrame and returnAddress

  const popOntoArg = compPop('argument', 'ARG', '0');
  const popOntoArgWithoutComment = popOntoArg.substring(popOntoArg.indexOf('\n') + 1);

  const resetSegment = segment => [
    `@${endFrameLocation}`,
    'AM = M - 1',
    'D = M',
    `@${segment}`,
    'M = D',
  ].join('\n');

  return [
    '// return',
    '@LCL',                         // endFrame = LCL
    'D = M',
    `@${endFrameLocation}`,
    'M = D',
    '@5',                           // returnAddress = *(endFrame - 5)
    'A = D - A',
    'D = M',
    `@${returnAddressLocation}`,
    'M = D',
    popOntoArgWithoutComment,       // *ARG = pop()
    '@ARG',                         // SP = ARG + 1
    'D = M + 1',
    '@SP',
    'M = D',
    resetSegment('THAT'),
    resetSegment('THIS'),
    resetSegment('ARG'),
    resetSegment('LCL'),
    `@${returnAddressLocation}`,    // goto returnAddress
    'A = M',
    '0;JMP',
  ].join('\n');
}
