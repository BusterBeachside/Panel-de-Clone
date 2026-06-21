const fs = require('fs');
const lines = fs.readFileSync('./engine-code.txt', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('function supportedFromBelow('));
if (start !== -1) {
  for (let i = start; i < start + 30; i++) {
    console.log(`${i}: ${lines[i]}`);
  }
}
