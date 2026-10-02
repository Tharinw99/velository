const fs = require('fs');

async function run() {
  console.log('Fetching games.js from ugs-singlefile...');
  const res = await fetch('https://cdn.jsdelivr.net/gh/bubbls/ugs-singlefile@main/games.js');
  const code = await res.text();

  const match = code.match(/let\s+files\s*=\s*\[([\s\S]*?)\]/);
  if (!match) {
    console.error('Could not find files array in games.js');
    process.exit(1);
  }

  const files = eval('[' + match[1] + ']');
  console.log('Found', files.length, 'games in games.js');

  const canonicalMap = {
    '1v1lol': '1v1.LOL',
    '1v1tennis': '1v1 Tennis',
    '2048': '2048',
    '2048cupcakes': '2048 Cupcakes',
    '3dash': '3Dash',
    '3dasheditor': '3Dash Editor',
    '3dpinballspacecadet': '3D Pinball: Space Cadet',
    '8ballpool': '8 Ball Pool',
    '8ballclassic': '8 Ball Classic',
    '99balls': '99 Balls',
    'adarkroom': 'A Dark Room',
    'adatewithdeath': 'A Date with Death',
    'adayintheoffice': 'A Day in the Office',
    'adofai': 'A Dance of Fire and Ice',
    'advancewars': 'Advance Wars',
    'advancewars2': 'Advance Wars 2',
    'advancewarsdualstrike': 'Advance Wars: Dual Strike',
    'ageofwar': 'Age of War',
    'ageofwar2': 'Age of War 2',
    'badicecream': 'Bad Ice-Cream',
    'badicecream2': 'Bad Ice-Cream 2',
    'badicecream3': 'Bad Ice-Cream 3',
    'bitlife': 'BitLife',
    'bloonstd': 'Bloons TD',
    'bloonstd2': 'Bloons TD 2',
    'bloonstd3': 'Bloons TD 3',
    'bloonstd4': 'Bloons TD 4',
    'bloonstd5': 'Bloons TD 5',
    'cookieclicker': 'Cookie Clicker',
    'crossyroad': 'Crossy Road',
    'csgo': 'Counter-Strike',
    'cuttherope': 'Cut the Rope',
    'cuttheropetimetravel': 'Cut the Rope: Time Travel',
    'drivemad': 'Drive Mad',
    'doodlemins': 'Doodle God',
    'ducklife': 'Duck Life',
    'ducklife2': 'Duck Life 2',
    'ducklife3': 'Duck Life 3',
    'ducklife4': 'Duck Life 4',
    'fnaf': "Five Nights at Freddy's",
    'fnaf2': "Five Nights at Freddy's 2",
    'fnaf3': "Five Nights at Freddy's 3",
    'fnaf4': "Five Nights at Freddy's 4",
    'fridaynightfunkin': "Friday Night Funkin'",
    'fnf': "Friday Night Funkin'",
    'getawayshootout': 'Getaway Shootout',
    'geometrydash': 'Geometry Dash',
    'happywheels': 'Happy Wheels',
    'holeio': 'Hole.io',
    'motox3m': 'Moto X3M',
    'motox3m2': 'Moto X3M 2',
    'motox3m3': 'Moto X3M 3',
    'motox3mpoolparty': 'Moto X3M Pool Party',
    'motox3mspooky': 'Moto X3M Spooky Land',
    'motox3mwinter': 'Moto X3M Winter',
    'paperio2': 'Paper.io 2',
    'paperio3d': 'Paper.io 3D',
    'retrobowl': 'Retro Bowl',
    'retrobowlcollege': 'Retro Bowl College',
    'rooftopsnipers': 'Rooftop Snipers',
    'rooftopsnipers2': 'Rooftop Snipers 2',
    'run3': 'Run 3',
    'slope': 'Slope',
    'slope2': 'Slope 2',
    'sloperun': 'Slope Run',
    'smashkarts': 'Smash Karts',
    'subwaysurfers': 'Subway Surfers',
    'subwaysurfersmiami': 'Subway Surfers: Miami',
    'subwaysurferstokyo': 'Subway Surfers: Tokyo',
    'subwaysurferswinter': 'Subway Surfers: Winter Holiday',
    'supermario64': 'Super Mario 64',
    'templerun2': 'Temple Run 2',
    'thereisnogame': 'There Is No Game',
    'tunnelrush': 'Tunnel Rush',
    'vex3': 'Vex 3',
    'vex4': 'Vex 4',
    'vex5': 'Vex 5',
    'vex6': 'Vex 6',
    'vex7': 'Vex 7',
    'wordle': 'Wordle',
  };

  function toOfficialName(raw) {
    let name = raw.replace(/^cl[-_]?/i, '');
    name = name.replace(/\.html?$/i, '');
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (canonicalMap[key]) return canonicalMap[key];

    if (name.includes(' ')) {
      return name.replace(/\s+/g, ' ').trim();
    }

    name = name.replace(/[-_]/g, ' ');
    name = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
    name = name.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
    name = name.replace(/\s+/g, ' ').trim();
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  function detectGenre(title, filename) {
    const s = (title + ' ' + filename).toLowerCase();
    if (
      s.includes('soccer') ||
      s.includes('tennis') ||
      s.includes('basketball') ||
      s.includes('football') ||
      s.includes('golf') ||
      s.includes('baseball') ||
      s.includes('bowl') ||
      s.includes('skate') ||
      s.includes('bike') ||
      s.includes('moto') ||
      s.includes('race') ||
      s.includes('racing') ||
      s.includes('drift')
    )
      return 'Sports';
    if (
      s.includes('puzzle') ||
      s.includes('2048') ||
      s.includes('maze') ||
      s.includes('escape') ||
      s.includes('word') ||
      s.includes('chess') ||
      s.includes('sudoku') ||
      s.includes('physics') ||
      s.includes('slice') ||
      s.includes('cut')
    )
      return 'Puzzle';
    if (
      s.includes('retro') ||
      s.includes('nes') ||
      s.includes('snes') ||
      s.includes('gba') ||
      s.includes('mario') ||
      s.includes('sonic') ||
      s.includes('pokemon') ||
      s.includes('zelda') ||
      s.includes('arcade') ||
      s.includes('pacman') ||
      s.includes('space cadet')
    )
      return 'Retro';
    if (
      s.includes('war') ||
      s.includes('defense') ||
      s.includes('tower') ||
      s.includes('strategy') ||
      s.includes('tactics') ||
      s.includes('civilization') ||
      s.includes('conquest')
    )
      return 'Strategy';
    if (
      s.includes('idle') ||
      s.includes('clicker') ||
      s.includes('casual') ||
      s.includes('cookie') ||
      s.includes('flappy') ||
      s.includes('doodle') ||
      s.includes('room') ||
      s.includes('life')
    )
      return 'Casual';
    if (
      s.includes('shoot') ||
      s.includes('bullet') ||
      s.includes('sniper') ||
      s.includes('combat') ||
      s.includes('gun') ||
      s.includes('fight') ||
      s.includes('battle') ||
      s.includes('fnaf') ||
      s.includes('run') ||
      s.includes('dash') ||
      s.includes('slope') ||
      s.includes('smash') ||
      s.includes('surfer')
    )
      return 'Action';
    return 'Arcade';
  }

  const seenIds = new Set();
  const games = [];

  for (let idx = 0; idx < files.length; idx++) {
    const file = files[idx];
    const officialTitle = toOfficialName(file);
    const normalizedFileName = file.includes('.') ? file : file + '.html';
    const encoded = encodeURIComponent(normalizedFileName);
    const cdnUrl = `https://cdn.jsdelivr.net/gh/bubbls/ugs-singlefile/UGS-Files/${encoded}`;
    const genre = detectGenre(officialTitle, file);

    let baseId = 'ugs-' + (file.toLowerCase().replace(/[^a-z0-9]/g, '') || idx);
    let id = baseId;
    let counter = 1;
    while (seenIds.has(id)) {
      id = `${baseId}-${counter++}`;
    }
    seenIds.add(id);

    games.push({
      id,
      title: officialTitle,
      genre,
      type: 'html',
      codeOrUrl: cdnUrl,
      originalFileName: normalizedFileName,
      plays: 0,
      isFavorite: false,
      addedAt: Date.now() - idx * 100,
    });
  }

  console.log('Sample parsed games:');
  console.log(games.slice(0, 5));
  console.log('Total parsed games:', games.length);

  fs.mkdirSync('./src/data', { recursive: true });
  fs.writeFileSync('./src/data/ugsGames.json', JSON.stringify(games));
  console.log(
    'Successfully written to ./src/data/ugsGames.json! Size:',
    (fs.statSync('./src/data/ugsGames.json').size / 1024).toFixed(1),
    'KB'
  );
}

run();
