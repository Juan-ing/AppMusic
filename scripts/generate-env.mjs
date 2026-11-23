import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const values = {
  firebaseApiKey: '',
  firebaseAuthDomain: '',
  firebaseProjectId: '',
  firebaseStorageBucket: '',
  firebaseMessagingSenderId: '',
  firebaseAppId: '',
};

if (existsSync('.env')) {
  const mapping = {
    NG_APP_FIREBASE_API_KEY: 'firebaseApiKey',
    NG_APP_FIREBASE_AUTH_DOMAIN: 'firebaseAuthDomain',
    NG_APP_FIREBASE_PROJECT_ID: 'firebaseProjectId',
    NG_APP_FIREBASE_STORAGE_BUCKET: 'firebaseStorageBucket',
    NG_APP_FIREBASE_MESSAGING_SENDER_ID: 'firebaseMessagingSenderId',
    NG_APP_FIREBASE_APP_ID: 'firebaseAppId',
  };
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const property = mapping[key];
      if (property) values[property] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }
}

writeFileSync(
  'src/assets/env.js',
  `window.__env = ${JSON.stringify(values, null, 2)};\n`,
);
