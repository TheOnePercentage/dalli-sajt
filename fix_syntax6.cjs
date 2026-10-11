const fs = require('fs');
let js = fs.readFileSync('js/app.js', 'utf8');
const lines = js.split('\n');

// Fix line 647 (index 646) - needs to be `}).join('')};`
if (lines[646] && lines[646].trim() === '});') {
  lines[646] = lines[646].replace('});', '}).join(\'\')};');
  console.log('Fixed line 647');
}

// Also fix line 1357 (index 1356) - similar issue in renderProductGrid
if (lines[1356] && lines[1356].trim() === '});') {
  lines[1356] = lines[1356].replace('});', '}).join(\'\')};');
  console.log('Fixed line 1357');
}

// Fix line 2778 (index 2777)
if (lines[2777] && lines[2777].trim() === '});') {
  lines[2777] = lines[2777].replace('});', '}).join(\'\')};');
  console.log('Fixed line 2778');
}

// Fix line 2989 (index 2988)
if (lines[2988] && lines[2988].trim() === '});') {
  lines[2988] = lines[2988].replace('});', '}).join(\'\')};');
  console.log('Fixed line 2989');
}

// Fix line 3180 (index 3179)
if (lines[3179] && lines[3179].trim() === '});') {
  lines[2988] = lines[2988].replace('});', '}).join(\'\')};');
  console.log('Fixed line 2989');
}

fs.writeFileSync('js/app.js', lines.join('\n'));
console.log('Done');