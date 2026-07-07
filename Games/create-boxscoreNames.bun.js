import { parseNdJson } from "../docs/js/ndjson-helper.js";

const dbfile = "../docs/npb2026-games.ndjson";
const res = new Response(Bun.file(dbfile));

const data = [];
const boxscoreNames = {};

for await (const item of parseNdJson(res)) {
  const { date, players } = item;
  const { away, home } = players;
  [away, home].flat().forEach((player) => {
    const { id, boxscoreName } = player;
    if (!boxscoreName) return;
    if ((boxscoreNames[id] ?? '') !== boxscoreName) {
      boxscoreNames[id] = boxscoreName;
      data.push({
        date, id, boxscoreName,
      });
    }

  });
}

const output = data.map((o) => JSON.stringify(o)).join("\n");
const outfile = "../docs/npb2026-boxscoreNames.ndjson";
await Bun.write(outfile, output);
if (false && data.length !== Object.keys(boxscoreNames).length) {
  const ids = Object.keys(boxscoreNames)
    .map((id) => ({ id, boxscoreName: boxscoreNames[id], n: data.filter((o) => o.id === id) }))
    .filter(({ n }) => n.length > 1)
    ;
  console.log(JSON.stringify(ids, null, 2));
}