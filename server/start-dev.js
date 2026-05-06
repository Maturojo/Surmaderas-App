import { spawn } from 'child_process';

const WA_BACKEND = 'C:\\Programacion\\Sur_Maderas\\Whatsapp-chatbot\\backend';

function run(label, cmd, args, cwd) {
  const proc = spawn(cmd, args, { cwd, shell: true, stdio: 'pipe' });
  proc.stdout.on('data', d => process.stdout.write(`[${label}] ${d}`));
  proc.stderr.on('data', d => process.stderr.write(`[${label}] ${d}`));
  proc.on('close', code => console.log(`[${label}] proceso terminado con código ${code}`));
  return proc;
}

run('API', 'npx', ['nodemon', 'src/index.js'], process.cwd());
run('WA', 'npm', ['run', 'dev'], WA_BACKEND);
