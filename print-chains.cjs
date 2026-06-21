const fs = require('fs');
const lines = fs.readFileSync('./engine-code.txt', 'utf8').split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('panel.chaining = true')) {
    console.log(`--- Match at line ${i} ---`);
    for (let j = Math.max(0, i-6); j <= Math.min(lines.length-1, i+6); j++) {
      console.log(`${j}: ${lines[j]}`);
    }
  }
}
