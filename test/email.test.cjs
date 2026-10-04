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

const bodyExamples = [
  {
    name: 'CRLF, blank lines, and leading and trailing line breaks',
    body: '\r\nFirst\r\n\r\nLast\r\n',
    encoded: '%0D%0AFirst%0D%0A%0D%0ALast%0D%0A'
  },
  {
    name: 'Unicode and reserved characters with CRLF',
    body: 'café ☕\r\n雪 & 50% + #?',
    encoded: 'caf%C3%A9%20%E2%98%95%0D%0A%E9%9B%AA%20%26%2050%25%20%2B%20%23%3F'
  },
  {
    name: 'LF and mixed line endings without normalization',
    body: 'First\nSecond\r\nThird\rLast',
    encoded: 'First%0ASecond%0D%0AThird%0DLast'
  },
  {
    name: 'literal backslash-n as text',
    body: 'First\\nSecond',
    encoded: 'First%5CnSecond'
  },
  {
    name: 'pre-encoded line breaks as text',
    body: 'First%0D%0ASecond',
    encoded: 'First%250D%250ASecond'
  },
  {
    name: 'HTML break tags as text',
    body: 'First<br>Second',
    encoded: 'First%3Cbr%3ESecond'
  }
]

for (const { name, body, encoded } of bodyExamples) {
  test(`encodes ${name} with and without the availability check`, async () => {
    for (const checkCanOpen of [true, false]) {
      const { calls, linking } = createLinking()
      const email = await loadEmail(linking)
      const url = `mailto:recipient%40example.com?body=${encoded}`

      await email('recipient@example.com', { body, checkCanOpen })

      const expected = checkCanOpen
        ? [['canOpenURL', url], ['openURL', url]]
        : [['openURL', url]]
      assert.deepEqual(calls, expected)
    }
  })
}

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
