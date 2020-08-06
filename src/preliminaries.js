function bootstrapCode() {
  return [
    '// bootstrap code',
    '@256',
    'D = A',
    '@SP',
    'M = D',
  ].join('\n') + '\n\n'
  + compCall(['call', 'Sys.init', '0'], 0) + '\n\n';
}

// recieves parsed code of a file and name of said file
// looks for labels and prefixes them appropriately in place
function exchangeLabels(code, filename) {

  let currentFunction = '';
  for (let lineNum = 0; lineNum < code.length; lineNum++) {
    const currentLine = code[lineNum];
    if (currentLine[0] === 'function')
      currentFunction = currentLine[1];

    else if (currentLine[0] === 'label' || currentLine[0] === 'goto' || currentLine[0] === 'if-goto')
      currentLine[1] = currentFunction + '$' + currentLine[1];

    else if ((currentLine[0] === 'push' || currentLine[0] === 'pop') && currentLine[1] === 'static')
      currentLine[2] = filename + '.' + currentLine[2];
  }

  return code;
}
