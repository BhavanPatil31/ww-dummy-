const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set window size so responsive containers work
  await page.setViewport({width: 1200, height: 800});
  
  const logs = [];
  page.on('console', msg => {
    logs.push('[Console] ' + msg.type() + ': ' + msg.text());
  });
  
  page.on('pageerror', error => {
    logs.push('[PageError] ' + error.message);
  });
  
  page.on('requestfailed', request => {
    logs.push('[RequestFailed] ' + request.url() + ' ' + request.failure().errorText);
  });

  try {
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
    
    // Log in if needed
    // First let's check what's on the page
    let content = await page.content();
    if(content.includes('Login') || content.includes('Sign In')) {
      // Need to login. Let's try filling the basic login form if we can.
      console.log("Needs login. Let's see if we see any errors just from loading.");
    }
  } catch (e) {
    console.log("Navigation error:", e.message);
  }
  
  setTimeout(async () => {
    console.log("--- BROWSER LOGS ---");
    logs.forEach(l => console.log(l));
    console.log("--------------------");
    await browser.close();
  }, 2000);
})();
