/*
|--------------------------------------------------------------------------
| Throttles
|--------------------------------------------------------------------------
|
| Applied in start/routes/v1.ts. Limits are per client IP.
|
*/
import limiter from '@adonisjs/limiter/services/main'

// Credential stuffing is the threat here, not legitimate typos: someone
// fumbling their password a few times must not be locked out for long.
export const loginThrottle = limiter.define('login', () => {
  return limiter.allowRequests(10).every('1 minute').blockFor('5 mins')
})

// Signup is a write path that costs a bcrypt hash and a row; nobody needs to
// create accounts faster than this.
export const registerThrottle = limiter.define('register', () => {
  return limiter.allowRequests(5).every('1 hour')
})

// Every accepted call creates a pre-auth key in Headscale. The enroll token
// itself is unguessable (192 bits), so this is about resource exhaustion
// rather than brute force — a machine legitimately enrolls once.
export const agentRegisterThrottle = limiter.define('agentRegister', () => {
  return limiter.allowRequests(10).every('1 hour')
})
