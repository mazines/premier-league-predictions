// Season data — 2022/23.
// Loaded by pages/2022-2023.html and by index.html, so the season page and the
// home tiles read the same numbers.
window.SEASONS = window.SEASONS || {};
window.SEASONS['2022-2023'] = {
        topN: 6,
        hasReleg: true,
        hasMegaBonus: true,
        awards: [
          { key:'poty',  label:'PFA POTY',     max:2 },
          { key:'ypoty', label:'PFA YPOTY',    max:2 },
          { key:'gb',    label:'Golden Boot',  max:1 },
          { key:'gg',    label:'Golden Glove', max:1 },
        ],
        actualResults: {
          topN:  ['MCI','ARS','MUN','NEW','LIV','BHA'],
          releg: ['LEI','LEE','SOU'],
          poty:'Erling Haaland', ypoty:'Bukayo Saka', gb:'Erling Haaland', gg:'David de Gea',
        },
        predictions: {
          'K Mogz': { topN:['MCI','ARS','MUN','LIV','CHE','TOT'], releg:null,                poty:'Erling Haaland', ypoty:'Antony',          gb:'Erling Haaland',     gg:'Ederson' },
          Kareem: { topN:['MCI','LIV','ARS','CHE','TOT','WHU'], releg:['LEE','NFO','BRE'], poty:'Erling Haaland', ypoty:'Bukayo Saka',     gb:'Erling Haaland',     gg:'Aaron Ramsdale' },
          'Khalid M': { topN:['MCI','LIV','CHE','ARS','TOT','MUN'], releg:['BOU','NFO','WOL'], poty:'Erling Haaland', ypoty:'Erling Haaland',  gb:'Erling Haaland',     gg:'Alisson Becker' },
          Kibz: { topN:['MCI','LIV','ARS','MUN','TOT','CHE'], releg:['BOU','FUL','EVE'], poty:'Erling Haaland', ypoty:'Jadon Sancho',    gb:'Erling Haaland',     gg:'Ederson' },
          Mazine: { topN:['MCI','ARS','TOT','LIV','MUN','WHU'], releg:['NFO','BOU','WHU'], poty:'Erling Haaland', ypoty:'Erling Haaland',  gb:'Erling Haaland',     gg:'Ederson' },
          Osman: { topN:['MCI','ARS','LIV','TOT','CHE','MUN'], releg:['BOU','NFO','EVE'], poty:'Erling Haaland', ypoty:'Erling Haaland',  gb:'Erling Haaland',     gg:'Robert Sánchez' },
          'Pai 2': { topN:['MCI','TOT','LIV','ARS','CHE','MUN'], releg:['SOU','LEI','BOU'], poty:'Harry Kane',      ypoty:'Erling Haaland',  gb:'Erling Haaland',     gg:'Ederson' },
          Tawfeeg: { topN:['MCI','LIV','TOT','ARS','CHE','MUN'], releg:['LEE','EVE','FUL'], poty:'Harry Kane',      ypoty:'Bukayo Saka',     gb:'Cristiano Ronaldo',  gg:'Ederson' },
          Yousif: { topN:['MCI','ARS','MUN','LIV','TOT','CHE'], releg:null,                poty:'Erling Haaland', ypoty:'Erling Haaland',  gb:'Erling Haaland',     gg:'Ederson' },
        },
      };
