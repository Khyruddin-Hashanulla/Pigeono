import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { getApp, cookiesFrom, teardown } from './setup.js'

let app

before(async () => {
  app = await getApp()
})

after(teardown)

test('health endpoint responds', async () => {
  const res = await request(app).get('/api/v1/health')
  assert.equal(res.status, 200)
  assert.equal(res.body.success, true)
})

test('register sends an email OTP and does not log the user in', async () => {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Test User', email: 'otp-flow@test.com', password: 'Password123' })
  assert.equal(res.status, 201)
  assert.equal(res.body.data.requiresVerification, true)
  // Email dev mode (no SMTP configured in tests) surfaces the code
  assert.match(res.body.data.devOtp, /^\d{6}$/)
  // No auth cookies until the email is verified
  assert.equal(res.headers['set-cookie'], undefined)
})

test('verify-email rejects a wrong code', async () => {
  await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Wrong Code', email: 'wrong-code@test.com', password: 'Password123' })
  const res = await request(app)
    .post('/api/v1/auth/verify-email')
    .send({ email: 'wrong-code@test.com', code: '000000' })
  assert.equal(res.status, 401)
})

test('verify-email with the right code logs the user in', async () => {
  const reg = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Happy Path', email: 'happy@test.com', password: 'Password123' })
  const res = await request(app)
    .post('/api/v1/auth/verify-email')
    .send({ email: 'happy@test.com', code: reg.body.data.devOtp })
  assert.equal(res.status, 200)
  assert.equal(res.body.data.email, 'happy@test.com')
  assert.ok(cookiesFrom(res).length > 0, 'sets auth cookies')

  // The session works
  const me = await request(app).get('/api/v1/auth/me').set('Cookie', cookiesFrom(res))
  assert.equal(me.status, 200)
  assert.equal(me.body.data.email, 'happy@test.com')
})

test('login blocks unverified accounts and re-sends an OTP', async () => {
  await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Unverified', email: 'unverified@test.com', password: 'Password123' })
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'unverified@test.com', password: 'Password123' })
  assert.equal(res.status, 403)
  assert.equal(res.body.data.requiresVerification, true)
  assert.match(res.body.data.devOtp, /^\d{6}$/)
})

test('resend-otp enforces the 60s cooldown', async () => {
  await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Cooldown', email: 'cooldown@test.com', password: 'Password123' })
  const res = await request(app).post('/api/v1/auth/resend-otp').send({ email: 'cooldown@test.com' })
  assert.equal(res.status, 429)
})

test('seeded demo user can log in (legacy accounts skip email verification)', async () => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'buyer@pigeono.com', password: 'BuyerPass123!' })
  assert.equal(res.status, 200)
  assert.ok(res.body.data.roles.includes('buyer'))
})

test('login rejects a wrong password', async () => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'buyer@pigeono.com', password: 'WrongPassword1!' })
  assert.equal(res.status, 401)
})
