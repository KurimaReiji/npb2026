import { getReadableNdJsonStream, setDbfile, } from "./ndjson-helpers.js";

const dbfile = setDbfile('../npb2026-baserunning.ndjson', import.meta);

async function getBaseRunningReader() {
  return getReadableNdJsonStream(dbfile);
}

export {
  getBaseRunningReader,
}