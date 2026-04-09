import sharp from 'sharp';

async function processImage() {
  try {
    const { data, info } = await sharp('C:\\Users\\bhava\\.gemini\\antigravity\\brain\\1c45b073-245d-4839-8b55-aaed2628e91e\\wealthwise_corporate_logo_1775710178549.png')
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // If it's a very light pixel, make it transparent
      if (r > 230 && g > 230 && b > 230) {
        data[i + 3] = 0;
      } else if (r > 190 && g > 190 && b > 190) {
        const avg = (r + g + b) / 3;
        data[i + 3] = Math.max(0, 255 - ((avg - 190) * 3));
      }
    }

    await sharp(data, { raw: info })
      .png()
      .toFile('c:\\Users\\bhava\\OneDrive\\Desktop\\ww(dummy)\\frontend\\public\\logo.png');
      
    console.log('SUCCESS');
  } catch (err) {
    console.error('ERROR', err);
  }
}

processImage();
