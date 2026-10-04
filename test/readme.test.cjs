const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')
const espree = require('espree')
const { createLinking, loadEmail, root } = require('./helpers.cjs')

const readme = readFileSync(path.join(root, 'README.md'), 'utf8')

function codeExample (heading, language) {
  const section = readme.split(heading)[1]
  assert.ok(section, `README section exists: ${heading}`)
  const match = section.match(new RegExp('```' + language + '\\n([\\s\\S]*?)```'))
  assert.ok(match, `README section has a ${language} example`)
  return match[1]
}

function usageHandler () {
  const code = codeExample('## Usage', 'jsx')
  // Parse the whole example first, including JSX and class fields. Extracting just
  // the handler would otherwise miss syntax errors in the rest of the example.
  const ast = espree.parse(code, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
    range: true
  })
  const app = ast.body.find(node => node.type === 'ExportDefaultDeclaration')
  assert.equal(app.declaration.type, 'ClassDeclaration')
  const handler = app.declaration.body.body.find(node => node.key.name === 'handleEmail')
  assert.equal(handler.type, 'PropertyDefinition')
  assert.equal(handler.value.type, 'ArrowFunctionExpression')
  return code.slice(...handler.value.range)
}

async function runUsageExample (linking, code = `(${usageHandler()})()`) {
  const sendEmail = await loadEmail(linking)
  const errors = []
  const invocations = []
  const pending = []
  vm.runInNewContext(code, {
    email (to, options) {
      invocations.push(JSON.parse(JSON.stringify({ to, options })))
      const result = sendEmail(to, options)
      pending.push(result)
      return result
    },
    console: { error: error => errors.push(error) }
  })
  await Promise.allSettled(pending)
  return { errors, invocations }
}

// The documentation uses a small, complete XML fragment. Track its actual tag
// hierarchy so a queries element nested in application cannot pass this check.
function manifestTree (xml) {
  const document = { name: '#document', children: [] }
  const stack = [document]
  let offset = 0
  for (const match of xml.matchAll(/<!--[\s\S]*?-->|<[^>]+>/g)) {
    assert.match(xml.slice(offset, match.index), /^\s*$/, 'XML contains only tags and whitespace')
    offset = match.index + match[0].length
    const token = match[0]
    if (token.startsWith('<!--')) continue
    const closing = token.match(/^<\/([\w:-]+)\s*>$/)
    if (closing) {
      assert.ok(stack.length > 1, 'XML closing tag has an open element')
      assert.equal(stack.pop().name, closing[1], 'XML closing tags match')
      continue
    }
    const opening = token.match(/^<([\w:-]+)([\s\S]*?)(\/?)>$/)
    assert.ok(opening, `XML tag is valid: ${token}`)
    const attributes = {}
    let attributeOffset = 0
    for (const attribute of opening[2].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      assert.match(opening[2].slice(attributeOffset, attribute.index), /^\s*$/, 'XML attributes are quoted')
      assert.ok(!(attribute[1] in attributes), 'XML attributes are unique')
      attributes[attribute[1]] = attribute[2] ?? attribute[3]
      attributeOffset = attribute.index + attribute[0].length
    }
    assert.match(opening[2].slice(attributeOffset), /^\s*$/, 'XML attributes are quoted')
    const node = { name: opening[1], attributes, children: [] }
    stack.at(-1).children.push(node)
    if (!opening[3]) stack.push(node)
  }
  assert.match(xml.slice(offset), /^\s*$/, 'XML has no unparsed content')
  assert.equal(stack.length, 1, 'XML elements are closed')
  assert.equal(document.children.length, 1, 'XML has one root element')
  return document.children[0]
}

test('README JSX example parses and launches its documented message', async () => {
  const { calls, linking } = createLinking()
  const { errors, invocations } = await runUsageExample(linking)
  const url = 'mailto:first%40example.com%2Csecond%40example.com' +
    '?cc=copy%40example.com%2Canother-copy%40example.com&bcc=hidden%40example.com' +
    '&subject=Show%20how%20to%20use&body=Some%20body%20right%20here'

  assert.deepEqual(invocations, [{
    to: ['first@example.com', 'second@example.com'],
    options: {
      cc: ['copy@example.com', 'another-copy@example.com'],
      bcc: 'hidden@example.com',
      subject: 'Show how to use',
      body: 'Some body right here',
      checkCanOpen: true
    }
  }])
  assert.deepEqual(calls, [['canOpenURL', url], ['openURL', url]])
  assert.deepEqual(errors, [])
})

test('README JSX example handles rejection when no mail app is available', async () => {
  const { calls, linking } = createLinking({ supported: false })
  const { errors } = await runUsageExample(linking)

  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], 'canOpenURL')
  assert.equal(errors.length, 1)
  assert.equal(errors[0].message, 'Provided URL can not be handled')
})

test('README line-break example encodes CRLF and a blank line', async () => {
  const { calls, linking } = createLinking()
  const code = codeExample('### Line breaks in the body', 'js')
  espree.parse(code, { ecmaVersion: 'latest' })
  const { errors, invocations } = await runUsageExample(linking, code)
  const url = 'mailto:recipient%40example.com?subject=Multiple%20lines' +
    '&body=First%20line%0D%0ASecond%20line%0D%0A%0D%0ALast%20paragraph'

  assert.deepEqual(invocations, [{
    to: 'recipient@example.com',
    options: {
      subject: 'Multiple lines',
      body: 'First line\r\nSecond line\r\n\r\nLast paragraph'
    }
  }])
  assert.deepEqual(calls, [['canOpenURL', url], ['openURL', url]])
  assert.deepEqual(errors, [])
})

test('README line-break example handles an opening failure', async () => {
  const openError = new Error('Mail app could not be opened')
  const { calls, linking } = createLinking({ openError })
  const { errors } = await runUsageExample(linking, codeExample('### Line breaks in the body', 'js'))

  assert.deepEqual(calls.map(([method]) => method), ['canOpenURL', 'openURL'])
  assert.deepEqual(errors, [openError])
})

test('README Android query matches VIEW and mailto in one manifest-level intent', () => {
  const manifest = manifestTree(codeExample('### Running on Android SDK 30+', 'xml'))
  assert.equal(manifest.name, 'manifest')
  assert.equal(manifest.attributes['xmlns:android'], 'http://schemas.android.com/apk/res/android')
  const queries = manifest.children.find(node => node.name === 'queries')
  assert.ok(queries, 'queries is a direct child of manifest')
  const mailIntent = queries.children.find(node => node.name === 'intent' &&
    node.children.some(child => child.name === 'action' && child.attributes['android:name'] === 'android.intent.action.VIEW') &&
    node.children.some(child => child.name === 'data' && child.attributes['android:scheme'] === 'mailto'))
  assert.ok(mailIntent, 'one intent declares both ACTION_VIEW and the mailto scheme')
})
