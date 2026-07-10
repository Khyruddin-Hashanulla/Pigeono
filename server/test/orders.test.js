import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { getApp, cookiesFrom, teardown } from './setup.js'

let app
let buyerCookie
let listing // an active listing owned by a seeded vendor
let vendorCookie // cookie for the vendor who owns `listing`

const VENDOR_LOGINS = {
  // seeded vendor emails by store-slug keyword
  kolkata: 'arjun@demo.pigeono.com',
  dilli: 'salman@demo.pigeono.com',
  mumbai: 'rohan@demo.pigeono.com',
  patel: 'raj@demo.pigeono.com',
  awadh: 'meera@demo.pigeono.com',
}

before(async () => {
  app = await getApp()

  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'buyer@pigeono.com', password: 'BuyerPass123!' })
  buyerCookie = cookiesFrom(login)

  // Pick an active listing and log in as its owner
  const listings = await request(app).get('/api/v1/listings?limit=10')
  listing = listings.body.data.find((l) => l.status === 'active')
  assert.ok(listing, 'seed data has an active listing')

  const slug = listing.vendorId?.storeSlug || ''
  const email = Object.entries(VENDOR_LOGINS).find(([key]) => slug.includes(key))?.[1]
  assert.ok(email, `vendor email resolved for slug "${slug}"`)
  const vLogin = await request(app).post('/api/v1/auth/login').send({ email, password: 'VendorPass123!' })
  assert.equal(vLogin.status, 200, 'vendor login succeeds')
  vendorCookie = cookiesFrom(vLogin)
})

after(teardown)

test('direct-payment order lifecycle: create -> buyer-paid -> vendor confirm -> complete', async () => {
  // 1. Buyer places the order and receives the vendor payment instructions
  const created = await request(app)
    .post('/api/v1/orders')
    .set('Cookie', buyerCookie)
    .send({ pigeonId: listing._id, delivery: { method: 'pickup' } })
  assert.equal(created.status, 201)
  const order = created.body.data.order
  assert.equal(order.status, 'pending')
  assert.equal(order.paymentStatus, 'pending')
  assert.ok(created.body.data.paymentInstructions, 'buyer gets payment instructions')

  // 2. Buyer marks the payment as sent
  const paid = await request(app)
    .post(`/api/v1/orders/${order._id}/buyer-paid`)
    .set('Cookie', buyerCookie)
    .send({ method: 'upi' })
  assert.equal(paid.status, 200)
  assert.equal(paid.body.data.paymentStatus, 'paid_by_buyer')

  // 3. Vendor confirms the money arrived
  const confirmed = await request(app)
    .post(`/api/v1/orders/${order._id}/mark-paid`)
    .set('Cookie', vendorCookie)
    .send({})
  assert.equal(confirmed.status, 200)
  assert.equal(confirmed.body.data.status, 'confirmed_by_vendor')
  assert.equal(confirmed.body.data.paymentStatus, 'confirmed')

  // 4. Vendor marks the sale complete after handover
  const completed = await request(app)
    .post(`/api/v1/orders/${order._id}/complete`)
    .set('Cookie', vendorCookie)
    .send({})
  assert.equal(completed.status, 200)
  assert.equal(completed.body.data.status, 'completed')
})

test('a stranger cannot act on someone else\'s order', async () => {
  // Register + verify a fresh third-party user
  const reg = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Stranger', email: 'stranger@test.com', password: 'Password123' })
  const verified = await request(app)
    .post('/api/v1/auth/verify-email')
    .send({ email: 'stranger@test.com', code: reg.body.data.devOtp })
  const strangerCookie = cookiesFrom(verified)

  // Find one of the buyer's seeded orders
  const orders = await request(app).get('/api/v1/orders').set('Cookie', buyerCookie)
  assert.equal(orders.status, 200)
  const someOrder = orders.body.data[0]
  assert.ok(someOrder, 'buyer has at least one order')

  const res = await request(app)
    .post(`/api/v1/orders/${someOrder._id}/buyer-paid`)
    .set('Cookie', strangerCookie)
    .send({ method: 'upi' })
  assert.ok([403, 404].includes(res.status), `stranger blocked (got ${res.status})`)
})

test('creating an order requires authentication', async () => {
  const res = await request(app)
    .post('/api/v1/orders')
    .send({ pigeonId: listing._id, delivery: { method: 'pickup' } })
  assert.equal(res.status, 401)
})

test('vendor cannot buy their own listing', async () => {
  const res = await request(app)
    .post('/api/v1/orders')
    .set('Cookie', vendorCookie)
    .send({ pigeonId: listing._id, delivery: { method: 'pickup' } })
  assert.ok(res.status >= 400, `own-listing purchase rejected (got ${res.status})`)
})
