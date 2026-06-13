const fs = require('fs');
const { icoToPng } = require('@humanwhocodes/ico-to-png');

async function main() {
  const icoBuffer = fs.readFileSync('./public/favicon.ico');
  const pngs = await icoToPng(icoBuffer);
  
  if (pngs.length === 0) {
    console.error('No PNGs found in the ICO file.');
    return;
  }
  
  // Save the largest PNG as 512x512 and maybe another as 192x192
  let largestPng = pngs[0];
  let size192Png = pngs[0];

  for (const png of pngs) {
    if (png.width > largestPng.width) largestPng = png;
    if (png.width === 192 || png.width === 128) size192Png = png;
  }

  // We write the original largest image just as favicon-512.png to guarantee PWA uses it.
  fs.writeFileSync('./public/favicon-192.png', size192Png);
  fs.writeFileSync('./public/favicon-512.png', largestPng);
  console.log('Successfully extracted PNGs from favicon.ico');
}

main().catch(err => console.error(err));
