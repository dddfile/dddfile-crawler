// For more information, see https://crawlee.dev/
import { Configuration, KeyValueStore, PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
import { router } from './routes.js';
import Apify from 'crawlee';

const { log } = Apify.utils;

const config = Configuration.getGlobalConfig();
config.set('defaultDatasetId', 'cults');

const store = await KeyValueStore.open('cults');
let lastcrawledUrl = (await store.getValue('_lasturl') as string) || 'https://cults3d.com/en/creations/selected/page/1';
const startUrls = [lastcrawledUrl];

const crawler = new PlaywrightCrawler({
    proxyConfiguration: new ProxyConfiguration({ proxyUrls: [
        'http://pyevstwv-US-rotate:5qpoqaoi2jw6@p.webshare.io:80'
    ] }),
    requestHandler: router,
    maxRequestsPerCrawl: +(process.env.CRAWLER_NUM_CRAWLS || 100),
    maxConcurrency: +(process.env.CRAWLER_CONCURRENCY || 2),
    navigationTimeoutSecs: +(process.env.TIMEOUT || 120),
    requestHandlerTimeoutSecs: +(process.env.TIMEOUT || 120),
});
log.info(`Crawler options. maxRequests: ${+(process.env.CRAWLER_NUM_CRAWLS || 100)}, maxConcurrency: ${+(process.env.CRAWLER_CONCURRENCY || 2)}`)

class CultsCrawler {
  run = () => {
    log.info('Starting crawl');
    crawler.run(startUrls);
  }
}

export default new CultsCrawler();
