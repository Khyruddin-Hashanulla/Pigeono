import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { getApp, cookiesFrom, teardown } from './setup.js'

let app
let vendorCookie

before(async () => {
  app = await getApp()
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'salman@demo.pigeono.com', password: 'VendorPass123!' })
  vendorCookie = cookiesFrom(login)
})

after(teardown)

test('plans are publicly listed', async () => {
  const res = await request(app).get('/api/v1/subscriptions/plans')
  assert.equal(res.status, 200)
  const ids = res.body.data.map((p) => p.id)
  assert.deepEqual(ids.sort(), ['basic', 'elite', 'pro'])
})

test('simulated subscription purchase activates the plan', async () => {
  const order = await request(app)
    .post('/api/v1/subscriptions/create-order')
    .set('Cookie', vendorCookie)
    .send({ plan: 'pro' })
  assert.equal(order.status, 200)
  assert.equal(order.body.data.simulated, true, 'runs in simulated mode without Razorpay keys')
  const sim = order.body.data.simPayment

  const verify = await request(app)
    .post('/api/v1/subscriptions/verify')
    .set('Cookie', vendorCookie)
    .send({
      razorpay_order_id: order.body.data.order.id,
      razorpay_payment_id: sim.paymentId,
      razorpay_signature: sim.signature,
    })
  assert.equal(verify.status, 200)
  assert.equal(verify.body.data.subscription.plan, 'pro')
  assert.equal(verify.body.data.subscription.status, 'active')
  assert.match(verify.body.data.receiptNo, /^PGN-/)
})

test('verify rejects a forged signature', async () => {
  const order = await request(app)
    .post('/api/v1/subscriptions/create-order')
    .set('Cookie', vendorCookie)
    .send({ plan: 'basic' })
  const res = await request(app)
    .post('/api/v1/subscriptions/verify')
    .set('Cookie', vendorCookie)
    .send({
      razorpay_order_id: order.body.data.order.id,
      razorpay_payment_id: 'pay_forged',
      razorpay_signature: 'not-a-real-signature',
    })
  assert.ok(res.status >= 400, `forged signature rejected (got ${res.status})`)
})

test('unsigned Razorpay webhooks are rejected', async () => {
  const res = await request(app)
    .post('/api/v1/webhooks/razorpay')
    .set('Content-Type', 'application/json')
    .send({ event: 'order.paid' })
  assert.ok(res.status >= 400, `unsigned webhook rejected (got ${res.status})`)
})

test('subscription endpoints require a vendor session', async () => {
  const res = await request(app).post('/api/v1/subscriptions/create-order').send({ plan: 'pro' })
  assert.equal(res.status, 401)
})
