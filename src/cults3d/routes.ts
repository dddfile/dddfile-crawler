import { Dataset, createPlaywrightRouter, Log, KeyValueStore, enqueueLinks, PlaywrightCrawler, CrawlerAddRequestsOptions, RequestOptions, createRequestOptions, Dictionary, log, LoggerText } from 'crawlee';
import { v4 as uuidv4 } from 'uuid';
import { Locator, Page } from 'playwright';
import ImageService from '../services/imageservice.js';
import * as Entities from 'dddfile-data/dist/entity/index.js';
import { CrawlAssetRepository, CrawlSiteRepository } from 'dddfile-data/dist/repository/index.js';

export const router = createPlaywrightRouter();

let store: KeyValueStore;
let crawlSite: Entities.CrawlSite | null;
router.use(async ctx => {
  // ctx.log.setOptions({ prefix: "Cults", logger: new LoggerText({ skipTime: false })})
  ctx.log.setOptions({ prefix: "Cults", logger: new LoggerText({ skipTime: false })})
  store = await KeyValueStore.open('cults');
  crawlSite = await CrawlSiteRepository.get('cults');
});

router.addDefaultHandler(async ({ request, page, crawler, log }) => {
    // log.info(`Proxy info ${proxyInfo?.url});
    log.info(`Default handler: processing: ${request.url}`)
    log.info(`Default handler: waiting for DOM`)
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
    
    // Wait 10s
    await new Promise((res) => setTimeout(() => res(1), 5000));
    
    // log.info(`Default handler: taking screenshot`)
    // await saveScreenshot(page, request.url);

    log.info(`Default handler: looking for detail links`)
    await queueAssetLinks(crawler, page, log);

    // Pause between 1 and 10s
    await new Promise((res) => setTimeout(() => res(1), Math.random() * 1000));

    let moreLink = await page.locator('nav.pagination .next a', { hasText: 'Next' }).getAttribute('href') || '';
    if (moreLink !== '') {
      moreLink = 'https://cults3d.com' + moreLink;
      log.info(`Default handler: adding more link ${moreLink}`);
      await crawler.addRequests([moreLink]);
    }
    store.setValue('_lasturl', request.url);
});

router.addHandler('detail', async ({ crawler, request, page, log }) => {
    page.setDefaultTimeout(60);
    log.info(`Detail handler: processing: ${request.url}`)
    const id = getIdFromUrl(page.url());
    if (id === '') {
        log.info('Id not found on detail page', { id });
        return;
    }

    log.info(`Detail handler: waiting for DOM`)
    await page.waitForLoadState('load', { timeout: 30000 });

    // Pause between 1 and 10s
    await new Promise((res) => setTimeout(() => res(1), Math.random() * 1000));

    await queueAssetLinks(crawler, page, log);

    log.info(`Detail handler: scraping title`)
    const titleLocator = page.locator('h1');
    const title: string = (await titleLocator.first().textContent({ timeout: 30000 }) + '')?.trim();

    log.info(`Detail handler: scraping url`)
    let sitePreviewUrl = '';
    let imgLocator = page.locator('.product-pane img.painting-image');
    if (await imgLocator.count() > 0) {
      sitePreviewUrl = await imgLocator.first().getAttribute('src', { timeout: 30000 }) + '';
    } else {
      imgLocator = page.locator('.product-pane picture source');
      if (await imgLocator.count() > 0) {
        sitePreviewUrl = await imgLocator.first().getAttribute('srcset', { timeout: 30000 }) + '';
      }
    }
    
    log.info(`Detail handler: scraping tags`)
    const tagLocator = page.locator('h2 + ul.inline-list');
    let tags;
    if (await tagLocator.count() > 0) {
      const tagContent = await tagLocator.textContent() || '';
      tags = tagContent.split('\n')
        .map(v => v.trim())
        .reduce((prev, cur) => {
          if (cur && cur != ',') {
            prev += cur + ',';
          }
          return prev;
        }, '');
      if (tags.length > 0) {
        tags = tags.substring(0, tags.length-1);
      } else {
        tags = '';
      }
    } else {
      tags = '';
    }
    
    log.info(`Detail handler: scraping created by`)
    let assetCreatedOnText = await page.locator('li', { hasText: 'publication date'}).innerText();
    // parse " Publication date: 2023-02-03 at 16:00"
    assetCreatedOnText = assetCreatedOnText.replace("Publication date: ", "").replace("at ", "").trim();
    const assetCreatedOnDateText = assetCreatedOnText.substring(0, assetCreatedOnText.indexOf(' '));
    const assetCreatedOn = new Date(assetCreatedOnDateText);

    log.info("Detail handler: scraping price")
    const priceLocator = page.locator(".creation-infos form .btn-third");
    let free = true;
    if (await priceLocator.count() > 0) {
      free = /free/gi.test((await priceLocator.first().innerText()));
    }

    log.info(`Detail handler: fields: 
      title ${title}
      url: ${request.loadedUrl}
      previewUrl: ${sitePreviewUrl}
      tags: ${tags}
      createdOn: ${assetCreatedOn}
      free: ${free}`);

    log.info(`Detail handler: downloading image`);
    const resourceId = uuidv4();
    const imageFilePath = await ImageService.downloadImage(crawlSite!.name, sitePreviewUrl + '') + '';

    log.info(`Detail handler: uploading image`);
    const previewUrl = await ImageService.uploadImageToS3(resourceId, imageFilePath);

    const asset: Entities.CrawlAsset = {
        ...new Entities.CrawlAsset(),   // defaults
        assetId: id,
        siteId: crawlSite?.id || 0,
        url: request.loadedUrl + '',
        title,
        previewUrl,
        sitePreviewUrl,
        tags: tags.trim(),
        assetCreatedOn,
        resourceId,
        free
    };
    try {
        log.info(`Detail handler: saving asset`);
        await CrawlAssetRepository.insert(asset);
    } catch (e) {
        log.exception(e as Error, 'Unable to save asset');
    }

    // await store.setValue(`${asset.id}`, await page.content(), { contentType: 'text/html'});
    await store.setValue('_lastid', id);
});

async function queueAssetLinks(crawler: PlaywrightCrawler, page: Page, log: any) {
    const locator = await page.locator('a[href*="/en/3d-model/"]');
    const linkCount = await locator.count();
    const linkQueue = [];
    for (let i = 0; i < linkCount; i++) {
        const link = locator.nth(i);
        const href = await link.getAttribute('href', { timeout: 60000 });
        const id = getIdFromUrl(href);
        const alreadyCrawled = await CrawlAssetRepository.exists(id);
        //if (href && id && !await store.getValue(id)) {
        if (href && id && !alreadyCrawled) {
          if (href.startsWith('https')) {
            linkQueue.push(href);
          } else if (href.startsWith('https//')) {
            linkQueue.push(href.replace('https//', 'https://'));
          } else if (href.startsWith('//')) {
            linkQueue.push('https:' + href);
          } else {
            linkQueue.push('https://cults3d.com' + href);
          }
        }
    }

    log.info(`Enqueueing ${linkQueue.length} new URLs`);
    if (linkQueue.length > 0) {
        await crawler.addRequests(createRequestOptions(linkQueue, { label: "detail" }));
    }
}

function getIdFromUrl(url: string | null): string {
    if (!url) return '';
    const parts = url.split('/');
    if (!parts || parts.length == 0) return '';
    return parts[parts.length - 2] + '/' + parts[parts.length - 1];
}
async function saveScreenshot(page: Page, url: string): Promise<void> {
    const screenshot = await page.screenshot();
    // Convert the URL into a valid key
    let key = url.replace('https://wwww.thingverse.com', '').replace(/[:/&?=]/g, '_');
    // Save the screenshot to the default key-value store
    await store.setValue(key, screenshot, { contentType: 'image/png' });
}