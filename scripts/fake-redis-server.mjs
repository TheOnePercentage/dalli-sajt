/**
 * Minimal Redis-compatible (RESP2) server for local STEP 9 verification.
 * Supports the command subset used by server/src/lib/cache.js:
 *   INFO, SELECT, PING, QUIT, CLIENT, GET, SET (+EX/PX), DEL, KEYS, EXISTS, FLUSHDB
 * Usage: node scripts/fake-redis-server.mjs [port]
 */
import net from 'net';

const PORT = parseInt(process.argv[2], 10) || 6390;
const db = new Map(); // key -> { value, expiresAt }

function parseRESP(buf) {
  // Returns [commands[], remainingBuffer]
  const commands = [];
  let i = 0;
  while (i < buf.length) {
    if (buf[i] !== 0x2a) break; // '*'
    const nl = buf.indexOf('\r\n', i);
    if (nl === -1) break;
    const count = parseInt(buf.slice(i + 1, nl).toString(), 10);
    if (Number.isNaN(count)) break;
    i = nl + 2;
    const args = [];
    let ok = true;
    for (let n = 0; n < count; n++) {
      if (buf[i] !== 0x24) {
        ok = false;
        break;
      } // '$'
      const nl2 = buf.indexOf('\r\n', i);
      if (nl2 === -1) {
        ok = false;
        break;
      }
      const len = parseInt(buf.slice(i + 1, nl2).toString(), 10);
      const start = nl2 + 2;
      if (buf.length < start + len + 2) {
        ok = false;
        break;
      }
      args.push(buf.slice(start, start + len).toString('utf8'));
      i = start + len + 2;
    }
    if (!ok) break;
    commands.push(args);
  }
  return [commands, buf.slice(i)];
}

function alive(key) {
  const e = db.get(key);
  if (!e) return null;
  if (e.expiresAt && e.expiresAt <= Date.now()) {
    db.delete(key);
    return null;
  }
  return e;
}

const bulk = s => (s === null ? '$-1\r\n' : `$${Buffer.byteLength(s)}\r\n${s}\r\n`);
const simple = s => `+${s}\r\n`;
const int = n => `:${n}\r\n`;
const err = m => `-ERR ${m}\r\n`;

function handle(args) {
  const cmd = (args[0] || '').toLowerCase();
  switch (cmd) {
    case 'ping':
      return simple('PONG');
    case 'quit':
      return simple('OK');
    case 'select':
      return simple('OK');
    case 'info':
      return bulk('# Server\r\nredis_version:7.2.0\r\n# Persistence\r\nloading:0\r\n');
    case 'client':
      return simple('OK');
    case 'set': {
      const key = args[1];
      const value = args[2];
      let ttlMs = null;
      for (let i = 3; i < args.length; i++) {
        const opt = args[i].toLowerCase();
        if (opt === 'ex') ttlMs = parseInt(args[++i], 10) * 1000;
        else if (opt === 'px') ttlMs = parseInt(args[++i], 10);
      }
      db.set(key, { value, expiresAt: ttlMs ? Date.now() + ttlMs : null });
      return simple('OK');
    }
    case 'get': {
      const e = alive(args[1]);
      return bulk(e ? e.value : null);
    }
    case 'del': {
      let n = 0;
      for (const key of args.slice(1)) if (db.delete(key)) n++;
      return int(n);
    }
    case 'exists': {
      let n = 0;
      for (const key of args.slice(1)) if (alive(key)) n++;
      return int(n);
    }
    case 'keys': {
      const pattern = args[1] || '*';
      const rx = new RegExp(
        `^${pattern
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.')}$`
      );
      const keys = [...db.keys()].filter(k => rx.test(k) && alive(k));
      return `*${keys.length}\r\n${keys.map(k => bulk(k)).join('')}`;
    }
    case 'flushdb':
      db.clear();
      return simple('OK');
    case 'dbsize':
      return int(db.size);
    case 'incr': {
      const e = alive(args[1]);
      const next = (e ? parseInt(e.value, 10) : 0) + 1;
      db.set(args[1], { value: String(next), expiresAt: e?.expiresAt ?? null });
      return int(next);
    }
    default:
      return err(`unknown command '${cmd}'`);
  }
}

const server = net.createServer(sock => {
  let buf = Buffer.alloc(0);
  sock.on('data', chunk => {
    buf = Buffer.concat([buf, chunk]);
    const [commands, rest] = parseRESP(buf);
    buf = rest;
    let out = '';
    for (const args of commands) {
      out += handle(args);
      if ((args[0] || '').toLowerCase() === 'quit') {
        sock.end();
        return;
      }
    }
    if (out) sock.write(out);
  });
  sock.on('error', () => {});
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`fake-redis listening on 127.0.0.1:${PORT}`);
});
