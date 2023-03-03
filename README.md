# Crawlee + PlaywrightCrawler + TypeScript project

This template is a production ready boilerplate for developing with `PlaywrightCrawler`. Use this to bootstrap your projects using the most up-to-date code.

If you're looking for examples or want to learn more visit:

- [Documentation](https://crawlee.dev/api/playwright-crawler/class/PlaywrightCrawler)
- [Examples](https://crawlee.dev/docs/examples/playwright-crawler)


### Run in docker compose
docker compose -f "docker-compose.yml" -f docker-compose.override.yml build --no-cache
docker compose -f "docker-compose.yml" -f docker-compose.override.yml up -d --renew-anon-volumes

or 

docker compose -f "docker-compose.yml" -f docker-compose.override.yml up -d --build --renew-anon-volumes

### Dependencies
`dddfile-data` - data layer. Referenced via lib package. If changes are made to that package, you need to build it to redeploy to lib. 