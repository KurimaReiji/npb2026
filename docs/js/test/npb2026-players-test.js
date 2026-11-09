import { getPlayers, createFindPlayerById } from '../npb2026-players.js';
import * as chai from "chai";

let findPlayerOnMay12, findPlayerOnMay13;

before(async function () {
  findPlayerOnMay12 = await createFindPlayerById(await getPlayers('2026-05-12'));
  findPlayerOnMay13 = await createFindPlayerById(await getPlayers('2026-05-13'));
})

describe("Registered players on May 12", async function () {
  it("should return Yamamoto as a Baystar, Ogata as a Hawk", function () {
    const yuudai = findPlayerOnMay12('23125136');
    const ogata = findPlayerOnMay12('61365136');
    chai.expect(ogata.teamCode).to.equal('H');
    chai.expect(yuudai.teamCode).to.equal('DB');
  });
});

describe("Registered players on May 13", async function () {
  it("should return Yamamoto as a Hawk, Ogata as a Baystar", function () {
    const yuudai = findPlayerOnMay13('23125136');
    const ogata = findPlayerOnMay13('61365136');
    chai.expect(ogata.teamCode).to.equal('DB');
    chai.expect(yuudai.teamCode).to.equal('H');
  });
});

describe("Registered players on July 31", async function () {
  it("should return correct numbers", async function () {
    const playersOnJul31 = await getPlayers('2026-07-31');
    const dragons = playersOnJul31.filter((player) => player.teamCode === 'D' && player.status === "RegisteredPlayer");
    chai.expect(dragons.length).to.equal(70);
  });
});
