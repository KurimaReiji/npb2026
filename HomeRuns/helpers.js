import { createReadStream } from 'node:fs';

function formatTable(title, rows) {
  return [
    `${" ".repeat(.5 * (rows.at(-1).length - title.length))}${title}`,
    "=".repeat(rows.at(-1).length),
    `${'Date'.padEnd(4)}    ${'Batter'.padEnd(12)} Inn Out  RoB WhereHit   ${'Pitcher'.padEnd(12)}   ${'Score'.padEnd(10)} ${'Venue'.padEnd(16)} G`,
    "-".repeat(rows.at(-1).length),
    rows.join("\n"),
    "-".repeat(rows.at(-1).length),
    'RoB: runners on base',
    'WhereHit: hit direction',
    'Score: score from the perspective of the batting team',
    'G: game result',
  ].join("\n");
}

function createRow(cur) {
  const nameLen = 12;
  const sign = Math.sign(cur.runs.home - cur.runs.away);
  const situations = {
    top: ["behind", "tied", "ahead"].reverse(),
    bottom: ["behind", "tied", "ahead"]
  };
  const score = {
    top: [`${cur.runs.away}`.padStart(2), `${cur.runs.home}`.padEnd(2)].join("-"),
    bottom: [`${cur.runs.home}`.padStart(2), `${cur.runs.away}`.padEnd(2)].join("-"),
  }
  const row = [
    cur.date.slice(5).replace('-', ''),
    cur.batter.teamCode.padStart(2),
    cur.batter.boxscoreName.padEnd(nameLen),
    `${cur.inning}`.padStart(3),
    `${String(cur.outs).padStart(3)} `,
    cur.RoB,
    `${cur.whereHit.padStart(6)} `,
    cur.pitcher.teamCode.padStart(2),
    cur.pitcher.boxscoreName.padEnd(nameLen),
    `${situations[cur.halfInning][sign + 1]}`.padStart(6),
    score[cur.halfInning],
    cur.venue.boxscoreName.padEnd(16),
    cur.gameResult
  ].join(' ');
  return row.replace('Shu.Ishikawa ', 'Shu.Ishikawa');
}

function getHomerunResponse(season = "2026") {
  const db = `${import.meta.dirname}/../docs/npb${season}-homeruns.ndjson`;
  const fileStream = createReadStream(db);
  return new Response(fileStream);
}

export {
  formatTable,
  createRow,
  getHomerunResponse,
}
