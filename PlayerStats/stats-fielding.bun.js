/* 12球団の個人守備成績を収集 */

import { writeFile } from 'fs/promises';

const teamCodes = ['t', 'db', 'g', 'd', 'c', 's', 'h', 'f', 'b', 'e', 'l', 'm'];

const data = [];
for (const teamCode of teamCodes) {
  const url = `https://npb.jp/bis/2026/stats/idf1_${teamCode}.html`;
  console.log(url);
  const res = await fetch(url);
  const d = await scrapeStats(res);
  data.push(d);
}

const date = data.at(0).updated.split(/[年月日]/).slice(0, 3).map(s => s.padStart(2, "0")).join("-");
const outfile = `./fielding/${date}.json`;
writeFile(outfile, JSON.stringify(data, null, 2));

async function scrapeStats(res) {
  const data = {
    tables: []
  };
  const rewriter = new HTMLRewriter()
    .on('.bis-heading', {
      element(el) {
        data.h3 = '';
      },
      text({ text }) {
        data.h3 += text;
      }
    })
    .on('p.right', {
      element(el) {
        data.updated = '';
      },
      text({ text }) {
        data.updated += text;
      }
    })
    .on('h4.central-bg', {
      element(el) {
        data.h4 = '';
      },
      text({ text }) {
        data.h4 += text;
      }
    })
    .on('.bis_table h5', {
      element(el) {
        data.tables.push({ text: [], rows: [] });
      },
      text({ text }) {
        data.tables.at(-1).text.push(text);
      }
    })
    .on('.bis_table tr', {
      element(el) {
        data.tables.at(-1).rows.push([]);
      }
    })
    .on('.bis_table th, .bis_table td', {
      element(el) {
        data.tables.at(-1).rows.at(-1).push([]);
      },
      text({ text }) {
        data.tables.at(-1).rows.at(-1).at(-1).push(text);
      }
    })
    ;
  await rewriter.transform(res).arrayBuffer();

  for (const tbl of data.tables) {
    tbl.text = tbl.text.join('');
    tbl.rows = tbl.rows.map((row) => row.map((col) => col.join('')))
  }
  return {
    title: [data.h3, data.h4],
    updated: data.updated,
    tables: data.tables.map((tbl) => ({
      title: tbl.text,
      rows: tbl.rows
    })),
  }
}
