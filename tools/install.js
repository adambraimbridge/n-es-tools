const configPath = require('../lib/config-path')
const fetch = require('node-fetch')
const fs = require('fs')
const mkdirp = require('mkdirp')
const os = require('os')
const path = require('path')
const template = require('../lib/template')

function createDirectory () {
  return new Promise((resolve, reject) => {
    mkdirp(path.dirname(configPath), (err) => {
      err ? reject(err) : resolve()
    })
  })
}

function readTemplate () {
  return new Promise((resolve, reject) => {
    const source = path.join(__dirname, '../templates/config.yml')

    fs.readFile(source, (err, data) => {
      err ? reject(err) : resolve(data.toString())
    })
  })
}

function writeTemplate (data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(configPath, data, (err) => {
      err ? reject(err) : resolve()
    })
  })
}

function fetchVaultToken () {
  return Promise.resolve(fs.readFileSync(path.join(os.homedir(), '.vault-token'), { encoding: 'utf8' }))
}

function fetchConfigVars (token) {
  const url = 'https://vault.in.ft.com/v1/secret/teams/next/n-es-tools/development'

  return fetch(url, {
    headers: { 'X-Vault-Token': token }
  })
    .then((res) => {
      if (res.ok) {
        return res.json().then(json => json.data)
      } else {
        throw new Error(`Vault returned a ${res.status}`)
      }
    })
}

function createConfigFile (data = {}) {
  return readTemplate().then((tmpl) => {
    const result = template(tmpl, data)
    return writeTemplate(result)
  })
}

function run ({ skipConfig }) {
  const noop = () => {}

  return Promise.resolve()
    .then(createDirectory)
    .then(skipConfig ? noop : fetchVaultToken)
    .then(skipConfig ? noop : fetchConfigVars)
    .then(createConfigFile)
    .then(() => {
      console.log(`Install complete, created ${configPath}`)
      process.exit()
    })
    .catch((err) => {
      console.error(`Install failed: ${err.toString()}. Are you logged into Vault?`)
      process.exit(1)
    })
}

module.exports = function (program) {
  if (process.env.CI) {
    console.log('CI environment detected, skipping install step')
    process.exit()
  }

  program
    .command('install')
    .description('Creates the necessary configuration files')
    .option('-S, --skip-config', 'Skip fetching configuration values')
    .action(run)
}
