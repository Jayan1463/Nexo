import 'dotenv/config';
import { database } from '../backend/database';
import { migrateProjectBindings } from '../backend/project-migration';

const target = process.env.FIREBASE_PROJECT_ID;
if (!target) throw new Error('Set FIREBASE_PROJECT_ID explicitly to the intended Firebase project');
const apply = process.argv.includes('--apply');
if (apply && !process.argv.includes(`--confirm-project=${target}`)) {
  throw new Error('Applying requires --confirm-project=<FIREBASE_PROJECT_ID>');
}
console.log({ project: target, mode: apply ? 'apply' : 'read-only', ...await migrateProjectBindings(database(), apply) });
