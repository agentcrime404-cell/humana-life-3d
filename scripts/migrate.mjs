import {database} from '../server/database.js';
const db=database(process.env.DATABASE_PATH||'./data/humana.sqlite');
console.log('Migrazioni applicate:',db.prepare('SELECT version FROM migrations ORDER BY version').all().map(r=>r.version).join(', '));db.close();
