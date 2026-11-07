// Season data — 2024/25.
// Loaded by pages/2024-2025.html and by index.html, so the season page and the
// home tiles read the same numbers.
window.SEASONS = window.SEASONS || {};
window.SEASONS['2024-2025'] = {
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
          topN:  ['LIV','ARS','MCI','CHE','NEW','AVL'],
          releg: ['IPS','LEI','SOU'],
          poty:'Mo Salah', ypoty:'Cole Palmer', gb:'Mo Salah',
          play:'Mo Salah', gg:'David Raya', mgr:'Arne Slot',
        },
        predictions: {
          Alvin:  { topN:['LIV','MCI','ARS','CHE','TOT','MUN'], releg:['BOU','BRE','SOU'], poty:'Kevin De Bruyne', ypoty:'Kobbie Mainoo', gb:'Darwin Núñez',  play:'Kevin De Bruyne', gg:null,         mgr:null },
          Ilyaas: { topN:['ARS','MCI','TOT','MUN','LIV','CHE'], releg:['IPS','LEI','SOU'], poty:'Declan Rice',     ypoty:'Kobbie Mainoo', gb:'Erling Haaland', play:'Martin Ødegaard', gg:'David Raya', mgr:'Mikel Arteta' },
          Kareem: { topN:['MCI','ARS','LIV','TOT','CHE','MUN'], releg:['IPS','NFO','SOU'], poty:'Erling Haaland',  ypoty:'Bukayo Saka',   gb:'Erling Haaland', play:'Ollie Watkins',   gg:'David Raya', mgr:'Mikel Arteta' },
          Osman:  { topN:['ARS','MCI','LIV','CHE','MUN','WHU'], releg:['BOU','IPS','NFO'], poty:'Bukayo Saka',     ypoty:'Kobbie Mainoo', gb:'Erling Haaland', play:'Bruno Fernandes', gg:'David Raya', mgr:'Mikel Arteta' },
        },
      };
