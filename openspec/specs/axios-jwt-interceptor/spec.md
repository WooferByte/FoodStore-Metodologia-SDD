# axios-jwt-interceptor Specification

## Purpose
TBD - created by archiving change backend-axios-jwt-interceptor. Update Purpose after archive.

## Requirements

### Requirement: Axios instance attaches JWT access token to every request

The axios HTTP client SHALL read the current `accessToken` from `authStore` via `getState()` and inject an `Authorization: Bearer <token>` header on every outgoing request when a token is present.

#### Scenario: Authenticated request includes Authorization header

- **WHEN** a component calls any API method via `apiClient` and `authStore.accessToken` is non-null
- **THEN** the outgoing HTTP request includes the header `Authorization: Bearer <accessToken>`

#### Scenario: Unauthenticated request has no Authorization header

- **WHEN** `authStore.accessToken` is null (user not logged in)
- **THEN** the outgoing HTTP request is sent without an Authorization header

#### Scenario: Token is read at request time, not at instance creation time

- **WHEN** `authStore.updateTokens()` is called to update the access token after a refresh
- **THEN** subsequent API calls use the new token (not the token that was current when `apiClient` was created)

### Requirement: Response interceptor detects 401 and triggers token refresh

The axios response interceptor SHALL detect HTTP 401 Unauthorized responses and automatically attempt to obtain a new token pair by calling `POST /api/v1/auth/refresh` before propagating the error to the caller, but ONLY when `authStore` holds a refresh token. When no refresh token is present (anonymous session), the interceptor SHALL reject the error immediately without attempting a refresh.

#### Scenario: 401 response triggers refresh attempt

- **WHEN** an API call returns HTTP 401 and `authStore.refreshToken` is non-null
- **THEN** the interceptor calls `POST /api/v1/auth/refresh` with body `{ refresh_token: <current refreshToken> }`

#### Scenario: Anonymous 401 rejects without refresh call

- **WHEN** an API call returns HTTP 401 and `authStore.refreshToken` is null (anonymous user)
- **THEN** the interceptor rejects the error immediately
- **AND** no `POST /api/v1/auth/refresh` request is made
- **AND** no logout and no browser redirect are triggered

#### Scenario: Successful refresh retries original request

- **WHEN** the refresh call returns HTTP 200 with `{ access_token, refresh_token }`
- **THEN** `authStore.updateTokens(access_token, refresh_token)` is called and the original failed request is retried with the new access token

#### Scenario: Retry succeeds transparently

- **WHEN** the retried request succeeds after token refresh
- **THEN** the caller (component or hook) receives the successful response as if no error occurred

#### Scenario: Non-401 errors are not intercepted for refresh

- **WHEN** an API call returns HTTP 400, 403, 404, or 500
- **THEN** the error is passed through immediately without any refresh attempt

### Requirement: Concurrent 401 responses are serialized behind a single refresh call

When multiple concurrent requests receive 401 responses simultaneously, the Axios client SHALL issue exactly one refresh call and hold all other failed requests in a queue until the refresh resolves.

#### Scenario: Only one refresh call is made for concurrent 401s

- **WHEN** three API calls are in-flight simultaneously and all receive HTTP 401
- **THEN** exactly one `POST /api/v1/auth/refresh` request is made

#### Scenario: Queued requests retry after successful refresh

- **WHEN** the single refresh call succeeds
- **THEN** all queued failed requests are retried with the new access token

#### Scenario: Queued requests are rejected after failed refresh

- **WHEN** the single refresh call fails (e.g., refresh token expired)
- **THEN** all queued failed requests are rejected with an auth error

### Requirement: Auth failure fallback clears state and redirects to login

The Axios client SHALL perform a full auth logout and redirect the browser to `/login` when a token refresh attempt fails, except when the browser is already on the `/login` page, in which case it SHALL clear auth state without performing a full page reload.

#### Scenario: Refresh failure calls logout

- **WHEN** `POST /api/v1/auth/refresh` returns an error response
- **THEN** `authStore.logout()` is called, clearing all token and user state

#### Scenario: Redirect to login page after logout

- **WHEN** logout is triggered due to refresh failure and the current path is not `/login`
- **THEN** the browser navigates to `/login` via `window.location.href`

#### Scenario: No redirect loop on public pages

- **WHEN** an anonymous user (no access token and no refresh token in the store) triggers an API request that returns HTTP 401
- **THEN** no refresh is triggered, no logout occurs, and no browser redirect or reload is performed

#### Scenario: No reload when already on the login page

- **WHEN** a refresh failure triggers logout while the current path is already `/login`
- **THEN** `authStore.logout()` is called
- **AND** the browser does NOT perform a `window.location` navigation or reload

### Requirement: Refresh call bypasses the JWT interceptor

The HTTP request made to `POST /api/v1/auth/refresh` SHALL be issued using a plain Axios instance that does not have the JWT request/response interceptors attached, to prevent infinite interception loops.

#### Scenario: Refresh request does not trigger another refresh on 401

- **WHEN** the refresh endpoint itself returns HTTP 401 (refresh token expired)
- **THEN** the interceptor does NOT call refresh again; instead it proceeds to the fallback (logout + redirect)

#### Scenario: Refresh request has no Authorization header

- **WHEN** `POST /api/v1/auth/refresh` is called
- **THEN** the request body contains `{ refresh_token }` and no `Authorization` header is set

### Requirement: Public API of shared/api/axios.ts is preserved

The module SHALL continue to export `apiClient`, `axiosInstance`, and `createAxiosClient` with identical signatures so that no existing call site requires modification.

#### Scenario: Existing imports continue to work

- **WHEN** any module imports `{ apiClient }` or `{ axiosInstance }` from `shared/api/axios`
- **THEN** they receive the enhanced instance with interceptors applied, without any code change

#### Scenario: createAxiosClient factory still works for testing

- **WHEN** a test calls `createAxiosClient('http://test-server')` to create an isolated instance
- **THEN** the factory returns a valid Axios instance (interceptor wiring is a separate concern)
