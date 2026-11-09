// Runs the Express API and the Vite dev server together: `npm run dev`.
// Zero dependencies — uses the Node child_process API.
import { spawn } from 'node:child_process';

const children = [];
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      try {
        child.kill();
      } catch {
        // ignore
      }
    }
  }
  process.exit(code);
}

function run(name, command) {
  const child = spawn(command, { stdio: 'inherit', shell: true });
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.log(`\n[${name}] exited (${signal ?? code}). Stopping the other process...`);
    shutdown(code ?? 0);
  });
  children.push(child);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('Starting JH Soap API (http://localhost:4000) and Vite dev server...');
run('api', 'npm run server');
run('web', 'npm run dev:web');
