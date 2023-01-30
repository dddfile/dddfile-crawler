// For more information, see https://crawlee.dev/
import { Configuration, PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
import { router } from './routes.js';

const config = Configuration.getGlobalConfig();
config.set('defaultDatasetId', 'thingiverse');

const startUrls = ['https://thingiverse.com'];

const crawler = new PlaywrightCrawler({
    proxyConfiguration: new ProxyConfiguration({ proxyUrls: [
        // 'https://customer-ddddb-sessid-0540225153-sesstime-10:XMgWUn7SP2L#8HJ@pr.oxylabs.io:7777'
        'http://us-pr.oxylabs.io:10001',
        
        // 'http://us-pr.oxylabs.io:10001',
        'http://us-pr.oxylabs.io:10002',
        'http://us-pr.oxylabs.io:10003',
        'http://us-pr.oxylabs.io:10004',
        'http://us-pr.oxylabs.io:10005',
        'http://us-pr.oxylabs.io:10006',
        'http://us-pr.oxylabs.io:10007',
        'http://us-pr.oxylabs.io:10008',
        'http://us-pr.oxylabs.io:10009',
    ] }),
    requestHandler: router,
    maxRequestsPerCrawl: 10,    // for testing
    maxConcurrency: 1,
});

await crawler.run(startUrls);
