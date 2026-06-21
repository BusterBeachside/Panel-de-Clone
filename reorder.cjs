const fs = require('fs');
let content = fs.readFileSync('src/hooks/useGameLogic.ts', 'utf8');

const gravityRegex = /([ \t]*\/\/ 3\. Handle Gravity[\s\S]*?\/\/ Cleanup EMPTY placeholders[\s\S]*?\}[\s]*\}[\s]*\})\n/;
const match = gravityRegex.exec(content);

if (match) {
  const gravityBlock = match[0];
  content = content.replace(gravityBlock, '');
  
  const insertRegex = /([ \t]*\/\/ 6\. Check for end of chain)/;
  content = content.replace(insertRegex, gravityBlock + '\n$1');
  
  fs.writeFileSync('src/hooks/useGameLogic.ts', content);
  console.log('Successfully reordered gravity!');
} else {
  console.log('Failed to find gravity block');
}
