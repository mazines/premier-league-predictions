// Season data — 2021/22.
// Loaded by pages/2021-2022.html and by index.html, so the season page and the
// home tiles read the same numbers.
window.SEASONS = window.SEASONS || {};
window.SEASONS['2021-2022'] = {
        topN: 7,
        hasReleg: false,
        hasMegaBonus: true,
        awards: [
          { key:'poty',  label:'PFA POTY',  max:2 },
          { key:'ypoty', label:'PFA YPOTY', max:2 },
        ],
        actualResults: {
          topN:  ['MCI','LIV','CHE','TOT','ARS','MUN','WHU'],
          poty:'Mo Salah', ypoty:'Phil Foden',
        },
        predictions: {
          Amin: { topN:['CHE','MCI','LIV','MUN','TOT','LEI','ARS'],  poty:'Romelu Lukaku',     ypoty:'Mason Greenwood' },
          Anas: { topN:['CHE','MCI','MUN','LIV','TOT','LEI','ARS'],  poty:'Cristiano Ronaldo', ypoty:'Mason Greenwood' },
          Arya: { topN:['CHE','MUN','MCI','TOT',null,null,null],     poty:'Romelu Lukaku',     ypoty:'Jadon Sancho' },
          AY: { topN:['MCI','LIV','MUN','CHE','TOT','LEI','LEE'],  poty:'Rúben Dias',        ypoty:'Mason Greenwood' },
          'K Mogz': { topN:['MUN','CHE','MCI','LIV','TOT','WHU','LEI'],  poty:'Cristiano Ronaldo', ypoty:'Mason Greenwood' },
          Kareem: { topN:['CHE','MCI','MUN','LIV','LEI','ARS','TOT'],  poty:'Bruno Fernandes',   ypoty:'Bukayo Saka' },
          'Khalid M': { topN:['CHE','MCI','MUN','LIV','TOT','WHU','LEI'],  poty:'Paul Pogba',        ypoty:'Mason Greenwood' },
          Kibz: { topN:['MUN','MCI','CHE','LIV','TOT','WHU','LEI'],  poty:'Romelu Lukaku',     ypoty:'Mason Greenwood' },
          Mazine: { topN:['CHE','MUN','MCI','LIV','TOT','LEI','WHU'],  poty:'Mo Salah',          ypoty:'Mason Greenwood' },
          'Mo Motasim': { topN:['MCI','CHE','MUN','LIV','LEI','WHU',null],   poty:'Kevin De Bruyne',   ypoty:'Mason Greenwood' },
          Tawfeeg: { topN:['CHE','MCI','LIV','MUN','WHU','LEI','TOT'],  poty:'Cristiano Ronaldo', ypoty:'Mason Greenwood' },
          Yousif: { topN:['CHE','MCI','MUN','LIV','LEI','TOT','WHU'],  poty:'Cristiano Ronaldo', ypoty:'Mason Greenwood' },
        },
      };
