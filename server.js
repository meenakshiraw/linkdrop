require("dotenv").config();
const http = require('node:http');
const path = require('node:path');
const { readFile } = require('node:fs/promises');

const { Pool } = require("pg");



const config = require('./config');

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 5,
});


function render(links) {
  const items = links
    .map((l) => `<li><a href="${l.url}">${l.url}</a><p>${l.note}</p><time>${l.created_at.toISOString()}</time></li>`)
    .join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>linkdrop</title>
<style>
  body{font:16px/1.5 system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 16px;color:#0f172a}
  form{display:grid;gap:8px;margin-bottom:32px}
  input,textarea,button{font:inherit;padding:8px}
  li{margin-bottom:16px}
  li p{margin:4px 0}
  time{color:#64748b;font-size:13px}
</style>
</head>
<body>
<h1>linkdrop</h1>
<form method="post" action="/links">
  <input name="url" type="url" placeholder="https://..." required>
  <textarea name="note" rows="2" placeholder="Why it is worth reading"></textarea>
  <button type="submit">Drop it</button>
</form>
<ol>
${items}
</ol>
</body>
</html>`;
}

async function listLinks() {
  const { rows } = await pool.query(
    'SELECT url, note, created_at FROM links ORDER BY created_at LIMIT $1',
    [config.pageSize],
  );
  return rows;
}

async function addLink(url, note) {
  await pool.query('INSERT INTO links (url, note) VALUES ($1, $2)', [url, note]);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10_000) req.destroy();
    });
    req.on('end', () => resolve(new URLSearchParams(body)));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/healthz') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      return res.end('ok');
    }
    if (req.method === 'GET' && req.url === '/') {
      const links = await listLinks();
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(render(links));
    }
    if (req.method === 'POST' && req.url === '/links') {
      const form = await readBody(req);
      const url = (form.get('url') || '').trim();
      const note = (form.get('note') || '').trim();
      if (!url) {
        res.writeHead(400, { 'content-type': 'text/plain' });
        return res.end('A link needs a URL.');
      }
      await addLink(url, note);
      res.writeHead(303, { location: '/' });
      return res.end();
    }
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('Something went wrong.');
  }
});


async function start() {
  try {
    // 1. Check the PostgreSQL connection
    await pool.query('SELECT 1');
    console.log('PostgreSQL connected successfully.');

    // 2. Read the SQL file from the db folder
    const schema = await readFile(
      path.join(__dirname, 'db', 'schema.sql'),
      'utf8'
    );

    // 3. Automatically create the table if it does not exist
    await pool.query(schema);
    console.log('Table links is ready.');

    // 4. Start the server
    server.listen(config.port, config.host, () => {
      console.log(
        `linkdrop listening on http://${config.host}:${config.port}`
      );
    });
  } catch (err) {
    console.error('Failed to initialize database:', err);
    await pool.end();
    process.exit(1);
  }
}

start();

process.on('SIGTERM', () => {
  server.close(() => pool.end().then(() => process.exit(0)));
});

