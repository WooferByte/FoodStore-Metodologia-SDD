# axios-jwt-interceptor Delta

## MODIFIED Requirements

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
