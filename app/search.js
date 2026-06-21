const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function run() {
  const tree = await fetchJson('https://api.github.com/repos/panel-attack/panel-game/git/trees/beta?recursive=1');
  if (!tree.tree) return console.error('No tree found', tree);
  
  const luaFiles = tree.tree.filter(t => t.path.endsWith('.lua')).map(t => t.path);
  console.log('Found Lua files:', luaFiles.length);
  
  for (const path of luaFiles) {
    if (path.includes('panel') || path.includes('grid') || path.includes('chain') || path.includes('match') || path.includes('puzzle') || path.includes('const')) {
      console.log(path);
    }
  }
}
run();
