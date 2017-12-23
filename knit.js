(function() {
  colsInput.addEventListener('change', updateGrid);
  rowsInput.addEventListener('change', updateGrid);

  container.addEventListener('click', onClick);
  container.addEventListener('mousedown', function(event) {
    window.startDrag = true;
    onClick(event);
  });

  document.body.addEventListener('mouseup', function() {
    window.startDrag = false;
  }, true);
  container.addEventListener('mouseover', function(event) {
    if (window.startDrag) {
      onClick(event);
    }
  });
  window.onresize = updateGrid;

})();

function onClick(event) {
  const stitch = event.target;
  if (stitch.className !== 'stitch') {
    return;
  }
  stitch.textContent = stitchSelect.value;
}

// If there is a location, parse it.
if (window.location.hash) {
  // This calls updateGrid with the right size;
  try {
    const decoded = atob(window.location.hash.slice(1));
    parsePattern(decoded);
  } catch(err) {
    window.location.hash = 'not-a-valid-pattern-url';
    updateGrid();
  }
} else {
  updateGrid();
}

function updateGrid() {
  let numRows = parseInt(rowsInput.value);
  let numCols = parseInt(colsInput.value);

  // No messing around.
  if (numRows < 0) numRows = 0;
  if (numCols < 0) numCols = 0;

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
      allRows[0].querySelectorAll('.stitch').length : 0;

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

  // Resize the boxes to fit
  const width = container.getBoundingClientRect().width;
  // I don't know why the 6 works tbh.
  const newSize = Math.floor(width / numCols) - 6;
  // In Chrome, emoji can't be bigger than 128px, because then they don't get rendered.
  container.style.fontSize = Math.min(newSize, 100) + 'px';

  const stitches = container.querySelectorAll('.stitch');
  for (let i = 0; i < stitches.length; i++) {
    stitches[i].style.height = stitches[i].style.width = newSize;
  }
}

function addThisManyColumns(node, num) {
  for (let i = 0; i < num; i++) {
    const btn = document.createElement('span');
    btn.className = 'stitch';
    btn.textContent = '✖️';
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

function reset() {
  const rowList = container.querySelectorAll('div.row');
  for (let i = 0; i < rowList.length; i++) {
    let row = rowList[i];
    const colList = row.querySelectorAll('.stitch');
    for (let j = 0; j < colList.length; j++) {
      colList[j].textContent = '✖️';
    }
  }
  stitchSelect.value = '✖️';
}

function getPattern() {
  let pattern = '';
  let mapOfRows = {};
  let patternRow = 1;
  let fullState = '';  // to encode in the hash.

  // Also, validate as you go along. if you have less than 0 stitches in
  // every row it's bad news bears.
  let totalStitches = parseInt(colsInput.value);
  errorMessage.hidden = true;   // assume good intentions.
  errorMessage.textContent = '';

  const rowList = container.querySelectorAll('div.row');

  // Patterns are read from the bottom row, right corner. Thanks @kosamari!
  for (let i = rowList.length - 1; i >= 0; i--) {
    let row = rowList[i];
    let cols = row.querySelectorAll('.stitch');
    const line = getPatternLine(cols, patternRow % 2 === 0); // on even rows we flip.

    // Skip this line if it's empty.
    if (line === '') {
      continue;
    }

    // Validate.
    totalStitches = getTotalStitchesAfterIncreasesDecreases(totalStitches, cols);

    if (totalStitches <= 0 && errorMessage.hidden) {
      errorMessage.textContent = `⚠️ You have too many decreases on row ${patternRow}, and end up with a negative number of stitches.`;
      errorMessage.hidden = false;
    }

    // If we've seen this line before, do a repeat. Else, add it for later.
    if (mapOfRows[line] !== undefined) {
      pattern += `Row ${patternRow}: Repeat row ${mapOfRows[line]}\n`;
      fullState += `R${mapOfRows[line]}\n`;
    } else {
      pattern += `Row ${patternRow}: ${line}\n`;
      mapOfRows[line] = patternRow;
      fullState += `${line}\n`;
    }
    patternRow++;
  }

  const encoded = btoa(fullState);
  window.location.hash = `#${encoded}`;
  patternLink.href = window.location.href;
  patternOutput.textContent = `${pattern}`;
  thatHR.hidden = patternLink.hidden = pattern.trim() === '';
}

function getPatternLine(line, evenRow) {
  let pattern = '';
  // On odd rows: you read patterns from right to left.
  // On even rows: you read patterns from left to right.
  if (evenRow) {
    for (let i = 0; i < line.length; i++) {
      pattern += emojiToStitch(line[i].textContent, evenRow);
    }
  } else {
    for (let i = line.length - 1; i >= 0; i--) {
      pattern += emojiToStitch(line[i].textContent, evenRow);
    }
  }


  // Can we summarize repeated consecutive stitches?
  return summarize(pattern);
}

function getTotalStitchesAfterIncreasesDecreases(initial, line) {
  let final = initial;
  for (let i = 0; i < line.length; i++) {
    const text = line[i].textContent;

    if (text === '／' || text === '＼') {
      final--;
    } else if (text === '🔘') {
      final++;
    }
  }
  return final;
}

function parsePattern(pattern) {
  const lines = pattern.trim().split('\n');

  // First, make the grid the right size.
  rowsInput.value = lines.length;
  let longestRow = 0;

  let rowData = [];
  for (line of lines) {
    const row = unsummarize(line).split(' ');
    rowData.push(row);
    longestRow = Math.max(longestRow, row.length);
  }

  colsInput.value = longestRow;
  updateGrid();

  const allRows = container.querySelectorAll('div.row');
  for (let i = 0; i < lines.length; i++) {
    let row = rowData[i];
    // The pattern is read backwards, so fill from the bottom
    const allCols = allRows[allRows.length - 1 - i].children;

    // This may be a repeated row.
    if (row.length === 1 && row[0].charAt(0) === 'r') {
      const repeatWhat = row[0].slice(1) - 1;
      row = rowData[repeatWhat];
    }

    const evenRow = i % 2 === 1;
    for (let j = 0; j < row.length; j++) {
      // On odd rows: you read patterns from right to left.
      // On even rows: you read patterns from left to right.
      let stitchIndex = evenRow ? j : allCols.length - 1 - j;
      allCols[stitchIndex].textContent = stitchToEmoji(row[j], evenRow);
    }
  }
}

function emojiToStitch(stitch, evenRow) {
  switch (stitch) {
    case '✖️':
      return evenRow ? 'P ' : 'K ';  // on even rows, we flip.
      break;
    case '➖':
      return evenRow ? 'K ' : 'P ';  // on even rows, we flip.
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

function stitchToEmoji(text, evenRow) {
  switch (text.toLowerCase()) {
    case 'k':
      return evenRow ? '➖' : '✖️';  // on even rows, we flip.
      break;
    case 'p':
      return evenRow ? '✖️' : '➖';  // on even rows, we flip.
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
  return summarizedLine.trim();
}

function unsummarize(line) {
  if (line === '')
    return '';

  const stitches = line.toLowerCase().trim().split(' ');
  let expanded = '';
  for (let stitch of stitches) {
    // This can be a single stitch: k p k2tog yo
    // Or a run length stitch: k2 p2 (k2tog)x2 (yo)x2
    const firstChar = stitch.charAt(0);

    // Single stitch.
    if (stitch === 'k' || stitch === 'p' || stitch === 'k2tog' || stitch === 'yo') {
      expanded += stitch + ' ';
    } else if (firstChar === 'k' || firstChar === 'p') {
      // Repeaded K or P stitch
      const count = parseInt(stitch.slice(1));
      expanded += (firstChar + ' ').repeat(count);
    } else if (firstChar === 'r') {
      // It's a repeated row
      return stitch;
    } else {
      // repeaded k2tog or yo.
      const [full, which, count] = stitch.match(/\((.*)\)x(\d+)/);
      expanded += (which + ' ').repeat(count);
    }
  }
  return expanded.trim();
}

//
// function stitchToEncoding(text) {
//   switch (text.toLowerCase()) {
//     case 'k':
//       return '1'
//       break;
//     case 'p':
//       return '2'
//       break;
//     case 'yo':
//       return '3'
//       break;
//     case 'k2tog':
//       return '4'
//       break;
//     case 'ssk':
//       return '5'
//       break;
//     default:
//       return ''
//   }
// }
//
// function encodingToStitch(text) {
//   switch (text.toLowerCase()) {
//     case '1':
//       return 'k'
//       break;
//     case '2':
//       return 'p'
//       break;
//     case '3':
//       return 'yo'
//       break;
//     case '4':
//       return 'k2tog'
//       break;
//     case '5':
//       return 'ssk'
//       break;
//     default:
//       return ''
//   }
// }
