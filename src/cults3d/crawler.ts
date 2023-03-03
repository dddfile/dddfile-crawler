// For more information, see https://crawlee.dev/
import { Configuration, createRequestOptions, KeyValueStore, PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
import { router } from './routes.js';
import Apify from 'crawlee';

const { log } = Apify.utils;

const config = Configuration.getGlobalConfig();
config.set('defaultDatasetId', 'cults');

const store = await KeyValueStore.open('cults');
let lastcrawledUrl = (await store.getValue('_lasturl') as string) || 'https://cults3d.com/en/creations/selected/page/1';
const startUrls = [
  'https://cults3d.com/en/categories/art',
  'https://cults3d.com/en/categories/fashion',
  'https://cults3d.com/en/categories/jewelry',
  'https://cults3d.com/en/categories/home',
  'https://cults3d.com/en/categories/architecture',
  'https://cults3d.com/en/categories/gadget',
  'https://cults3d.com/en/categories/game',
  'https://cults3d.com/en/categories/tool',
  'https://cults3d.com/en/categories/naughties',
  'https://cults3d.com/en/categories/various',
  'https://cults3d.com/en/guides/3d-printing-ideas',
  'https://cults3d.com/en/guides/best-STL-files',
  lastcrawledUrl,
];

const crawler = new PlaywrightCrawler({
    proxyConfiguration: new ProxyConfiguration({ proxyUrls: [
        'http://pyevstwv-US-rotate:5qpoqaoi2jw6@p.webshare.io:80'
    ] }),
    requestHandler: router,
    maxRequestsPerCrawl: +(process.env.CRAWLER_NUM_CRAWLS || 100),
    maxConcurrency: +(process.env.CRAWLER_CONCURRENCY || 2),
    navigationTimeoutSecs: +(process.env.CRAWLER_TIMEOUT || 120),
    requestHandlerTimeoutSecs: +(process.env.CRAWLER_TIMEOUT || 120),
    maxRequestRetries: +(process.env.CRAWLER_RETRIES || 2),
});
log.info(`Crawler options. maxRequests: ${+(process.env.CRAWLER_NUM_CRAWLS || 100)}, maxConcurrency: ${+(process.env.CRAWLER_CONCURRENCY || 2)}`);

class CultsCrawler {
  run = () => {
    log.info('Starting crawl');
    crawler.run(startUrls);
    // const startUrls = ['https://cults3d.com/en/3d-model/game/zoroark-model-3d-printable-highly-detailed'];
    // crawler.run(createRequestOptions(startUrls, { label: "detail" }));
  }
}

export default new CultsCrawler();
