// 이전 빌드 산출물(caregap/assets, caregap/index.html)만 지운다. app/, data/, docs/ 는 건드리지 않는다.
import fs from 'node:fs';
import path from 'node:path';
const out = path.resolve(import.meta.dirname, '../..');
fs.rmSync(path.join(out, 'assets'), { recursive: true, force: true });
fs.rmSync(path.join(out, 'index.html'), { force: true });
