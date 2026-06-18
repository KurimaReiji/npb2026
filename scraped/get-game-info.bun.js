import { writeFile } from 'fs/promises';
import { extractTop, extractPlays, extractBoxscore, extractRoster, extractGameLinks, to_uniq, sleep } from './get-game-info.funcs.bun.js';

const dates = process.argv.slice(2);

if (dates.length > 0 && dates.every((d) => /^20\d\d-[01]\d-[0-3]\d$/.test(d))) {
  console.log(dates);
} else {
  console.error("Usage: bun get-game-info.bun.js YYYY-MM-DD");
  process.exit(1);
}

const npbroot = 'https://npb.jp/';
const year = dates[0].slice(0, 4);
const months = dates.map(d => d.split("-")[1]).reduce(to_uniq, []);

for (const mm of months) {
  const targetURL = `https://npb.jp/games/${year}/schedule_${mm}_detail.html`;
  console.log(`goto ${targetURL}`);
  const response = await fetch(targetURL);
  const anchors = await extractGameLinks(response);
  const targets = dates.map(date => {
    const [year, month, day] = date.split("-");
    const str = `${year}/${month}${day}`;
    const urls = anchors.filter((a) => a.includes(str));
    return {
      date,
      urls,
    }
  });

  for (const { date, urls } of targets) {
    const outfile = `${__dirname}/daily/${date}.json`;
    const outputs = [];
    for (const url of urls) {
      const baseUrl = new URL(url, npbroot);
      const data = await extractFromWeb(baseUrl)
      outputs.push(data);
    }
    const output = JSON.stringify(outputs, null, 2);
    console.log(`output: ${outfile}`);
    writeFile(outfile, output, "utf8");
  }
}


async function extractFromWeb(baseUrl) {
  const pages = ["index.html", "playbyplay.html", "box.html", "roster.html"];
  const urls = pages.map((page) => new URL(page, baseUrl).href);

  const extractors = [extractTop, extractPlays, extractBoxscore, extractRoster];
  const responses = await fetchAllSequentially(urls);

  const extracted = await Promise.all(responses.map(async (res, i) => extractors[i](res)));
  const data = extracted.reduce((acc, cur, idx) => {
    acc[pages[idx]] = cur;
    return acc;
  }, { baseUrl });
  await sleep(1000);
  return data;
}

async function fetchAllSequentially(urls) {
  const responses = [];

  for (const url of urls) {
    console.log(`Fetching: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText} - ${url}`);
    }
    responses.push(response);
  }

  return responses;
}

