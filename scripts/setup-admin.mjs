#!/usr/bin/env node
/**
 * Génère les secrets de l'admin :
 *   - ADMIN_PASSWORD_HASH (scrypt, N=2^17)
 *   - PASETO_LOCAL_KEY (k4.local)
 * Usage : node scripts/setup-admin.mjs
 * Le mot de passe est demandé sans écho et n'est jamais écrit sur le disque.
 */
import { scrypt, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import { createInterface } from 'node:readline';
import { generateKeys } from 'paseto-ts/v4';

const scryptAsync = promisify(scrypt);

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.includes(question)) rl.output.write(s);
        else rl.output.write('*');
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer);
    });
  });
}

const username = (await ask('Nom d’utilisateur admin : ')).trim();
if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) {
  console.error('Nom invalide (3-40 caractères : lettres, chiffres, . _ -)');
  process.exit(1);
}
const pw = await ask('Mot de passe (16 caractères minimum) : ', true);
if (pw.length < 16) {
  console.error('Mot de passe trop court : 16 caractères minimum.');
  process.exit(1);
}
const confirm = await ask('Confirmez le mot de passe : ', true);
if (pw !== confirm) {
  console.error('Les mots de passe ne correspondent pas.');
  process.exit(1);
}

const N = 2 ** 17, r = 8, p = 1;
const salt = randomBytes(16);
const hash = await scryptAsync(pw.normalize('NFKC'), salt, 32, { N, r, p, maxmem: 256 * N * r });
const passwordHash = `scrypt:${N}:${r}:${p}:${salt.toString('base64')}:${hash.toString('base64')}`;
const pasetoKey = generateKeys('local');

console.log('\nAjoutez ces variables dans Netlify (Site configuration → Environment variables)');
console.log('et dans votre fichier .env local. Ne les partagez jamais.\n');
console.log(`ADMIN_USERNAME=${username}`);
console.log(`ADMIN_PASSWORD_HASH=${passwordHash}`);
console.log(`PASETO_LOCAL_KEY=${pasetoKey}`);
