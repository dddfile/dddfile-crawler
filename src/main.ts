import ThingverseCralwer from './thingverse/crawler.js'
import CultsCralwer from './cults3d/crawler.js'
import dotenv from 'dotenv';
import { AppDataSource } from 'dddfile-data/src/data-source.js';

let path = ".env." + (process.env.NODE_ENV || "local");
dotenv.config({ path });

await AppDataSource.initialize();
await Promise.all([CultsCralwer.run(), ThingverseCralwer.run()]);