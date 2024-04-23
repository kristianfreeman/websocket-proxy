A configurable server-side rate limiter for WebSocket connections written in plain JavaScript.

This rate limiter can be used to limit the number of requests from a given IP address _per second_.

## Usage

1. `npm install`
2. `cp env.example .env` and configure as needed
3. `npm start`

[`websocket-proxy.service`](https://github.com/kristianfreeman/websocket-proxy/blob/main/websocket-proxy.service) has been provided as example of how to run the service in `systemd`.

## Configuration

An example configuration is seen below:

```
FORWARD_PORT=8900
PORT=6769
RATE_LIMIT=100
WINDOW_SECONDS=1
```

Here is an explanation of each environment variable:

**FORWARD_PORT**: The port to _forward_ WebSocket connections to
**PORT**: The outward-facing port. Send WebSocket connections that you want to rate limit here.
**RATE_LIMIT**: The number of requests to allow in a given window.
**WINDOW_SECONDS**: The length of the rate limit window, expressed in seconds.

The **RATE_LIMIT** and **WINDOW_SECONDS** values express "allow X number of requests in Y seconds", as such:

```
RATE_LIMIT=100
WINDOW_SECONDS=1

# Allow 100 requests per 1 second
```
