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

function runTask() {
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
  var child = spawn("npm", ["run", command]);

  child.stdout.on('data', function (data) {
    console.log('stdout: ' + data);
  });

  child.stderr.on('data', function (data) {
    console.log('stderr: ' + data);
    logStream.write(data);
  });

  child.on('close', function (code) {
      console.log('child process exited with code ' + code);
  });
}

runTask();

import { CronJob } from 'cron';

console.log('Run crawler every 15th minute of every 2 hours');
const job = new CronJob('15 0-8/2 * * *', function() {
  console.log('Running task')
	runTask();
});
job.start();
