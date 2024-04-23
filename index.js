const dotenv = require('dotenv');
const WebSocket = require('ws');
const ip = require('ip');
const process = require('process');

const ipRateLimits = {}; // store rate limits per IP address

const exit = str => {
  console.error(str);
  process.exit(1);
}

dotenv.config();

// The number of requests to service per second
const rateLimit = process.env.RATE_LIMIT && Number(process.env.RATE_LIMIT);
if (!rateLimit) exit("Missing RATE_LIMIT env var")

// The window to count requests in. Expressed in seconds
const windowLength = process.env.WINDOW_SECONDS && Number(process.env.WINDOW_SECONDS);
if (!windowLength) exit("Missing WINDOW_SECONDS env var")

// The outward-facing port - the one that clients/proxies connect to
const port = process.env.PORT;
if (!port) exit("Missing PORT env var")

// The port to forward to - a WebSocket server that you want to limit connections to
const forwardPort = process.env.FORWARD_PORT;
if (!forwardPort) exit("Missing FORWARD_PORT env var")

const wss = new WebSocket.Server({ port }); // adjust the port as needed

wss.on('connection', (ws, req) => {
  const isLocal = req.socket.remoteAddress == "::ffff:127.0.0.1";
  const ipAddr = isLocal ? "127.0.0.1" : ip.address(req.socket.remoteAddress);
  const ipKey = ipAddr.replace(/\/.*/, ''); // remove port number if present

  if (!ipRateLimits[ipKey]) {
    ipRateLimits[ipKey] = {
      count: 0,
      timestamp: Date.now(),
    };
  }

  const ipRateLimit = ipRateLimits[ipKey];

  ws.on('message', (message) => {
    const now = Date.now();
    const elapsed = now - ipRateLimit.timestamp;

    if (elapsed >= (windowLength * 1000)) {
      ipRateLimit.count = 0;
      ipRateLimit.timestamp = now;
    }

    if (ipRateLimit.count < rateLimit) {
      ipRateLimit.count++;
      // forward the message to the actual WebSocket server
      const backendWs = new WebSocket(`ws://localhost:${forwardPort}`);
      backendWs.on('open', () => {
        backendWs.send(message);
      });
      backendWs.on('close', (code, reason) => {
        ws.close(code, reason);
      });
      backendWs.on('message', backendMessage => {
        ws.send(backendMessage);
      });
      backendWs.on('error', (err) => {
        ws.emit('error', err);
      });
    } else {
      console.log(`Rate limit exceeded for IP ${ipAddr}`);
      const rateLimitMsg = { _ratelimited: true }
      ws.send(JSON.stringify(rateLimitMsg))
    }
  });

  ws.on('close', (code, reason) => {
    delete ipRateLimits[ipKey];
  });
});

console.log(`Running.\n  Port: ${port}\n  Forward to: ${forwardPort}\n  Requests per window: ${rateLimit}\n  Window length: ${windowLength} second(s)`);
