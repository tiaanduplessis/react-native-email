const { readFileSync } = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const qs = require('qs')

const root = path.join(__dirname, '..')

async function loadEmail (linking) {
  const context = vm.createContext({})
  const source = new vm.SourceTextModule(readFileSync(path.join(root, 'index.js'), 'utf8'), {
    context,
    identifier: path.join(root, 'index.js')
  })
  const dependencies = {
    'react-native': new vm.SyntheticModule(['Linking'], function () {
      this.setExport('Linking', linking)
    }, { context }),
    qs: new vm.SyntheticModule(['default'], function () {
      this.setExport('default', qs)
    }, { context })
  }

  await source.link(async (specifier) => {
    if (!dependencies[specifier]) throw new Error(`Unexpected import: ${specifier}`)
    return dependencies[specifier]
  })
  await source.evaluate()
  return source.namespace.default
}

function createLinking ({ supported = true, queryError, openError, openResult } = {}) {
  const calls = []
  const linking = {
    async canOpenURL (url) {
      calls.push(['canOpenURL', url])
      if (queryError) throw queryError
      return supported
    },
    async openURL (url) {
      calls.push(['openURL', url])
      if (openError) throw openError
      return openResult
    }
  }
  return { calls, linking }
}

module.exports = { createLinking, loadEmail, root }
