import { Dataset, createPlaywrightRouter, Log, KeyValueStore, enqueueLinks, PlaywrightCrawler, CrawlerAddRequestsOptions, RequestOptions, createRequestOptions } from 'crawlee';

import { Locator, Page } from 'playwright';
import ImageService from './services/imageservice.js';
import * as Entities from 'dddfile-data/src/entity/index.js';
import { CrawlAssetRepository, CrawlSiteRepository } from 'dddfile-data/src/repository/index.js';
import { AppDataSource } from 'dddfile-data/src/data-source.js';

export const router = createPlaywrightRouter();

const store = await KeyValueStore.open('thingiverse');
await AppDataSource.initialize();

const crawlSite = await CrawlSiteRepository.get('thingiverse');

router.addDefaultHandler(async ({ request, page, crawler, log, proxyInfo }) => {
    console.log('Proxy info', proxyInfo?.url);
    console.log(`Processing: ${request.url}`)
    // const linkActor = page.locator('#react-app');
    // await linkActor.textContent({ timeout: 5000 });
    await page.waitForSelector('[class*=Pagination__pagination] a:nth-child(7)', { timeout: 5000 });

    log.info(`Enqueueing new URLs`);
    // await enqueueLinks({
    //     globs: ['https://thingiverse.com/thing:**', 'https://www.thingiverse.com/thing:**'],
    //     label: 'detail',
    // });
    await queueAssetLinks(crawler, page);

    const moreLink = await page.locator('[class*=Pagination__pagination] a', { hasText: 'More' }).getAttribute('href') || '';
    await crawler.addRequests([moreLink]);
});

router.addHandler('detail', async ({ request, page, log, proxyInfo }) => {
    console.log('Proxy info', proxyInfo?.url);
    const id = getIdFromUrl(page.url());
    if (id === '') return;

    const title: string = await page.locator('div[class*=ThingTitle__modelName]').textContent() + '';
    const previewUrl = await page.locator('#preview > div > div > div > div.carousel.carousel-slider > div > ul > li.slide.selected > img').getAttribute('src') + '';
    const tags = (await page.locator('a[class*=Tags__tag]').allTextContents()).join(', ') + '';
    const createdByHtml = await page.locator('div[class*=ThingTitle__createdBy]').innerHTML();
    // const createdByTexts = await page.locator('div[class*=ThingTitle__createdBy]').innerText();
    const assetCreatedOnText = createdByHtml.substring(createdByHtml.lastIndexOf('</a> ') + 5);
    let assetCreatedOn: Date = new Date();
    if (assetCreatedOnText) {
        assetCreatedOn = new Date(assetCreatedOnText);
    }

    log.info(`${title}`, { url: request.loadedUrl, previewUrl, tags });

    const imageFilePath = await ImageService.downloadImage(previewUrl + '') + '';

    const asset: Entities.CrawlAsset = {
        ...new Entities.CrawlAsset(),   // defaults
        assetId: id,
        siteId: crawlSite?.id || 0,
        url: request.loadedUrl + '',
        title,
        previewUrl,
        tags: tags.trim(),
        assetCreatedOn
    };
    try {
        await CrawlAssetRepository.insert(asset);
    } catch (e) {
        log.exception(e as Error, 'Unable to save asset');
    }

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

router.addHandler('list', async ({ request, page, enqueueLinks, log, proxyInfo }) => {
    console.log('Proxy info', proxyInfo?.url);
    console.log(`Processing: ${request.url} for request ${request.label}`)
    await page.waitForSelector('[class*=Pagination__pagination] a:nth-child(7)', { timeout: 10000 });

    log.info(`Enqueueing new URLs`);
    await enqueueLinks({
        selector: '[class*=Pagination__pagination] a:nth-child(7)', // More button,
        label: 'list',
    });
});

async function queueAssetLinks(crawler: PlaywrightCrawler, page: Page) {
    const locator = await page.locator('a[class*=ThingCardBody__cardBodyWrapper]');
    const linkCount = await locator.count();
    const linkQueue = [];
    for (let i = 0; i < linkCount; i++) {
        const link = locator.nth(i);
        const href = await link.getAttribute('href');
        const id = getIdFromUrl(href);
        const alreadyCrawled = await CrawlAssetRepository.exists(id);
        //if (href && id && !await store.getValue(id)) {
        if (href && id && !alreadyCrawled) {
            linkQueue.push(href);
        }
    }
    await crawler.addRequests(createRequestOptions(linkQueue, { label: "detail" }));
}

function getIdFromUrl(url: string | null): string {
    if (!url) return '';
    return url.substring(url.lastIndexOf(':') + 1) + '';
}