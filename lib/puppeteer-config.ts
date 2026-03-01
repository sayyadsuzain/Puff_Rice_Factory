import puppeteer from 'puppeteer'
import puppeteerCore from 'puppeteer-core'
import chromium from '@sparticuz/chromium-min'

export async function launchBrowser() {
  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction) {
    // Vercel production environment - use @sparticuz/chromium-min
    return await puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
  } else {
    // Local development environment
    return await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
  }
}
