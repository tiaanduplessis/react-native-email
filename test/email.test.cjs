const assert = require('node:assert/strict')
const test = require('node:test')
const { createLinking, loadEmail } = require('./helpers.cjs')

test('encodes a string recipient and checks it before opening', async () => {
  const { calls, linking } = createLinking({ openResult: 'opened' })
  const email = await loadEmail(linking)
  const url = 'mailto:hello%2Bnews%40example.com'

  assert.equal(await email('hello+news@example.com'), 'opened')
  assert.deepEqual(calls, [['canOpenURL', url], ['openURL', url]])
})

test('encodes recipient arrays and all mail fields in the same URL', async () => {
  const { calls, linking } = createLinking()
  const email = await loadEmail(linking)
  const url = 'mailto:first%40example.com%2Csecond%2Bnews%40example.com' +
    '?cc=copy%40example.com%2Csecond-copy%40example.com' +
    '&bcc=hidden%40example.com%2Csecond-hidden%40example.com' +
    '&subject=Hello%20%26%20goodbye%3F' +
    '&body=Line%201%0ALine%202%20%2B%20caf%C3%A9'

  await email(['first@example.com', 'second+news@example.com'], {
    cc: ['copy@example.com', 'second-copy@example.com'],
    bcc: ['hidden@example.com', 'second-hidden@example.com'],
    subject: 'Hello & goodbye?',
    body: 'Line 1\nLine 2 + café'
  })

  assert.deepEqual(calls, [['canOpenURL', url], ['openURL', url]])
})

test('accepts string cc and bcc and omits unspecified mail fields', async () => {
  const { calls, linking } = createLinking()
  const email = await loadEmail(linking)
  const url = 'mailto:to%40example.com?cc=copy%40example.com&bcc=hidden%40example.com'

  await email('to@example.com', { cc: 'copy@example.com', bcc: 'hidden@example.com' })

  assert.deepEqual(calls, [['canOpenURL', url], ['openURL', url]])
})

test('defaults to an empty mailto URL when the recipient is omitted', async () => {
  const { calls, linking } = createLinking()
  const email = await loadEmail(linking)

  await email()

  assert.deepEqual(calls, [['canOpenURL', 'mailto:'], ['openURL', 'mailto:']])
})

test('waits for canOpenURL to resolve before launching', async () => {
  let resolveQuery
  const calls = []
  const email = await loadEmail({
    canOpenURL (url) {
      calls.push(['canOpenURL', url])
      return new Promise(resolve => { resolveQuery = resolve })
    },
    async openURL (url) {
      calls.push(['openURL', url])
    }
  })
  const result = email('to@example.com')
  assert.deepEqual(calls, [['canOpenURL', 'mailto:to%40example.com']])

  resolveQuery(true)
  await result

  assert.deepEqual(calls, [
    ['canOpenURL', 'mailto:to%40example.com'],
    ['openURL', 'mailto:to%40example.com']
  ])
})

test('rejects an unsupported URL without launching it', async () => {
  const { calls, linking } = createLinking({ supported: false })
  const email = await loadEmail(linking)

  await assert.rejects(email('to@example.com'), { message: 'Provided URL can not be handled' })

  assert.deepEqual(calls, [['canOpenURL', 'mailto:to%40example.com']])
})

test('propagates a visibility query failure without launching', async () => {
  const queryError = new Error('Package visibility query failed')
  const { calls, linking } = createLinking({ queryError })
  const email = await loadEmail(linking)

  await assert.rejects(email('to@example.com'), error => error === queryError)

  assert.deepEqual(calls, [['canOpenURL', 'mailto:to%40example.com']])
})

test('propagates an opening failure after a successful query', async () => {
  const openError = new Error('Mail app could not be opened')
  const { calls, linking } = createLinking({ openError })
  const email = await loadEmail(linking)
  const url = 'mailto:to%40example.com'

  await assert.rejects(email('to@example.com'), error => error === openError)

  assert.deepEqual(calls, [['canOpenURL', url], ['openURL', url]])
})

test('checkCanOpen false bypasses the query and opens the encoded URL', async () => {
  const { calls, linking } = createLinking({ supported: false, openResult: 'opened directly' })
  const email = await loadEmail(linking)

  assert.equal(await email('to@example.com', { checkCanOpen: false }), 'opened directly')

  assert.deepEqual(calls, [['openURL', 'mailto:to%40example.com']])
})

test('checkCanOpen false still propagates an opening failure', async () => {
  const openError = new Error('No mail app is installed')
  const { calls, linking } = createLinking({ openError })
  const email = await loadEmail(linking)

  await assert.rejects(email('to@example.com', { checkCanOpen: false }), error => error === openError)

  assert.deepEqual(calls, [['openURL', 'mailto:to%40example.com']])
})
