const fs = require('fs');
const path = 'D:/project/Note-Plan/package.json';
let c = fs.readFileSync(path, 'utf8');
// Remove BOM
c = c.replace(/^\uFEFF/, '');
// Remove signAndEditExecutable line
c = c.replace(/"icon": "electron\/assets\/appIcon.ico",\s*\r?\n\s*"signAndEditExecutable": false/, '"icon": "electron/assets/appIcon.ico"');
fs.writeFileSync(path, c, 'utf8');
JSON.parse(c);
console.log('JSON valid');
console.log('signAndEditExecutable removed:', !c.includes('signAndEditExecutable'));
