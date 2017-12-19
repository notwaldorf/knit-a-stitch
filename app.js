colsInput.addEventListener('input', updateGrid);
rowsInput.addEventListener('input', updateGrid);

container.addEventListener('click', onClick);
container.addEventListener('mousedown', function(event) {
  window.startDrag = true;
  onClick(event);
});
container.addEventListener('mouseup', function() {
  window.startDrag = false;
});
container.addEventListener('mouseover', function(event) {
  if (window.startDrag) {
    onClick(event);
  }
})


// If there is a location, parse it.
if (window.location.hash) {
  // This calls updateGrid with the right size;
  parsePattern(decodeURIComponent(window.location.hash.slice(1)));
} else {
  updateGrid();
}

function updateGrid() {
  let numRows = parseInt(rowsInput.value);
  let numCols = parseInt(colsInput.value);

  // No messing around.
  if (numRows < 0) numRows = 0;
  if (numCols < 0) numCols = 0;

  // Do we need to resize the font?
  const width = container.getBoundingClientRect().width;
  const fontSizeThatFits = Math.floor(width / numCols) - 2;
  container.style.fontSize = fontSizeThatFits + 'px';
  
  // Don't lose the existing content. Add or remove rows from the end as needed.
  const currentRows = container.querySelectorAll('div.row').length;

  // Deal with the rows.
  if (numRows > currentRows) {
    // Add new ones.
    const diff = numRows - currentRows;
    for (let i = 0; i < diff; i++) {
      const div = document.createElement('div');
      container.appendChild(div);
      div.className = 'row'
      addThisManyColumns(div, numCols);
    }
  } else if (numRows < currentRows) {
    // Delete the bonus ones.
    deleteLastChildThisManyTimes(container, currentRows - numRows);
  }

  // Now deal with the columns.
  const allRows = container.querySelectorAll('div.row');
  const currentCols = allRows.length > 0 ?
      allRows[0].querySelectorAll('button').length : 0;

  if (numCols > currentCols) {
    // Add a new column in every row.
    const diff = numCols - currentCols;
    for (let i = 0; i < allRows.length; i++) {
      addThisManyColumns(allRows[i], diff);
    }
  } else if (numCols < currentCols) {
    // Delete columns from every row
    const diff = currentCols - numCols;
    for (let i = 0; i < allRows.length; i++) {
      deleteLastChildThisManyTimes(allRows[i], diff);
    }
  }
}

function addThisManyColumns(node, num) {
  for (let i = 0; i < num; i++) {
    const btn = document.createElement('button');
    btn.textContent = '⬜️';
    node.appendChild(btn);
  }
}

function deleteLastChildThisManyTimes(node, num) {
  let deleted = 0;
  while (deleted !== num) {
    node.removeChild(node.lastChild);
    deleted++;
  }
}

function onClick(event) {
  const button = event.target;
  if (button.localName !== 'button') {
    return;
  }
  button.textContent = stitchSelect.value;
}

function getPattern() {
  let pattern = '';
  let mapOfRows = {};
  let patternRow = 1;
  let fullState = '';  // to encode in the hash.
  const rowList = container.querySelectorAll('div.row');
  for (let row of rowList) {
    const [full, line] = getPatternLine(row.querySelectorAll('button'));

    // Skip this line if it's empty.
    if (line === '') {
      continue;
    }

    fullState += full + '\n';

    // If we've seen this line before, do a repeat. Else, add it for later.
    if (mapOfRows[line] !== undefined) {
      pattern += `Row ${patternRow}: Repeat row ${mapOfRows[line]}\n`;
    } else {
      pattern += `Row ${patternRow}: ${line}\n`;
      mapOfRows[line] = patternRow;
    }
    patternRow++;
  }

  thatHR.hidden = pattern.trim() === '';
  patternOutput.textContent = `${pattern}`;

  window.location.hash = `#${encodeURIComponent(fullState)}`;
}

function getPatternLine(line) {
  let pattern = '';
  for (let i = 0; i < line.length; i++) {
    pattern += translateStitch(line[i].textContent);
  }

  // Can we summarize repeated consecutive stitches?
  return [pattern, summarize(pattern)];
}

function translateStitch(stitch) {
  switch (stitch) {
    case '✖️':
      return 'K '
      break;
    case '➖':
      return 'P '
      break;
    case '🔘':
      return 'YO '
      break;
    case '／':
      return 'K2tog '
      break;
    case '＼':
      return 'SSK '
      break;
    default:
      return ''
  }
}

function translateText(text) {
  switch (text.toLowerCase()) {
    case 'k':
      return '✖️'
      break;
    case 'p':
      return '➖'
      break;
    case 'yo':
      return '🔘'
      break;
    case 'k2tog':
      return '／'
      break;
    case 'ssk':
      return '＼'
      break;
    default:
      return ''
  }
}

function summarize(line) {
  const stitches = line.split(' ');
  let summarizedLine = '';
  let sequenceStitch = '';
  let sequenceCount = 0;

  for (stitch of stitches) {
    // If this is in the sequence stitch, add a new one to it.
    if (sequenceStitch === stitch) {
      sequenceCount++;
    } else {
      // This is a new sequence! Add the old one (unless this is the first run) and reset.
      if (sequenceCount === 1) {
        // Ok if this isn't a knit or a purl, we don't say 1.
        if (sequenceStitch === 'K' || sequenceStitch === 'P') {
          summarizedLine += sequenceStitch + sequenceCount + ' ';
        } else {
          summarizedLine += sequenceStitch + ' ';
        }
      } else if (sequenceCount !== 0) {
        // If this isn't a K or a P, do a better job at the sequenceCount
        if (sequenceStitch === 'K' || sequenceStitch === 'P') {
          summarizedLine += sequenceStitch + sequenceCount + ' ';
        } else {
          summarizedLine += `(${sequenceStitch})x${sequenceCount} `;
        }
      }

      sequenceStitch = stitch;
      sequenceCount = 1;
    }
  }
  // Do we have a sequence we haven't added?
  if (sequenceStitch != 0) {
    summarizedLine += sequenceStitch + sequenceCount + ' ';
  }
  return summarizedLine;
}

// TODO: this function really sucks and duplicates things a billion times.
// But it's also midnight and maybe I don't care that much?
function parsePattern(pattern) {
  console.log('applying', pattern);
  const lines = pattern.trim().split('\n');

  // First, make the grid the right size.
  rowsInput.value = lines.length;
  let longestRow = 0;

  for (line of lines) {
    const row = line.trim().split(' ');
    longestRow = Math.max(longestRow, row.length);
  }
  colsInput.value = longestRow;
  updateGrid();

  // Now fill it in.
  const allRows = container.querySelectorAll('div.row');
  for (let i = 0; i < lines.length; i++) {
    const row = lines[i].trim().split(' ');
    const allCols = allRows[i].children;
    for (let j = 0; j < row.length; j++) {
      allCols[j].textContent = translateText(row[j]);
    }
  }
}
