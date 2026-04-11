## ADDED Requirements

### Requirement: Rust websocket hot-path parity bridge for responses routes
The Rust runtime SHALL preserve websocket transport behavior for responses routes while proxying upstream Python-backed business logic.

#### Scenario: Rust forwards websocket responses traffic on backend-api route
- **WHEN** a websocket client connects through `GET /backend-api/codex/responses`
- **THEN** Rust proxies the websocket session upstream
- **AND** forwards upstream frames to the client until normal close.

#### Scenario: Rust forwards websocket responses traffic on v1 route
- **WHEN** a websocket client connects through `GET /v1/responses`
- **THEN** Rust proxies the websocket session upstream
- **AND** preserves upstream close behavior for the client session.

### Requirement: Rust transcribe wildcard parity for multipart uploads
The Rust runtime wildcard bridge SHALL preserve multipart transcription request contracts for backend and v1 transcription paths.

#### Scenario: Rust forwards backend-api transcribe multipart payload
- **WHEN** a client sends multipart `POST /backend-api/transcribe` through Rust
- **THEN** Rust forwards request method, query, headers, and body upstream
- **AND** returns upstream status and content-type.

#### Scenario: Rust forwards v1 audio transcriptions multipart payload
- **WHEN** a client sends multipart `POST /v1/audio/transcriptions` through Rust
- **THEN** Rust forwards request method, query, headers, and body upstream
- **AND** returns upstream status and content-type.

### Requirement: Websocket and transcribe bridges remain fail-closed on upstream outage
The Rust runtime SHALL return explicit failure contracts when the Python upstream cannot be reached.

#### Scenario: Upstream unavailable for websocket/transcribe bridge
- **WHEN** Python upstream is unavailable for proxied websocket/transcribe requests
- **THEN** Rust returns HTTP `503` for HTTP bridge requests with a JSON `detail` field
- **AND** does not emit a success payload.
