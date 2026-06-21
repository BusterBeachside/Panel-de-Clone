const fs = require('fs');
const lines = fs.readFileSync('./engine-code.txt', 'utf8').split('\n');
for (let i = 1750; i < 1780; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
