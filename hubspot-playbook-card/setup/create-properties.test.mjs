// Kör create-properties.mjs mot en lokal låtsas-HubSpot.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const script = fileURLToPath(new URL('./create-properties.mjs', import.meta.url));

function fakeHubSpot() {
  const existing = new Set(['/crm/v3/properties/deals/pb_disc_budget_sek']);
  const created = [];
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      if (req.headers.authorization !== 'Bearer test-token') {
        res.writeHead(401).end(JSON.stringify({ message: 'bad token' }));
        return;
      }
      if (req.method === 'GET') {
        res.writeHead(existing.has(req.url) ? 200 : 404).end('{}');
        return;
      }
      const payload = JSON.parse(body);
      const path = req.url.endsWith('/groups')
        ? `${req.url}/${payload.name}`
        : `${req.url}/${payload.name}`;
      existing.add(path);
      created.push({ url: req.url, payload });
      res.writeHead(201).end('{}');
    });
  });
  return new Promise((resolve) =>
    server.listen(0, () => resolve({ server, created, port: server.address().port })),
  );
}

async function exec(port, args = []) {
  return run(process.execPath, [script, ...args], {
    env: { ...process.env, HUBSPOT_TOKEN: 'test-token', HUBSPOT_API_BASE: `http://127.0.0.1:${port}` },
  });
}

test('torrkörning skapar inget, --apply skapar det som saknas, omkörning är ofarlig', async () => {
  const { server, created, port } = await fakeHubSpot();
  try {
    const dry = await exec(port);
    assert.equal(created.length, 0);
    assert.match(dry.stdout, /\[skulle skapa\] grupp pb_playbook/);
    assert.match(dry.stdout, /\[finns\] pb_disc_budget_sek/);
    assert.match(dry.stdout, /Kör igen med --apply/);

    await exec(port, ['--apply']);
    const groups = created.filter((c) => c.url.endsWith('/groups'));
    const props = created.filter((c) => !c.url.endsWith('/groups'));
    assert.equal(groups.length, 2);
    assert.equal(props.length, 48); // 45 frågor + 4 klar-datum, minus den som redan fanns
    assert.ok(props.every((p) => p.payload.groupName === 'pb_playbook'));

    const again = await exec(port, ['--apply']);
    assert.equal(created.length, 50);
    assert.match(again.stdout, /Allt finns redan på plats/);
  } finally {
    server.close();
  }
});

test('fel token ger tydligt fel och avbryter', async () => {
  const { server, port } = await fakeHubSpot();
  try {
    await assert.rejects(
      run(process.execPath, [script], {
        env: { ...process.env, HUBSPOT_TOKEN: 'fel', HUBSPOT_API_BASE: `http://127.0.0.1:${port}` },
      }),
      (err) => /Avbrutet: .*401/.test(err.stderr) && !/at .*\.mjs/.test(err.stderr),
    );
  } finally {
    server.close();
  }
});
