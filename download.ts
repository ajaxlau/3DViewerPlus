import fs from 'fs';
import https from 'https';
import path from 'path';

const url = 'https://ajaxlau.github.io/3DWebViewer/3DPO_Small_Logo.png';
const dest1 = path.join(process.cwd(), 'public', '3DPO_Small_Logo.png');
const dest2 = path.join(process.cwd(), 'src', 'images', '3DPO_Small_Logo.png');

if (!fs.existsSync(path.dirname(dest1))) fs.mkdirSync(path.dirname(dest1), { recursive: true });
if (!fs.existsSync(path.dirname(dest2))) fs.mkdirSync(path.dirname(dest2), { recursive: true });

console.log(`Downloading ${url}...`);

const file = fs.createWriteStream(dest1);
https.get(url, (response) => {
  if (response.statusCode === 200) {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      fs.copyFileSync(dest1, dest2);
      console.log('Download completed successfully!');
    });
  } else {
    console.error(`Failed to download: Status Code ${response.statusCode}`);
    file.close();
    fs.unlinkSync(dest1);
  }
}).on('error', (err) => {
  console.error('Request error:', err);
  file.close();
  if (fs.existsSync(dest1)) fs.unlinkSync(dest1);
});
