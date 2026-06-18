import { writeFile } from 'fs/promises';
import { to_uniq, sleep } from '../scraped/get-game-info.funcs.bun.js';

const dates = process.argv.slice(2);

if (dates.length > 0 && dates.every((d) => /^20\d\d-[01]\d-[0-3]\d$/.test(d))) {
  console.log(dates);
} else {
  console.error("Usage: bun en-get-game-info.bun.js YYYY-MM-DD");
  process.exit(1);
}

const year = dates[0].slice(0, 4);
const months = dates.map(d => d.split("-")[1])
  .map((mm) => mm === "03" ? "04" : mm)
  .reduce(to_uniq, []);

for (const mm of months) {
  const targetURL = `https://npb.jp/bis/eng/${year}/calendar/index_${mm}.html`;
  console.log(`goto ${targetURL}`);
  const response = await fetch(targetURL);
  const anchors = await extractGameLinks(response);
  const targets = dates.map(date => {
    return {
      date,
      urls: anchors[date]?.map(({ href }) => href) || [],
    };
  });

  for (const { date, urls } of targets) {
    const outfile = `${__dirname}/daily/${date}.json`;
    const outputs = [];
    for (const url of urls) {
      console.log(`goto ${url}`);
      const data = await extractFromWeb(url)
      outputs.push(data);
    }
    const output = JSON.stringify(outputs, null, 2);
    console.log(`output: ${outfile}`);
    writeFile(outfile, output, "utf8");
  }
}

async function extractFromWeb(url) {
  const responses = await fetch(url);
  const data = await extractEnBox(responses)
  await sleep(900);
  return Object.assign({ link: url }, data);
}

async function scrapeEnSchedule(res) {
  const data = {};

  const rewriter = new HTMLRewriter()
    .on('#tedivmaintbl', {
      element(el) { data.anchors = []; },
    })
    .on('#tedivmaintbl a', {
      element(el) { data.anchors.push({ href: el.getAttribute('href'), text: '' }); },
      text({ text }) { data.anchors.at(-1).text += text }
    })
    ;
  await rewriter.transform(res).arrayBuffer();

  return data;
}

async function parseEnSchedule(raw) {
  const data = raw.anchors
    .filter(({ href }) => href.includes('games/s'))
    .filter(({ text }) => !text.includes("*"))
    .reduce((acc, cur) => {
      const [, y, m, d] = /s(\d{4})(\d{2})(\d{2})\d+\.html/.exec(cur.href);
      const date = `${y}-${m}-${d}`;
      const urls = acc[date] || [];
      const url = new URL(cur.href, "https://npb.jp/");
      urls.push(url);
      acc[date] = urls;
      return acc;
    }, {})
  return data;
}

async function extractGameLinks(response) {
  const scraped = await scrapeEnSchedule(response);
  const data = await parseEnSchedule(scraped);
  return data;
}

async function scrapeEnBox(res) {
  const data = {};

  const rewriter = new HTMLRewriter()
    .on('#gmdivtitle h1', {
      element(el) { data.date = ''; },
      text({ text }) { data.date += text.trim(); }
    })
    .on('#gmdivinfo tr', {
      element(el) { data.gmdivinfo = []; },
    })
    .on('#gmdivinfo td', {
      element(el) { data.gmdivinfo.push({ text: '' }); },
      text({ text }) { data.gmdivinfo.at(-1).text += text.trim() }
    })
    .on('#gmdivscore', {
      element(el) { data.divscore = []; },
    })
    .on('.contentshdname', {
      element(el) { data.divscore.push({ text: '' }); },
      text({ text }) { data.divscore.at(-1).text += text.trim() }
    })
    .on('.gmboxrun', {
      element(el) { data.divscore.push({ text: '' }); },
      text({ text }) { data.divscore.at(-1).text += text.trim() }
    })
    .on('.gmdivnumber', {
      element(el) { data.gmdivnumber = ''; },
      text({ text }) { data.gmdivnumber += text.trim(); }
    })
    .on('#gmdivresult table', {
      element(el) { data.gmdivresult = []; },
    })
    .on('#gmdivresult tr', {
      element(el) { data.gmdivresult.push([]); },
    })
    .on('#gmdivresult td', {
      element(el) { data.gmdivresult.at(-1).push({ cls: el.getAttribute('class'), text: '' }); },
      text({ text }) { data.gmdivresult.at(-1).at(-1).text += text.trim() }
    })
    .on('#gmdivpit table', {
      element(el) { data.gmdivpit = []; },
    })
    .on('#gmdivpit tr', {
      element(el) { data.gmdivpit.push([]); },
    })
    .on('#gmdivpit td', {
      element(el) { data.gmdivpit.at(-1).push({ cls: el.getAttribute('class'), text: '' }); },
      text({ text }) { data.gmdivpit.at(-1).at(-1).text += text.trim() }
    })
    .on('#gmdivhr table', {
      element(el) { data.gmdivhr = []; },
    })
    .on('#gmdivhr tr', {
      element(el) { data.gmdivhr.push([]); },
    })
    .on('#gmdivhr td', {
      element(el) { data.gmdivhr.at(-1).push({ cls: el.getAttribute('class'), text: '' }); },
      text({ text }) { data.gmdivhr.at(-1).at(-1).text += text.trim() }
    })
    .on('#gmdivtbl > table', {
      element(el) { data.gmdivtbl = []; },
    })
    .on('#gmdivtbl table tr:nth-of-type(n+2) table', {
      element(el) { data.gmdivtbl.push([]); },
    })
    .on('#gmdivtbl table tr:nth-of-type(n+2) table tr', {
      element(el) { data.gmdivtbl.at(-1).push([]); },
    })
    .on('#gmdivtbl table tr:nth-of-type(n+2) table th, #gmdivtbl table tr:nth-of-type(n+2) table td', {
      element(el) { data.gmdivtbl.at(-1).at(-1).push({ cls: el.getAttribute('class'), text: '' }); },
      text({ text }) { data.gmdivtbl.at(-1).at(-1).at(-1).text += text.trim() }
    })

    ;
  await rewriter.transform(res).arrayBuffer();

  return data;
}

async function parseEnBox(raw) {
  return {
    date: raw.date,
    score: [
      { team: raw.divscore[0].text, runs: Number(raw.divscore[1].text) },
      { team: raw.divscore[2].text, runs: Number(raw.divscore[3].text) }
    ],
    venue: raw.gmdivinfo[0].text,
    gameInfo: raw.gmdivinfo[1].text,
    gameNumber: raw.gmdivnumber,
    linescore: raw.gmdivresult.map((row) => row.filter((col) => col.text !== '').map((col) => col.text)).slice(1),
    pitchers: raw.gmdivpit?.map((tr) => tr.map((td) => td.text)),
    homeruns: raw.gmdivhr?.map((tr) => tr.map((td) => td.text)),
    boxscore: raw.gmdivtbl.map((tbl) => tbl.map((row) => row.map((col) => col.cls !== 'gmnxtbatter' ? col.text : ` ${col.text}`)))
  }
}

async function extractEnBox(response) {
  const scraped = await scrapeEnBox(response);
  const data = await parseEnBox(scraped);
  return data;
}