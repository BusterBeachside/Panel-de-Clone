const fs = require('fs');
const lines = fs.readFileSync('src/hooks/useGameLogic.ts', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('// 3. Handle Gravity'));
if (start !== -1) {
  for (let i = start; i < start + 120; i++) {
    console.log(`${i+1}: ${lines[i]}`);
  }
}
