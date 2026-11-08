import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const source = path.join(__dirname, '..', 'src', 'data', 'restaurants.json');
const destination = path.join(__dirname, '..', 'dist', 'src', 'data');

mkdirSync(destination, { recursive: true });
copyFileSync(source, path.join(destination, 'restaurants.json'));