const os = require('os');
const qrcode = require('qrcode');

const nets = os.networkInterfaces();
let ip = '127.0.0.1';
for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    if (net.family === 'IPv4' && !net.internal) {
      ip = net.address;
      break;
    }
  }
}

const expoUrl = `exp://${ip}:8081`;
console.log('Local IP:', ip);
console.log('Expo URL:', expoUrl);

qrcode.toFile('qr_code.png', expoUrl, { width: 400, margin: 2 }, function (err) {
  if (err) throw err;
  console.log('SUCCESS: QR Code PNG image saved to qr_code.png');
});

qrcode.toString(expoUrl, { type: 'terminal' }, function (err, urlStr) {
  if (err) throw err;
  console.log('\n--- SCAN QR CODE BELOW FOR EXPO GO ---');
  console.log(urlStr);
});
