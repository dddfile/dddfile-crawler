// import cron from 'node-cron';
import { exec, spawn }  from 'child_process';
import fs from 'fs';

let cults, thing = false;
let crawler = null;
if (process.argv[2]) {
  cults = thing = false;
  crawler = process.argv[2].split('=')[1];
  cults = crawler === 'cults';
  thing = crawler === 'thing';
}

console.log(`Database host: ${process.env.DATABASE_HOST}`);

function runTask(job) {
  const timestamp = new Date().toLocaleString("sv").replace(' ', 'T').replaceAll(':', '-');

  let logFilePath = `./logs/${timestamp}.txt`;
  if (crawler) {
    console.log(`${crawler} enabled`);
    process.env[crawler.toUpperCase() + '_ENABLED'] = true;
    process.env.CRAWLEE_STORAGE_DIR = `./storage_${crawler}`;
    logFilePath = `./logs/${crawler}/${timestamp}.txt`;
    if (!fs.existsSync(`./logs`)) {
      fs.mkdirSync(`./logs`);
    }
    if (!fs.existsSync(`./logs/${crawler}`)) {
      fs.mkdirSync(`./logs/${crawler}`);
    }
  } else {
    throw new Error('Crawler selection required');
  }

  var logStream = fs.createWriteStream(logFilePath);
  const command = process.env.SCHEDULER_SCRIPT || 'start:local:prod';
  console.log('Running: ' + command)
  // var child = exec(command, {maxBuffer: 1024 * 1000}, (error, stdout, stderr) => {
  //   if (error) {
  //     console.error(`error: ${error.message}`);
  //     return;
  //   }
  
  //   if (stderr) {
  //     console.error(`stderr: ${stderr}`);
  //     return;
  //   }
  
  //   console.log(`stdout:\n${stdout}`);
  // });
  // child.stdout.pipe(logStream);
  // child.stderr.on("data", chunk => logStream.write(chunk));
  // child.on("exit", (code) => {
  //   console.log("Scraper finished with code " + code);
  // });
  return new Promise((resolve) => {
    var child = spawn("npm", ["run", command]);

    child.stdout.on('data', function (data) {
      console.log(data + '');
    });

    child.stderr.on('data', function (data) {
      console.log(data + '');
      logStream.write(data);
    });

    child.on('close', function (code) {
        console.log('child process exited with code ' + code);
        logStream.close();
        resolve();
    });
  });
}

import { CronJob } from 'cron';

const schedule = process.env.CRON_SCHEDULE || "15 0-8/2 * * *";
console.log(`Run crawler on schedule: ${schedule}`);
const job = new CronJob(schedule, async function() {
  console.log('Running task')
	await runTask(this);
}, () => {
  // onComplete handler
  console.log('Cron job complete');
}, undefined, undefined, undefined, true);

job.start();
