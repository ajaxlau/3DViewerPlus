import fs from 'fs';
import * as ico from '@humanwhocodes/ico-to-png';

function main() {
  const icoBuffer = fs.readFileSync('./public/favicon.ico');
  
  const pngs = ico.extractImagesAsPng(icoBuffer);
  
  if (pngs.length === 0) {
    console.error('No PNGs found in the ICO file.');
    return;
  }
  
  let largestPng = pngs[0];
  let size192Png = pngs[0];

  for (const png of pngs) {
    if (png.width > largestPng.width) largestPng = png;
    if (png.width === 192 || png.width === 128) size192Png = png;
  }

  // Debugging out sizes available!
  console.log("Sizes found:", pngs.map(p => p.width));

  fs.writeFileSync('./public/favicon-192.png', Buffer.from(size192Png.data));
  fs.writeFileSync('./public/favicon-512.png', Buffer.from(largestPng.data));
  console.log('Successfully extracted PNGs from favicon.ico');
}

main();
