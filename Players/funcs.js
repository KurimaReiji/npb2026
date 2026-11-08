import { readFile } from 'node:fs/promises';

const __dirname = import.meta.dirname;
const scrapedDir = `${__dirname}/scraped`;

async function load_reserved(season) {
  const infile = `${scrapedDir}/npb${Number(season) - 1}-reserved.json`;
  const inputs = JSON.parse(await readFile(infile, 'utf8'));

  return inputs
    .map((input) => {
      const data = input.rows
        .map(({ date, teamCode, jaPosition, playerId, jaRegisteredName }) => {
          return {
            date,
            jaEvent: "契約保留選手名簿公示",
            event: "onReservedList",
            jaStatus: "契約保留選手",
            status: "ReservedPlayer",
            teamCode,
            playerId,
            jaRegisteredName,
            jaPrimaryPosition: jaPosition,
          }
        });
      return data;
    })
    .flat()
    ;
}

async function load_released(season) {
  const infile = `${scrapedDir}/npb${season}-released.json`;
  const inputs = JSON.parse(await readFile(infile, 'utf8'));

  const jaNotes = inputs.jaNotes;
  return inputs.rows
    .map(({ date, teamCode, jaPosition, primaryNumber, playerId, jaRegisteredName, jaNote }) => {
      return {
        date,
        jaEvent: "自由契約選手公示",
        event: "Released",
        jaStatus: "自由契約選手",
        status: "FreeAgent",
        teamCode,
        playerId,
        jaRegisteredName,
        primaryNumber,
        jaPrimaryPosition: jaPosition,
        jaNote: jaNote.replace(/（/, "").replace(/）/, "")
      }
    })
    .map((o) => {
      if (o.jaNote.includes("※")) {
        const num = o.jaNote.match(/(※\d+)/).at(1);
        const jaNote = jaNotes.find((n) => n.includes(num)).replace(/(※\d+)/, "");
        o.jaNote = o.jaNote.replace(num, jaNote);
      }
      return o;
    })
    ;
}

async function load_roster(season) {
  const jaInfile = `${scrapedDir}/npb${season}-roster.json`;
  const enInfile = `${scrapedDir}/npb${season}-en-roster.json`;
  const jaInputs = JSON.parse(await readFile(jaInfile, 'utf8'));
  const enInputs = JSON.parse(await readFile(enInfile, 'utf8'));
  const enPlayers = enInputs.map(({ roster }) => roster).flat();

  return jaInputs
    .map((input) => {
      const data = input.roster
        .map(({ playerId, primaryPosition, birthDate, height, weight, }) => {
          const en = enPlayers.find((e) => e.playerId === playerId) ?? {};
          const { fullLFMName, pitchHand, batSide } = en;
          return {
            playerId, primaryPosition, birthDate, height, weight,
            pitchHand,
            batSide,
            fullLFMName,
          }
        });
      return data;
    })
    .flat()
    .filter(({ playerId }) => playerId)
    //.concat([{ "playerId": "11815117", "birthDate": "1981-02-21", "height": "179", "weight": "81", "pitchHand": "L", "batSide": "L" }])
    ;
}

async function load_registered(season) {
  const props = (await load_roster(season))
    .concat([
      {
        "playerId": "31735112",
        "fullLFMName": "Kawabata, Shingo",
      },
      {
        "playerId": "91995131",
        "fullLFMName": "Chono, Hisayoshi",
      }])
    ;

  const infile = `${scrapedDir}/npb${season}-registered.json`;
  const inputs = JSON.parse(await readFile(infile, 'utf8'));

  return inputs
    .map((input) => {
      const year = Number(input.year);
      const teamCode = input.teamCode;
      const jaEvent = "支配下選手登録公示";
      const event = "OnRegisteredList";
      const jaStatus = "支配下選手";
      const status = "RegisteredPlayer";
      const data = input.rows
        .map(({ mmdd, teamCode, jaPrimaryPosition, primaryNumber, playerId, jaRegisteredName }) => {
          return {
            date: mmddToDate(mmdd, year),
            jaEvent,
            event,
            jaStatus,
            status,
            teamCode,
            playerId,
            jaRegisteredName,
            primaryNumber,
            jaPrimaryPosition,
          };
        })
        .flatMap((o) => {
          let result = [o];
          const notes = input.notes.filter((n) => o.playerId === n.playerId);
          notes.forEach((note, idx) => {
            const { item, date, jaPrimaryPosition, playerId, jaRegisteredName, desc } = note;
            const [jaEvent, jaEventDetails] = item.match(/【([^（）】]*)（?([^）】]*)/)?.slice(1);

            if (item.includes("コーチ登録")) { // 【コーチ登録】【コーチ登録抹消】
            } else if (["【任意引退選手】", "【自由契約選手】", "【出場停止選手】", "【制限選手】"].includes(item)) {
              result.push(
                {
                  date,
                  jaEvent,
                  teamCode,
                  playerId,
                  jaRegisteredName,
                  jaPrimaryPosition,
                });
            } else if (item.includes("守備位置変更、背番号変更")) {
              const [oldValue, newValue] = desc.split("→").map(s => s.trim().replace(/　/, "").split(/\s/));
              Object.assign(o, { primaryNumber: oldValue.at(1), jaPrimaryPosition: oldValue.at(0) });
              result.push(
                {
                  date,
                  jaEvent: "守備位置変更",
                  jaEventDetails: [oldValue.at(0), newValue.at(0)].join(" → "),
                  teamCode,
                  playerId,
                  jaRegisteredName,
                  jaPrimaryPosition: newValue.at(0),
                }
              );
              result.push(
                {
                  date,
                  jaEvent: "背番号変更",
                  jaEventDetails: [oldValue.at(1), newValue.at(1)].join(" → "),
                  teamCode,
                  playerId,
                  jaRegisteredName,
                  primaryNumber: newValue.at(1),
                }
              );
            } else if (item.includes("守備位置変更")) {
              const [oldValue, newValue] = desc.split("→").map(s => s.trim().replace(/　/, ""));
              if (idx === 0) {
                Object.assign(o, { jaPrimaryPosition: oldValue });
              }
              result.push({
                date,
                jaEvent,
                jaEventDetails: desc,
                teamCode,
                playerId,
                jaRegisteredName,
                jaPrimaryPosition: newValue,
              });
            } else if (item.includes("投打変更")) {
              const dic = { "右": "R", "左": "L", "両": "S" };
              const [oldValue, newValue] = desc.split("→").map(s => s.trim());
              const [pitchHand, batSide] = newValue.split("").filter(s => '右左両'.split('').includes(s));
              result.push(
                {
                  date,
                  jaEvent,
                  jaEventDetails: desc,
                  teamCode,
                  playerId,
                  jaRegisteredName,
                  pitchHand: dic[pitchHand],
                  batSide: dic[batSide],
                }
              );
            } else if (["【登録名変更】", "【改名】"].includes(item)) {
              const [oldValue, newValue] = desc.split("→").map(s => s.trim());
              Object.assign(o, { jaRegisteredName: oldValue });
              result.push(
                {
                  date,
                  jaEvent,
                  jaEventDetails: desc,
                  teamCode,
                  playerId,
                  jaRegisteredName: newValue.replace(/（.*）/, ""),
                }
              );
            } else if (item.includes("背番号変更")) {
              const [oldValue, newValue] = desc.split("→").map(s => s.trim());
              Object.assign(o, { primaryNumber: oldValue });
              result.push(
                {
                  date,
                  jaEvent,
                  jaEventDetails: desc,
                  teamCode,
                  playerId,
                  jaRegisteredName,
                  primaryNumber: newValue,
                }
              );
            } else if (item.includes("登録抹消")) {
              result.push(
                {
                  date,
                  jaEvent,
                  event: "OffRegisteredList",
                  jaEventDetails,
                  jaStatus: "登録抹消選手",
                  status: "TemporarilyUnregistered",
                  teamCode,
                  playerId,
                  jaRegisteredName,
                  jaPrimaryPosition,
                }
              );
            } else if (item.includes("支配下選手登録（")) {
              result = [Object.assign(o, { jaEventDetails, jaPrimaryPosition })]
            } else {
              result = [o, note];
            }
          });
          return result;
        })
        ;
      return data;
    })
    .flat()
    .sort((a, b) => {
      if (a.date > b.date) return 1;
      if (a.date < b.date) return -1;
      const [aa, bb] = [a, b].map((c) => [
        1,
        c.jaEventDetails ? 1 : 0,
        ["支配下選手登録抹消", "支配下選手登録"].indexOf(c.jaEvent),
      ].join(""));
      return aa - bb;
    })
    .map((o) => {
      if (!o.jaRegisteredName) console.log(o);
      o.jaRegisteredName = o.jaRegisteredName.replace(/ /g, "　");
      return o;
    })
    .filter(({ jaEvent }) => !["自由契約選手", "任意引退選手"].includes(jaEvent))
    .map((o) => {
      const prop = props.find((p) => p.playerId === o.playerId);
      //if (!prop?.fullLFMName) console.dir([o]);
      return Object.assign({}, o, prop);
    })
    ;
}

async function load_retired(season) {
  const infile = `${scrapedDir}/npb${season}-retired.json`;
  const inputs = JSON.parse(await readFile(infile, 'utf8'));

  return inputs.rows
    .map(({ date, teamCode, jaPosition, primaryNumber, playerId, jaRegisteredName }) => {
      return {
        date,
        jaEvent: "任意引退選手公示",
        event: "Retired",
        jaStatus: "任意引退選手",
        status: "RetiredPlayer",
        teamCode,
        playerId,
        jaRegisteredName,
        primaryNumber,
        jaPrimaryPosition: jaPosition,
      }
    })
    ;
}

function mmddToDate(mmdd, year) {
  const date = [
    (mmdd.startsWith("12") ? Number(year) - 1 : year),
    ...mmdd.split("/").map((n) => n.padStart(2, "0"))
  ].join("-");
  return date;
}

const template = {
  "date": undefined,
  "playerId": undefined,
  "teamCode": undefined,
  "jaEvent": undefined,
  "jaStatus": undefined,
  "jaRegisteredName": undefined,
  "jaPrimaryPosition": undefined,
  "jaEventDetails": undefined,
  "event": undefined,
  "status": undefined,
  "fullLFMName": undefined,
  "primaryNumber": undefined,
  "primaryPosition": undefined,
  "birthDate": undefined,
  "height": undefined,
  "weight": undefined,
  "pitchHand": undefined,
  "batSide": undefined,
  "eventDetails": undefined,
}

const teamCodes = [
  "H", "F", "B", "E", "L", "M", "T", "DB", "G", "D", "C", "S"
];

function getTeamCodes(season = "2026") {
  return ({
    "2026": ["H", "F", "B", "E", "L", "M", "T", "DB", "G", "D", "C", "S"],
    "2025": ["G", "T", "DB", "C", "S", "D", "H", "F", "M", "E", "B", "L"],
  })[season];
}

function byRosterEvents(a, b) {
  const aa = makeSortKey(a);
  const bb = makeSortKey(b);
  return aa.localeCompare(bb);
}

function makeSortKey(c) {
  const season = c.date.slice(0, 4);
  const teamCodes = getTeamCodes(season);
  return [
    c.date,
    c.jaEventDetails === "現役ドラフトに伴うトレード" ? "1" : "0",
    c.jaEventDetails ? "1" : "0",
    c.jaEvent === "支配下選手登録抹消" ? "0" : "1",
    String(teamCodes.indexOf(c.teamCode)).padStart(2, "0"),
  ].join(".");
}


export {
  template,
  teamCodes,
  load_reserved,
  load_released,
  load_registered,
  load_retired,
  byRosterEvents,
}