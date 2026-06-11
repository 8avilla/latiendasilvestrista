import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const cmd = process.argv[2] || 'dev';

function getPort() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const match = content.match(/^PORT=(\d+)/m);
        if (match) {
          return match[1];
        }
      } catch {
        // Ignore errors reading file
      }
    }
  }
  return '3090'; // fallback default port
}

const port = getPort();
const args = cmd === 'dev' ? ['dev', '-p', port] : ['start', '-p', port];

const isWin = process.platform === 'win32';
const npxCmd = isWin ? 'npx.cmd' : 'npx';

const child = spawn(npxCmd, ['next', ...args], {
  stdio: 'inherit'
});

child.on('close', (code) => {
  process.exit(code);
});
