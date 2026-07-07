import { parseNdJson } from "./ndjson-helper.js";
import { join } from 'path';

const GAMEDAY = (new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date()));
const season = "2026";
const db = join(__dirname, `../npb${season}-boxscoreNames.ndjson`);
const file = Bun.file(db);

async function getBoxscoreNamesFromDB(date = GAMEDAY) {
  const res = new Response(file);
  const boxscoreNames = {};
  for await (const cur of parseNdJson(res)) {
    if (cur.date <= date) {
      const { date, id, boxscoreName } = cur;
      boxscoreNames[id] = boxscoreName;
    }
  }
  return boxscoreNames;
}

export { getBoxscoreNamesFromDB }