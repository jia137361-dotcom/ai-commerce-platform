// Fix ExecArgs imports in all script files
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const scriptsDir = path.join(__dirname, '../apps/medusa-backend/src/scripts');
const files = glob.sync('*.ts', { cwd: scriptsDir });

files.forEach(file => {
  const filePath = path.join(scriptsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace ExecArgs import
  content = content.replace(
    /import\s+(type\s+)?\{\s*ExecArgs\s*(,\s*MedusaContainer\s*)?\}\s+from\s+["']@medusajs\/framework\/types["']/g,
    'import type { ExecArgs } from "../types/medusa"'
  );

  fs.writeFileSync(filePath, content);
  console.log(`Fixed: ${file}`);
});

console.log('Done!');
