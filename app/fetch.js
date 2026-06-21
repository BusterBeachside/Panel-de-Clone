const https = require('https');

https.get('https://api.github.com/repos/panel-attack/panel-game/contents/common/engine?ref=beta', {
  headers: {
    'User-Agent': 'node.js'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    let files = JSON.parse(data);
    files.forEach(f => console.log(f.name, f.download_url));
  });
}).on('error', err => {
  console.log('Error:', err.message);
});
