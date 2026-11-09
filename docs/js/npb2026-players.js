import { getReadableNdJsonStream, parseNdJson } from "./ndjson-helper.js";

async function createGetPlayers(dbfile) {
  return async function (date = "2026-03-27") {
    const readable = await getReadableNdJsonStream(dbfile);
    const res = new Response(readable);
    const players = {};
    for await (const cur of parseNdJson(res)) {
      if (cur.date <= date) {
        players[cur.playerId] = { ...players[cur.playerId], ...cur };
      }
    }

    return Object.values(players);
  }
}

const dbfile = (() => {
  const relativePath = `../npb2026-players.ndjson`;
  if (typeof window === 'undefined') {
    return `${import.meta.dirname}/${relativePath}`;
  } else {
    return new URL(relativePath, import.meta.url).href;
  }
})();

const getPlayers = await createGetPlayers(dbfile);

function createFindPlayerById(players) {
  return function (playerId) {
    const player = players.find((player) => player.playerId === playerId);
    if (!player) {
      throw new Error(`Player not found: ${playerId}`);
    }
    return player;
  }
}

export {
  createGetPlayers,
  createFindPlayerById,
  getPlayers,
}
