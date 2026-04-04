deadpool@ksskkfb03:~/Documents/codex-lb$ codex
╭──────────────────────────────────────────────────╮
│ >\_ OpenAI Codex (v0.118.0) │
│ │
│ model: gpt-5.3-codex high /model to change │
│ directory: ~/Documents/codex-lb │
╰──────────────────────────────────────────────────╯

Tip: New 2x rate limits until April 2nd.

⚠ MCP client for `codex_apps` failed to start: MCP startup failed: handshaking
with MCP server failed: Send message error Transport
[rmcp::transport::worker::WorkerTransport<rmcp::transport::streamable_http_cli
ent::StreamableHttpClientWorker<codex_rmcp_client::rmcp_client::StreamableHttp
ResponseClient>>] error: Unexpected content type: Some("text/plain; body: {\n
\"error\": {\n \"message\": \"Your authentication token has been
invalidated. Please try signing in again.\",\n \"type\":
\"invalid_request_error\",\n \"code\": \"token_invalidated\",\n
⚠ The supabase MCP server is not logged in. Run `codex mcp login supabase`.

⚠ The stripe MCP server is not logged in. Run `codex mcp login stripe`.

⚠ MCP client for `gitnexus` failed to start: MCP startup failed: handshaking
with MCP server failed: connection closed: initialize response

⚠ MCP client for `aws-mcp` failed to start: MCP startup failed: handshaking with
MCP server failed: connection closed: initialize response

⚠ MCP startup incomplete (failed: aws-mcp, codex_apps, gitnexus, stripe,
supabase)

› test

■ Your access token could not be refreshed because your refresh token was
already used. Please log out and sign in again.
