import { writeFileSync, createReadStream } from 'node:fs';
import { getTeams } from '../docs/js/npb-teams.js';
import { parseNdJson } from "../docs/js/ndjson-helper.js";
import { calculateStandings } from "../docs/js/standings-calculator.js";

async function main() {
  const season = "2026";
  const dbPath = `../docs/npb${season}-results.ndjson`;

  // 1. I/O: 外部データの準備
  const teams = getTeams();
  const stream = createReadStream(dbPath);
  const res = new Response(stream);
  const gamesStream = parseNdJson(res);

  // 2. Pure Calculation: 順位表計算（計算部分）
  const json = await calculateStandings(teams, gamesStream, null, season);

  // 3. I/O: ファイル書き込み
  const outfile = `../docs/standings.json`;
  writeFileSync(outfile, JSON.stringify(json, null, 2), "utf8");
  // console.info(`outfile: ${outfile}`);
}

main().catch(console.error);