const Jimp = require('jimp');

async function run() {
    try {
        let img;
        if(Jimp.read) {
            img = await Jimp.read('C:\\Users\\bhava\\.gemini\\antigravity\\brain\\1c45b073-245d-4839-8b55-aaed2628e91e\\wealthwise_corporate_logo_1775710178549.png');
        } else {
            console.log("No Jimp.read found");
            return;
        }

        img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];
            
            if (r > 230 && g > 230 && b > 230) {
                this.bitmap.data[idx + 3] = 0;
            } else if (r > 190 && g > 190 && b > 190) {
                const avg = (r + g + b) / 3;
                this.bitmap.data[idx + 3] = Math.max(0, 255 - ((avg - 190) * 3));
            }
        });

        if (img.writeAsync) {
            await img.writeAsync('c:\\Users\\bhava\\OneDrive\\Desktop\\ww(dummy)\\frontend\\public\\logo.png');
            console.log("SUCCESS WITH writeAsync");
        } else if (img.write) {
            await new Promise((resolve, reject) => {
                img.write('c:\\Users\\bhava\\OneDrive\\Desktop\\ww(dummy)\\frontend\\public\\logo.png', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            console.log("SUCCESS WITH write cb");
        } else {
            console.log("no write methods");
        }
    } catch(e) {
        console.log("ERR", e);
    }
}
run();
