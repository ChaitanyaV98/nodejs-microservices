### Packages installed

## 1. cors

- **What it does:** Allows backend to accept requests from other domains( like from front-end)
- **Why is it needed:** Browser block the requests from different domains, unless we mention them explicitly.
  Cors helps us handle this safely and smoothly.

## 2. express

- **What it does:** A lightweight weight web framework(is a set of tools and libraries that helps you build web applications more easily and efficiently) for Node.js
- **Why is it needed:** It makes building APIs, handling HTTP routes, requests, responses much more easier than raw Node.js

## 3. express-http-proxy

- **What it does:** Forwards(proxies) incoming http requests to another server.
- **Why is it needed:** Useful when you want your backend to relay requests to other services (e.g., microservices or external APIs).

- **Example use:** Proxying requests from /api to another backend running on http://localhost:5000.

## 4. helmet:

- Adds security headers to http responses
- **Why it’s needed:**Helps protect your app from some common web vulnerabilities (e.g., clickjacking, XSS).
- Example use: One line app.use(helmet()) secures many things.

## 5. ioredis:

- A Redis client for Node.js, used to connect and interact with Redis.
- For caching, storing sessions, queues, or temporary data in a fast in-memory store.

## 6. jsonwebtoken

- Creates and verifies JSON Web Tokens (JWT).
- For implementing login/authentication. You can securely identify users with tokens.

## 7. winston

- A logging library for Node.js.
- To log errors, requests, and other important info for debugging or monitoring.

identity service:

## 1. argon2

What it does: Safely hashes passwords.

Why it's needed: You should never store plain-text passwords. argon2 is a secure way to hash passwords before saving them in a database.

## 2. express-rate-limit

What it does: Limits how many times a user can hit your API in a short time.

Why it's needed: Protects your app from abuse, DDoS attacks, or bots spamming routes like /login.

## 3. joi

What it does: Validates incoming data like form submissions or API requests.

Why it's needed: To make sure data is correct (e.g., email must be valid, password must be at least 8 characters) before processing it.
