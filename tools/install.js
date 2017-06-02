const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const fetch = require('node-fetch')
const shell = require('../lib/shell')
const template = require('../lib/template')
const configPath = require('../lib/config-path')

const UUID = /\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/

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

function fetchHerokuStatus () {
  return shell('heroku', [ 'whoami' ])
}

function fetchHerokuAuth () {
  return shell('heroku', [ 'config:get', 'APIKEY', '--app', 'ft-next-config-vars' ])
    .then((output) => {
      if (UUID.test(output)) {
        return Promise.resolve(output)
      } else {
        return Promise.reject(output)
      }
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
    .then(skipConfig ? noop : fetchHerokuStatus)
    .then(skipConfig ? noop : fetchHerokuAuth)
    .then(skipConfig ? noop : fetchConfigVars)
    .then(createConfigFile)
    .then(() => {
      console.log(`Install complete, created ${configPath}`)
      process.exit()
    })
    .catch((err) => {
      console.error(`Install failed: ${err.toString()}. Are you logged into Heroku?`)
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
