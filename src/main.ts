import ThingverseCralwer from './thingverse/crawler.js'
import CultsCralwer from './cults3d/crawler.js'
import dotenv from 'dotenv';
import { AppDataSource } from 'dddfile-data/dist/data-source.js';
import { getEnv, Type } from './util.js';

let path = ".env." + (process.env.NODE_ENV || "local");
dotenv.config({ path });

await AppDataSource.initialize();

const promises = [];
if (getEnv("THING_ENABLED", Type.boolean)) {
  console.log("Thing enabled")
  promises.push(ThingverseCralwer.run());
}
if (getEnv("CULTS_ENABLED", Type.boolean)) {
  console.log("Cults enabled")
  promises.push(CultsCralwer.run());
}

try {
  await Promise.all(promises);
} catch (e) {
  console.error('Error running crawlers', e);
}