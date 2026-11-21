import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(ROOT, 'hosting-dist');
const FILES = JSON.parse(readFileSync(join(ROOT, 'scripts/hosting-files.json'), 'utf8'));

/**
 * Validates an explicit public file against the project boundary.
 * @param {string} file - Approved relative runtime path.
 * @returns {void}
 */
function validateFile(file) {
  const source = resolve(ROOT, file);
  if (!source.startsWith(ROOT + sep) || !lstatSync(source).isFile()) throw new Error(`Invalid file: ${file}`);
  if (!realpathSync(source).startsWith(realpathSync(ROOT) + sep)) throw new Error(`External file: ${file}`);
  if (!/\.(html|css|js|mjs|svg|png|jpg|woff2|ttf|txt)$/.test(file)) throw new Error(`Unexpected format: ${file}`);
  if (/(^|\/)(\.|tests\/|n8n\/|docs\/)|\.example\.|preview|\/collector\//i.test(file)) throw new Error(`Private file: ${file}`);
}


/** Removes only the verified generated directory, never a linked destination. */
function resetOutput() {
  if (OUTPUT !== join(realpathSync(ROOT), 'hosting-dist')) throw new Error('Unexpected output directory.');
  if (existsSync(OUTPUT) && lstatSync(OUTPUT).isSymbolicLink()) throw new Error('Output must not be a link.');
  rmSync(OUTPUT, { recursive: true, force: true });
  mkdirSync(OUTPUT);
}


/**
 * Copies one approved runtime file while preserving its public URL.
 * @param {string} file - Approved relative runtime path.
 * @returns {void}
 */
function copyFile(file) {
  const destination = join(OUTPUT, file);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(join(ROOT, file), destination);
}

FILES.forEach(validateFile);
resetOutput();
FILES.forEach(copyFile);
console.log(`Prepared ${FILES.length} approved files in hosting-dist.`);
