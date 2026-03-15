import { findVenue } from '../docs/js/npb2026-venues.js';
import * as chai from "chai";

describe("Venues for 2026 Season", async function () {

  it("should return 'Vantelin Dome'", function () {
    const nagoyaDome = findVenue('バンテリンドーム');
    chai.expect(nagoyaDome.boxscoreName).to.equal('Vantelin Dome');
  });

  it("should return 'Morioka'", function () {
    const kitagin = findVenue('盛　岡');
    const kitagin2 = findVenue('いわて盛岡ボールパーク');
    chai.expect(kitagin.boxscoreName).to.equal('Morioka');
    chai.expect(kitagin2.boxscoreName).to.equal('Morioka');
  });

  it("should return 'Rakuten Mobile SAIKYO Park Miyagi'", function () {
    const venue = findVenue('楽天モバイル');
    chai.expect(venue.name).to.equal('Rakuten Mobile SAIKYO Park Miyagi');
  });

  it("should return '長野'", function () {
    const venue = findVenue('長野オリンピックスタジアム');
    chai.expect(venue.jaBoxscoreName).to.equal('長野');
  });

  it("should return '岐阜'", function () {
    const venue = findVenue('ぎふしん長良川球場');
    chai.expect(venue.jaBoxscoreName).to.equal('岐阜');
  });

  it("should return 'Naha'", function () {
    const naha = findVenue('那　覇');
    const naha2 = findVenue('那覇市営奥武山野球場');
    chai.expect(naha.boxscoreName).to.equal('Naha');
    chai.expect(naha2.boxscoreName).to.equal('Naha');
    chai.expect(naha.name).to.equal('Okinawa Cellular Stadium Naha');
  });
});
