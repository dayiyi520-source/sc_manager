import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const container = process.env.MOCK_DB_CONTAINER || 'shichuang-manage-mysql';
const database = process.env.MOCK_DB_NAME || 'eaf_project_f194fd0628';
const excludedTables = new Set(['flyway_schema_history', 't_sys_session']);
const sensitiveColumn = /password|token|secret|credential|salt/i;

function mysql(sql) {
  const result = spawnSync('docker', ['exec', '-i', container, 'sh', '-c', `MYSQL_PWD="$MYSQL_PASSWORD" mysql --default-character-set=utf8mb4 --batch --raw --skip-column-names -u "$MYSQL_USER" -D ${database}`], {
    input: sql,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(result.stderr || '读取本地数据库失败');
  return result.stdout.trim();
}

const quote = (value) => `\`${String(value).replaceAll('`', '``')}\``;
const string = (value) => `'${String(value).replaceAll("'", "''")}'`;

function main() {
  const tables = mysql("SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE' ORDER BY table_name").split('\n').filter(Boolean).filter((table) => !excludedTables.has(table));
  const snapshot = {};
  for (const table of tables) {
    const columns = mysql(`SELECT column_name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=${string(table)} ORDER BY ordinal_position`).split('\n').filter(Boolean).filter((column) => !sensitiveColumn.test(column));
    if (!columns.length) continue;
    const fields = columns.flatMap((column) => [string(column), quote(column)]).join(',');
    const raw = mysql(`SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(${fields})),JSON_ARRAY()) FROM ${quote(table)}`);
    snapshot[table] = JSON.parse(raw || '[]');
  }
  const generatedAt = new Date().toISOString();
  const content = `/* Auto-generated from the local development database. Do not edit manually. */\nexport const MOCK_SNAPSHOT_VERSION = ${JSON.stringify(generatedAt)} as const;\nexport const MOCK_DATABASE = ${JSON.stringify(snapshot, null, 2)} as const;\n`;
  writeFileSync(resolve('src/data/mockDatabaseSnapshot.ts'), content, 'utf8');
  console.log(`已生成 ${tables.length} 个业务表快照：src/data/mockDatabaseSnapshot.ts`);
}

main();
