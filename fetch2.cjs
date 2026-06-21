const https = require('https');

function downloadAndPrint(url) {
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      console.log('--- ' + url + ' ---');
      console.log(data);
    });
  });
}

downloadAndPrint('https://raw.githubusercontent.com/panel-attack/panel-game/beta/common/engine/Stack.lua');
downloadAndPrint('https://raw.githubusercontent.com/panel-attack/panel-game/beta/common/engine/Panel.lua');
downloadAndPrint('https://raw.githubusercontent.com/panel-attack/panel-game/beta/common/engine/checkMatches.lua');
