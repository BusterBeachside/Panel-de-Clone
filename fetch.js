const https = require('https');

https.get('https://api.github.com/repos/panel-attack/panel-game/contents/common/engine?ref=beta', {
  headers: {
    'User-Agent': 'node.js'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log(data);
  });
}).on('error', err => {
  console.log('Error:', err.message);
});
