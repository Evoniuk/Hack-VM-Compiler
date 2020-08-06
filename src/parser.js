function parse(code) {
  return code.split(/\r?\n/) // splits by new line characters
    .map(stripWhitespace)
    .filter(line => line !== '')
    .map(line => line.split(' '));
}

function stripWhitespace(line) {
  const removeComments = line.includes('/') ?
    line.substring(0, line.indexOf('/')):
    line;
  return removeComments.trim();
}
