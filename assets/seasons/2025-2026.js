// Season data — 2025/26.
// Loaded by pages/2025-2026.html and by index.html, so the season page and the
// home tiles read the same numbers.
window.SEASONS = window.SEASONS || {};
window.SEASONS['2025-2026'] = {
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
          topN:  ['ARS','MCI','MUN','AVL','LIV','BOU'],
          releg: ['WHU','BUR','WOL'],
          poty:'Bruno Fernandes', ypoty:"Nico O'Reilly", gb:'Erling Haaland',
          play:'Bruno Fernandes', gg:'David Raya', mgr:'Mikel Arteta',
        },
        predictions: {
          Abdu: { topN:['LIV','MCI','CHE','NEW','ARS','MUN'], releg:['TOT','WHU','SUN'], poty:'Cole Palmer',    ypoty:'Ethan Nwaneri',    gb:'Mo Salah',        play:'Cole Palmer',     gg:'Ederson',              mgr:'Arne Slot' },
          Alvin: { topN:['CHE','ARS','LIV','MCI','AVL','MUN'], releg:['LEE','BUR','SUN'], poty:'Florian Wirtz',  ypoty:'Rayan Cherki',     gb:'Erling Haaland',  play:'Cole Palmer',     gg:'Gianluigi Donnarumma', mgr:'Arne Slot' },
          Ilyaas: { topN:['ARS','LIV','MCI','CHE','TOT','AVL'], releg:['LEE','BUR','WOL'], poty:'Bukayo Saka',    ypoty:'Cole Palmer',      gb:'Erling Haaland',  play:'Mo Salah',        gg:'David Raya',           mgr:'Mikel Arteta' },
          'K Mogz': { topN:['LIV','CHE','MCI','ARS','MUN','TOT'], releg:['LEE','WOL','SUN'], poty:'Bryan Mbeumo',   ypoty:null,               gb:'Mo Salah',        play:null,              gg:null,                   mgr:null },
          Kareem: { topN:['ARS','LIV','MCI','CHE','NEW','MUN'], releg:['LEE','BUR','WOL'], poty:'Florian Wirtz',  ypoty:'Myles Lewis-Skelly', gb:'Viktor Gyökeres', play:'Florian Wirtz',  gg:'David Raya',           mgr:'Mikel Arteta' },
          Mazine: { topN:['ARS','LIV','MCI','AVL','MUN','NFO'], releg:['BOU','BUR','WOL'], poty:'Bruno Fernandes', ypoty:'Rayan Cherki',    gb:'Erling Haaland',  play:'Bruno Fernandes', gg:'David Raya',           mgr:'Unai Emery' },
          'Mohamed E': { topN:['LIV','MCI','CHE','ARS','MUN','NEW'], releg:['BUR','WOL','SUN'], poty:'Cole Palmer',    ypoty:null,               gb:'Mo Salah',        play:'Bruno Fernandes', gg:null,                   mgr:'Rúben Amorim' },
          Osman: { topN:['LIV','ARS','MCI','CHE','AVL','MUN'], releg:['BUR','WOL','SUN'], poty:'Bukayo Saka',    ypoty:'Rayan Cherki',     gb:'Erling Haaland',  play:'Mo Salah',        gg:'David Raya',           mgr:'Unai Emery' },
          Sabz: { topN:['ARS','MCI','LIV','CHE','TOT','AVL'], releg:['LEE','BUR','WOL'], poty:'Cole Palmer',    ypoty:'Carlos Baleba',    gb:'Erling Haaland',  play:'Florian Wirtz',   gg:'David Raya',           mgr:'Thomas Frank' },
          Tawfeeg: { topN:['LIV','ARS','MCI','CHE','TOT','MUN'], releg:['LEE','BUR','WHU'], poty:'Mo Salah',       ypoty:'Florian Wirtz',    gb:'Erling Haaland',  play:'Cole Palmer',     gg:'Gianluigi Donnarumma', mgr:'Rúben Amorim' },
          Tosin: { topN:['CHE','MCI','ARS','LIV','MUN','CRY'], releg:['LEE','BUR','SUN'], poty:'Cole Palmer',    ypoty:'Cole Palmer',      gb:'Erling Haaland',  play:'Cole Palmer',     gg:'Robert Sánchez',       mgr:'Enzo Maresca' },
        },
              hot: {
          "Abdu": {
            "disappointment": "Man UTD.",
            "surprise": "Arsenal."
          },
          "Ilyaas": {
            "disappointment": "Newcastle — horrible summer window, and worse if they lose Isak. They didn't do good last time they had to balance league and CL.",
            "surprise": "Tottenham making Champions League after being 17th — they're gonna be hard to score against with their new system even if they don't score a lot."
          },
          "Kareem": {
            "disappointment": "Isak.",
            "surprise": "United getting Europe."
          },
          "Mazine": {
            "disappointment": "Bournemouth will drop with both CBs sold.",
            "surprise": "Pep will be out of his depth; Liverpool 2nd depending on Guehi/Semenyo signing."
          },
          "Osman": {
            "disappointment": "Seskoffender.",
            "surprise": "Dan James — because Leeds are gonna stay up."
          },
          "Sabz": {
            "disappointment": "Liverpool (InshAllah). Arne Slot will be on fraud watch — the team he won with was a ready-made Klopp project last season and everyone else happened to be struggling/injury-prone. Too many chefs in the kitchen after the transfer window; expect a repeat of Madrid's 24/25.",
            "surprise": "Tottenham and Forest will both qualify for Europe next season; Spurs can challenge for top 5."
          },
          "Tawfeeg": {
            "disappointment": "Seskoffender — he won't be bad but people will expect too much from him in his first season.",
            "surprise": "Grealish — unc still got it."
          }
        },
};
