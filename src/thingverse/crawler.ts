// For more information, see https://crawlee.dev/
import { Configuration, createRequestOptions, KeyValueStore, PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
import { router } from './routes.js';
import Apify from 'crawlee';

const { log } = Apify.utils;

const config = Configuration.getGlobalConfig();
config.set('defaultDatasetId', 'thingiverse');

const store = await KeyValueStore.open('thingiverse');
let lastcrawledUrl = (await store.getValue('_lasturl') as string) || 'https://www.thingiverse.com/search?page=1&per_page=20&sort=newest&type=things&q=';
// const startUrls = [lastcrawledUrl];

const startUrls:string[] = [];
const template = 'https://www.thingiverse.com/thing:{num}';
while (startUrls.length < +(process.env.CRAWLER_NUM_CRAWLS || 100)) {
  const thingId = Math.trunc(Math.random() * 5848433);
  startUrls.push(template.replace('{num}', thingId + ''));
}

const crawler = new PlaywrightCrawler({
    proxyConfiguration: new ProxyConfiguration({ proxyUrls: [
        // 'http://us-pr.oxylabs.io:10001',
        // 'http://us-pr.oxylabs.io:10002',
        // 'http://us-pr.oxylabs.io:10003',
        // 'http://us-pr.oxylabs.io:10004',
        // 'http://us-pr.oxylabs.io:10005',
        // 'http://us-pr.oxylabs.io:10006',
        // 'http://us-pr.oxylabs.io:10007',
        // 'http://us-pr.oxylabs.io:10008',
        // 'http://us-pr.oxylabs.io:10009',
        'http://pyevstwv-US-rotate:5qpoqaoi2jw6@p.webshare.io:80'
    ] }),
    requestHandler: router,
    maxRequestsPerCrawl: +(process.env.CRAWLER_NUM_CRAWLS || 100),
    maxConcurrency: +(process.env.CRAWLER_CONCURRENCY || 2),
    maxRequestRetries: 1
});
log.info(`Crawler options. maxRequests: ${+(process.env.CRAWLER_NUM_CRAWLS || 100)}, maxConcurrency: ${+(process.env.CRAWLER_CONCURRENCY || 2)}`)

class ThingverseCralwer {
  // run = () => crawler.run(startUrls);
  run = () => {
    log.info('Starting crawl');
    crawler.run(createRequestOptions(startUrls, { label: "detail" }))
  }
}

export default new ThingverseCralwer();
