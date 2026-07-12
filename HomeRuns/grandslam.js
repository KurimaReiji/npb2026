import { parseNdJson } from "../docs/js/ndjson-helper.js";
import { formatTable, createRow, getHomerunResponse, } from './helpers.js';

const season = "2026";

const rows = [];
const res = getHomerunResponse();

for await (const cur of parseNdJson(res)) {
  if (cur.rbi === 4) {
    rows.push(createRow(cur));
  }
}

console.log(formatTable(`${season} NPB Grand Slams (${rows.length})`, rows));
