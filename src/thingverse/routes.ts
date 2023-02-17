import { Dataset, createPlaywrightRouter, Log, KeyValueStore, enqueueLinks, PlaywrightCrawler, CrawlerAddRequestsOptions, RequestOptions, createRequestOptions, Dictionary, LoggerText } from 'crawlee';
import { v4 as uuidv4 } from 'uuid';
import { Locator, Page } from 'playwright';
import ImageService from '../services/imageservice.js';
import * as Entities from 'dddfile-data/dist/entity/index.js';
import { CrawlAssetRepository, CrawlSiteRepository } from 'dddfile-data/dist/repository/index.js';

export const router = createPlaywrightRouter();

let store: KeyValueStore;
let crawlSite: Entities.CrawlSite | null;
router.use(async ctx => {
    ctx.log.setOptions({ prefix: "Thing", logger: new LoggerText({ skipTime: false })});
    store = await KeyValueStore.open('thingiverse');
    crawlSite = await CrawlSiteRepository.get('thingiverse');
});

router.addDefaultHandler(async ({ request, page, crawler, log }) => {
    // log.info(`Proxy info ${proxyInfo?.url});
    log.info(`Default handler: processing: ${request.url}`)
    // const linkActor = page.locator('#react-app');
    // await linkActor.textContent({ timeout: 5000 });
    const cookieDismiss = page.locator('#CybotCookiebotDialogBodyButtonDecline');
    if (await cookieDismiss.isVisible()) {
        cookieDismiss.click();
    }
    log.info(`Default handler: waiting for DOM`)
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
    
    // Wait 10s
    await new Promise((res) => setTimeout(() => res(1), 5000));
    
    // log.info(`Default handler: waiting for more link`)
    // await page.waitForSelector('[class*=Pagination__pagination] a:nth-child(7)', { timeout: 30000 });
    
    log.info(`Default handler: taking screenshot`)
    await saveScreenshot(page, request.url);

    // await enqueueLinks({
    //     globs: ['https://thingiverse.com/thing:**', 'https://www.thingiverse.com/thing:**'],
    //     label: 'detail',
    // });
    log.info(`Default handler: looking for detail links`)
    await queueAssetLinks(crawler, page, log);

    // Pause between 1 and 10s
    await new Promise((res) => setTimeout(() => res(1), Math.random() * 1000));

    const moreLink = await page.locator('[class*=Pagination__pagination] a', { hasText: 'More' }).getAttribute('href') || '';
    if (moreLink !== '') {
        log.info(`Default handler: adding more link ${moreLink}`);
        await crawler.addRequests([moreLink]);
    }
    store.setValue('_lasturl', request.url);
});

router.addHandler('detail', async ({ crawler, request, response, page, log }) => {
    log.info(`Detail handler: processing: ${request.url}. Status: ${response?.status()}`)
    if (response?.status() === 404) {
        log.info(`Detail handler: page not found: ${request.url}`);
        return;
    }
    const id = getIdFromUrl(page.url());
    if (id === '') {
        log.info('Detail handler: no ID found');
        return;
    }

    await queueAssetLinks(crawler, page, log);

    const alreadyCrawled = await CrawlAssetRepository.exists(id);
    if (alreadyCrawled) {
        log.info(`Detail handler: already crawled ${id}`);
        return;
    }

    log.info(`Detail handler: waiting for DOM`)
    await page.waitForLoadState('load', { timeout: 30000 });

    // Pause between 1 and 10s
    await new Promise((res) => setTimeout(() => res(1), Math.random() * 1000));

    log.info(`Detail handler: scraping title`)
    const title: string = await page.locator('div[class*=ThingTitle__modelName]').textContent({ timeout: 30000 }) + '';
    log.info(`Detail handler: scraping url`)
    const sitePreviewUrl = await page.locator('#preview > div > div > div > div.carousel.carousel-slider > div > ul > li.slide.selected > img').getAttribute('src', { timeout: 30000 }) + '';
    log.info(`Detail handler: scraping tags`)
    const tags = (await page.locator('a[class*=Tags__tag]').allTextContents()).join(',') + '';
    log.info(`Detail handler: scraping created by`)
    const createdByHtml = await page.locator('div[class*=ThingTitle__createdBy]').innerHTML({ timeout: 30000 });
    // const createdByTexts = await page.locator('div[class*=ThingTitle__createdBy]').innerText();
    const assetCreatedOnText = createdByHtml.substring(createdByHtml.lastIndexOf('</a> ') + 5);
    let assetCreatedOn: Date = new Date();
    if (assetCreatedOnText) {
        assetCreatedOn = new Date(assetCreatedOnText);
    }

    log.info(`Detail handler: fields: ${title}`, { url: request.loadedUrl, sitePreviewUrl, tags });

    log.info(`Detail handler: downloading image`);
    const resourceId = uuidv4();
    const imageFilePath = await ImageService.downloadImage(crawlSite!.name, sitePreviewUrl + '') + '';
    log.info(`Detail handler: uploading image`);
    const previewUrl = await ImageService.uploadImageToS3(resourceId, imageFilePath);

    const asset: Entities.CrawlAsset = {
        ...new Entities.CrawlAsset(),   // defaults
        assetId: id,
        siteId: crawlSite!.id || 0,
        url: request.loadedUrl + '',
        title,
        previewUrl,
        sitePreviewUrl,
        tags: tags.trim(),
        assetCreatedOn,
        resourceId,
        free: true
    };
    try {
        log.info(`Detail handler: saving asset`);
        await CrawlAssetRepository.insert(asset);
    } catch (e) {
        log.exception(e as Error, 'Unable to save asset');
    }

    await store.setValue(`${id}`, await page.content(), { contentType: 'text/html'});

    // await store.setValue(id, {
    //     url: request.loadedUrl,
    //     title,
    //     previewUrl,
    //     tags,
    //     assetCreatedOn,
    //     imageFilePath
    // });
    await store.setValue('_lastid', id);
});

// router.addHandler('list', async ({ crawler, request, page, log}) => {
//     // console.log('Proxy info', proxyInfo?.url);
//     log.info(`List handler: processing: ${request.url}`)
//     await page.waitForSelector('[class*=Pagination__pagination] a:nth-child(7)', { timeout: 10000 });
//     await page.waitForLoadState('domcontentloaded');
//     await saveScreenshot(page, request.url);

//     // await enqueueLinks({
//     //     selector: '[class*=Pagination__pagination] a:nth-child(7)', // More button,
//     //     label: 'list',
//     // });
//     await queueAssetLinks(crawler, page, log);
//     const moreLink = await page.locator('[class*=Pagination__pagination] a', { hasText: 'More' }).getAttribute('href') || '';
//     await crawler.addRequests([moreLink]);
//     store.setValue('_lasturl', request.url);
// });

async function queueAssetLinks(crawler: PlaywrightCrawler, page: Page, log: any) {
    const locator = await page.locator('a[class*=ThingCardBody__cardBodyWrapper]');
    const linkCount = await locator.count();
    const linkQueue = [];
    for (let i = 0; i < linkCount; i++) {
        const link = locator.nth(i);
        const href = await link.getAttribute('href');
        const id = getIdFromUrl(href);
        // const alreadyCrawled = await CrawlAssetRepository.exists(id);
        // //if (href && id && !await store.getValue(id)) {
        // if (href && id && !alreadyCrawled) {
        //     linkQueue.push(href);
        // }
        if (href && id) {
            linkQueue.push(href);
        }
    }

    const moreLink = await page.locator('[class*=Pagination__pagination] a', { hasText: 'More' }).getAttribute('href') || '';
    if (moreLink !== '') {
        log.info(`QueueLinks: adding more link ${moreLink}`);
        await crawler.addRequests([moreLink]);
    }

    log.info(`QueueLinks: enqueueing ${linkQueue.length} new URLs`);
    if (linkQueue.length > 0) {
        await crawler.addRequests(createRequestOptions(linkQueue, { label: "detail" }));
    }
}

function getIdFromUrl(url: string | null): string {
    if (!url) return '';
    return url.substring(url.lastIndexOf(':') + 1) + '';
}
async function saveScreenshot(page: Page, url: string): Promise<void> {
    return;

    const screenshot = await page.screenshot();
    // Convert the URL into a valid key
    let key = url.replace('https://wwww.thingverse.com', '').replace(/[:/&?=]/g, '_');
    // Save the screenshot to the default key-value store
    await store.setValue(key, screenshot, { contentType: 'image/png' });
}