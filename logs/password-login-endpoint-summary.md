# Password Login Endpoint Summary

## Endpoint Details

**URL**: `POST /api/token`

**Location**: `/root/deer-flow/src/api/api_generate_token.py`

**Authentication Type**: OAuth2 Password Grant Flow

## Request Format

The endpoint uses FastAPI's `OAuth2PasswordRequestForm` which expects **form data** (not JSON).

### Request Headers
```
Content-Type: application/x-www-form-urlencoded
```

### Request Body (Form Data)
```
username: chetan@omegaintelligence.ai  # Note: 'username' field contains email
password: Test123.
```

**Important**: The field is named `username` but it expects the user's **email address**.

## Response Format

### Success Response (200 OK)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Error Response (401 Unauthorized)
```json
{
  "detail": "Incorrect email or password"
}
```

## Implementation Details

### Backend Implementation (`api_generate_token.py`)

```python
@user_generate_token_router.post("/api/token")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
```

Key points:
- Uses `bcrypt` for password hashing
- JWT tokens with 120 minutes expiration
- Token payload contains user email in the `sub` field

### Frontend Implementation

**Login Form** (`LoginForm.tsx`):
```javascript
const formData = new FormData();
formData.append('username', email);  // email goes in 'username' field
formData.append('password', password);

const { access_token } = await loginUser(formData);
```

**Auth Service** (`auth.ts`):
```javascript
export async function loginUser(formData: FormData): Promise<{
  access_token: string;
}> {
  const response = await fetch(`${API_BASE_URL}/api/token`, {
    method: 'POST',
    body: formData,
    headers: {
      Accept: 'application/json',
    },
  });
  // ...
}
```

## Usage Example

### cURL
```bash
curl -X POST http://localhost:8000/api/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=chetan@omegaintelligence.ai&password=Test123."
```

### Python
```python
import requests

data = {
    "username": "chetan@omegaintelligence.ai",
    "password": "Test123."
}

response = requests.post(
    "http://localhost:8000/api/token",
    data=data  # Note: 'data' not 'json'
)

token = response.json()["access_token"]
```

### JavaScript/TypeScript
```javascript
const formData = new FormData();
formData.append('username', 'chetan@omegaintelligence.ai');
formData.append('password', 'Test123.');

const response = await fetch('http://localhost:8000/api/token', {
  method: 'POST',
  body: formData
});

const { access_token } = await response.json();
```

## Using the Token

Once you have the token, include it in subsequent requests:

```
Authorization: Bearer <access_token>
```

Example:
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  http://localhost:8000/api/users/me
```

## Additional Notes

1. The backend also has a mock login endpoint that returns a fake token without authentication (used for development).

2. There's also OAuth login support via Google at `/api/auth/google/login`.

3. The frontend stores the token in multiple places for reliability:
   - Cookie (primary)
   - localStorage (backup)
   - sessionStorage (current session)

4. Token expiration is set to 120 minutes (2 hours).

5. The user in the test case has `oauth_provider: "google"` set, but can still login with password, indicating the account supports both authentication methods.