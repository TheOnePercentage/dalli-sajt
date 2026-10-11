const fs = require('fs');
let js = fs.readFileSync('js/app.js', 'utf8');
const lines = js.split('\n');

// Fix line 647 - should be `}).join('')};`
if (lines[646] && lines[646].trim() === '});') {
  lines[646] = '  });.join(\'\')};';
  console.log('Fixed line 647');
}

// Fix line 1357
if (lines[1356] && lines[1356].trim() === '});') {
  lines[1356] = '  }).join(\'\')};';
  console.log('Fixed line 1357');
}

// Fix line 2778
if (lines[2777] && lines[2777].trim() === '});') {
  lines[2777] = '  }).join(\'\')};';
  console.log('Fixed line 2778');
}

// Fix line 2989
if (lines[2988] && lines[2988].trim() === '});') {
  lines[2988] = '  }).join(\'\')};';
  console.log('Fixed line 2989');
}

// Fix line 3180
if (lines[3179] && lines[3179].trim() === '});') {
  lines[3179] = '  }).join(\'\')};';
  console.log('Fixed line 3180');
}

// Fix line 3181
if (lines[3180] && lines[3180].trim() === '});') {
  lines[3180] = '  }).join(\'\')};';
  console.log('Fixed line 3181');
}

// Fix line 3180 again (now 3181 might be 3181)
if (lines[3180] && lines[3180].trim() === '});') {
  lines[3180] = '  }).join(\'\')};';
  console.log('Fixed line 3181 (second)');
}

// Fix line 3181 (now 3181)
if (lines[3180] && lines[3180].trim() === '});') {
  lines[3180] = '  }).join(\'\')};';
  console.log('Fixed line 3181');
}

// Fix line 3181
if (lines[3180] && lines[3180].includes('});')) {
  lines[3180] = lines[3180].replace('});', '}).join(\'\')};');
  console.log('Fixed line 3181 via replace');
}

// Fix line 3181 (second occurrence)
if (lines[3181] && lines[3181].trim() === '});') {
  lines[3180] = lines[3180].replace('});', '}).join(\'\')};');
  console.log('Fixed line 3181');
}

fs.writeFileSync('js/app.js', lines.join('\n'));
console.log('Done');