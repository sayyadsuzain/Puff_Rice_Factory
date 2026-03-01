import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import puppeteerLocal from 'puppeteer'

export async function launchBrowser() {
  const isProd = process.env.NODE_ENV === 'production'

  if (isProd) {
    // Vercel production environment - use puppeteer-core with @sparticuz/chromium
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
    return browser
  } else {
    // Local development environment - use regular puppeteer
    const browser = await puppeteerLocal.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    return browser
  }
}
