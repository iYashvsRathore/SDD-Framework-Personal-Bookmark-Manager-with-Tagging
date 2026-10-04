import { createApp } from './app.js';
import { createDb } from './data/db.js';

const PORT = Number(process.env.PORT ?? 3000);

// Schema bootstrap runs BEFORE the listener opens (data-model.md section 5), so the
// API can never answer a request against a database that has no tables yet.
const db = createDb();

const app = createApp({ db });

app.listen(PORT, () => {
  console.log(`[api] TagVault API listening on http://localhost:${PORT}`);
});
