// Season data — 2023/24.
// Loaded by pages/2023-2024.html and by index.html, so the season page and the
// home tiles read the same numbers.
window.SEASONS = window.SEASONS || {};
window.SEASONS['2023-2024'] = {
        topN: 6,
        hasReleg: true,
        hasMegaBonus: true,
        awards: [
          { key:'poty',  label:'PFA POTY',     max:2 },
          { key:'ypoty', label:'PFA YPOTY',    max:2 },
          { key:'gb',    label:'Golden Boot',  max:1 },
          { key:'play',  label:'Playmaker',    max:1 },
          { key:'gg',    label:'Golden Glove', max:1 },
          { key:'mgr',   label:'MOTY',         max:1 },
        ],
        actualResults: {
          topN:  ['MCI','ARS','LIV','AVL','TOT','CHE'],
          releg: ['LUT','BUR','SHU'],
          poty:'Phil Foden', ypoty:'Cole Palmer', gb:'Erling Haaland',
          play:'Ollie Watkins', gg:'David Raya', mgr:'Pep Guardiola',
        },
        predictions: {
          Dolf: { topN:['MCI','LIV','ARS','BHA','NEW','CHE'], releg:['LUT','SHU','WOL'], poty:'Erling Haaland',   ypoty:'Bukayo Saka',        gb:'Erling Haaland', play:'Martin Ødegaard',   gg:'Nick Pope',       mgr:'Pep Guardiola' },
          Ilyaas: { topN:['MCI','ARS','MUN','LIV','AVL','CHE'], releg:['EVE','LUT','SHU'], poty:'Erling Haaland',   ypoty:'Jurriën Timber',     gb:'Mo Salah',       play:'Kevin De Bruyne',  gg:'Alisson Becker',  mgr:'Mikel Arteta' },
          Kareem: { topN:['MCI','ARS','LIV','MUN','CHE','TOT'], releg:['LUT','SHU','WOL'], poty:'Bukayo Saka',      ypoty:null,                 gb:'Erling Haaland', play:'Martin Ødegaard',   gg:'Aaron Ramsdale',  mgr:'Mikel Arteta' },
          'Khalid M': { topN:['MCI','ARS','NEW','CHE','MUN','LIV'], releg:['LUT','SHU','WOL'], poty:'Erling Haaland',   ypoty:'Bukayo Saka',        gb:'Erling Haaland', play:'Mo Salah',          gg:'Ederson',         mgr:'Pep Guardiola' },
          Kibz: { topN:['MCI','MUN','LIV','CHE','ARS','AVL'], releg:['FUL','LUT','WOL'], poty:'Marcus Rashford',  ypoty:'Nicolas Jackson',    gb:'Erling Haaland', play:'Bruno Fernandes',  gg:'André Onana',     mgr:'Erik ten Hag' },
          Kwamz: { topN:['ARS','MUN','MCI','LIV','CHE','NEW'], releg:['LUT','SHU','WOL'], poty:'Martin Ødegaard',  ypoty:'Alejandro Garnacho', gb:'Erling Haaland', play:'Bruno Fernandes',  gg:'André Onana',     mgr:'Mikel Arteta' },
          Mazine: { topN:['MCI','ARS','NEW','CHE','LIV','MUN'], releg:['EVE','LUT','SHU'], poty:'Rodri',            ypoty:'Bukayo Saka',        gb:'Erling Haaland', play:null,                gg:'Alisson Becker',  mgr:'Eddie Howe' },
          Osman: { topN:['MCI','ARS','LIV','BHA','TOT','MUN'], releg:['LUT','SHU','BUR'], poty:'Rodri',            ypoty:'Ansu Fati',          gb:'Erling Haaland', play:'Kaoru Mitoma',      gg:'Ederson',         mgr:'Roberto De Zerbi' },
          YA: { topN:['MCI','ARS','LIV','CHE','MUN','NEW'], releg:['EVE','LUT','SHU'], poty:'Erling Haaland',   ypoty:'Enzo Fernández',     gb:'Erling Haaland', play:'Kevin De Bruyne',  gg:'Alisson Becker',  mgr:'Mikel Arteta' },
        },
      };
