import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load('outputs/ban-dinh-export/ban-dinh-3.0-test.xlsx'));
await workbook.recalculate();
const tvv=workbook.worksheets.getItem('TVV'), groups=workbook.worksheets.getItem('Nhóm');
assert.equal(groups.getRange('D9').values[0][0],13);
tvv.getRange('E6').values=[[4]]; await workbook.recalculate();
assert.equal(groups.getRange('D9').values[0][0],16);
assert.equal(tvv.getRange('E10').values[0][0],16);
tvv.getRange('E6').values=[[1]]; await workbook.recalculate();
for (const [sheetName, range, file] of [['TVV','A1:F10','tvv'],['Nhóm','A1:E9','nhom']]) {
  const image = await workbook.render({sheetName,range,scale:1.5,format:'png'});
  await fs.writeFile(`outputs/ban-dinh-export/${file}.png`,new Uint8Array(await image.arrayBuffer()));
}
console.log(JSON.stringify({groups:workbook.worksheets.getItem('Nhóm').getRange('C6:E9').values}));
