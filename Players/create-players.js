import { template, load_registered, byRosterEvents, load_reserved, load_released, load_retired } from './funcs.js';

const season = "2026";

const data = (await Promise.all([
  load_reserved(season),
  load_released(`${Number(season) - 1}`),
  load_released(season),
  load_retired(season),
  load_registered(season),
]))
  .flat()
  .filter(({ date }) => date > "2025-12-01")
  .sort(byRosterEvents)
  .map((o) => {
    return Object.assign({}, template, o);
  })
  ;[].filter(({ playerId }) => playerId === "71675157")
  ;

const output = JSON.stringify(data, null, 2);
console.log(output);
