import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Find mysql2 dynamically
let mysql;
const mysqlPaths = [
  path.join(__dirname, 'server/node_modules/mysql2/promise.js'),
  path.join(__dirname, 'prohealth/server/node_modules/mysql2/promise.js'),
  path.join(__dirname, '../prohealth/server/node_modules/mysql2/promise.js')
];

for (const p of mysqlPaths) {
  if (fs.existsSync(p)) {
    mysql = (await import(pathToFileURL(p).href)).default;
    break;
  }
}

if (!mysql) {
  console.error('Could not find mysql2 module.');
  process.exit(1);
}

const url = process.argv[2];
if (!url) {
  console.log('Usage: node setup-db.js "<DATABASE_URL>"');
  process.exit(1);
}

// Find database files dynamically
const schemaCandidates = [
  path.join(__dirname, 'database/schema.sql'),
  path.join(__dirname, 'prohealth/database/schema.sql'),
  path.join(__dirname, '../prohealth/database/schema.sql')
];
const schemaPath = schemaCandidates.find(p => fs.existsSync(p));

const seedCandidates = [
  path.join(__dirname, 'database/seed.sql'),
  path.join(__dirname, 'prohealth/database/seed.sql'),
  path.join(__dirname, '../prohealth/database/seed.sql')
];
const seedPath = seedCandidates.find(p => fs.existsSync(p));

async function run() {
  console.log('Connecting to database...');
  const conn = await mysql.createConnection({
    uri: url,
    multipleStatements: true,
  });

  console.log('Reading and preparing schema.sql from', schemaPath);
  let schemaSql = fs.readFileSync(schemaPath, 'utf8')
    .replace(/CREATE DATABASE IF NOT EXISTS [^\n;]+;/gi, '')
    .replace(/USE [^\n;]+;/gi, '');

  console.log('Executing schema.sql...');
  await conn.query(schemaSql);
  console.log('Schema imported successfully.');

  if (seedPath && fs.existsSync(seedPath)) {
    console.log('Reading and preparing seed.sql from', seedPath);
    let seedSql = fs.readFileSync(seedPath, 'utf8')
      .replace(/USE [^\n;]+;/gi, '');
    console.log('Executing seed.sql...');
    await conn.query(seedSql);
    console.log('Seed data imported successfully.');
  }

  const [tables] = await conn.query('SHOW TABLES');
  console.log('\nTables created in database:');
  console.table(tables);

  await conn.end();
  console.log('\nAll done! Database is ready.');
}

run().catch((err) => {
  console.error('Failed to import database:', err.message);
  process.exit(1);
});
