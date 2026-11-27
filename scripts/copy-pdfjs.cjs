const { cpSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');
const root = join(__dirname, '..');
const source = join(root, 'node_modules/pdfjs-dist');
const target = join(root, 'public/minhhoa2/pdfjs');
mkdirSync(target, { recursive: true });
for (const file of ['pdf.mjs', 'pdf.worker.mjs']) cpSync(join(source, 'build', file), join(target, file));
for (const folder of ['cmaps', 'standard_fonts']) cpSync(join(source, folder), join(target, folder), { recursive: true });
cpSync(join(source, 'LICENSE'), join(target, 'LICENSE'));
