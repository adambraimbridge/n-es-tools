const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const fetch = require('node-fetch')
const { spawn } = require('child_process')
const template = require('../lib/template')

const FILE = 'workspace.yml'
const UUID = /\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/

let output
let target
let source

function createDirectory () {
  return new Promise((resolve, reject) => {
    mkdirp(output, (err) => {
      err ? reject(err) : resolve(output)
    })
  })
}

function readTemplate () {
  return new Promise((resolve, reject) => {
    fs.readFile(source, (err, data) => {
      err ? reject(err) : resolve(data.toString())
    })
  })
}

function writeTemplate (data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(target, data, (err) => {
      err ? reject(err) : resolve()
    })
  })
}

function fetchHerokuAuth () {
  return new Promise((resolve, reject) => {
    const proc = spawn('heroku', [ 'config:get', 'APIKEY', '--app', 'ft-next-config-vars' ])
    const exit = () => proc.kill()

    let data = ''

    proc.stdout.on('data', (chunk) => {
      data += chunk.toString().trim()
    })

    proc.stderr.on('data', exit)

    proc.on('error', reject)

    proc.on('exit', (code) => {
      if (code === 0 && UUID.test(data)) {
        resolve(data)
      } else {
        reject(data)
      }
    })
  })
}

function fetchConfigVars (key) {
  const url = 'https://ft-next-config-vars.herokuapp.com/development/n-es-tools'

  return fetch(url, {
    headers: { Authorization: key }
  })
    .then((res) => {
      if (res.ok) {
        return res.json()
      } else {
        throw new Error(`Config vars returned a ${res.status}`)
      }
    })
}

function createWorkspaceYAML (data = {}) {
  return readTemplate()
    .then((tmpl) => {
      const result = template(tmpl, data)
      return writeTemplate(result)
    })
}

function run (directory, { skipConfigVars }) {
  output = path.resolve(directory)
  source = path.join(__dirname, '../templates', FILE)
  target = path.join(output, FILE)

  const noop = () => {}

  return Promise.resolve()
    .then(createDirectory)
    .then(skipConfigVars ? noop : fetchHerokuAuth)
    .then(skipConfigVars ? noop : fetchConfigVars)
    .then(createWorkspaceYAML)
    .then(() => console.log(`Workspace created in ${output}`))
    .catch((err) => console.error(`Workspace failed: ${err.toString()}`))
}

module.exports = function (program) {
  program
    .command('workspace <directory>')
    .description('Creates a new workspace')
    .option('-S, --skip-config-vars', 'Skip trying to fetch config vars')
    .action(run)
}
