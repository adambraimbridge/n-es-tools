const fs = require('fs')
const path = require('path')
const elastic = require('../lib/elastic')
const progress = require('../lib/progress')

let client
let status
let output
let options

function fetchAliases () {
  return client.cat.aliases({
    format: 'json'
  })
}

function fetchLatestIndex () {
  const DATE = /(\d{4}-\d{2}-\d{2})/

  return client.cat.indices({
    format: 'json'
  })
    .then((response) => {
      return response
        // extract index names
        .map((item) => item.index)
        // ignore kibana etc.
        .filter((index) => /^content_/.test(index))
        // sort by date, oldest to newest
        .sort((a, b) => new Date(a.match(DATE).pop()) - new Date(b.match(DATE).pop()))
        // we have a winner!
        .pop()
    })
}

function updateAliases (aliases, target) {
  const actions = []

  aliases.forEach((alias) => {
    actions.push({ remove: { index: alias.index, alias: alias.alias } })
    actions.push({ add: { index: target, alias: alias.alias } })
  })

  return client.indices.updateAliases({ body: { actions } })
}

function run (cluster, command) {
  client = elastic(cluster)
  options = command.opts()

  return Promise.all([ fetchAliases(), fetchLatestIndex() ])
    .then(([ aliases, target ]) => {
      if (aliases[0].index === target) {
        throw new Error (`Current index and target index are the same (${target})`)
      } else {
        return updateAliases(aliases, target)
      }
    })
    .then(fetchAliases)
    .then((aliases) => {
      console.log(`Alias complete: ${aliases.map(({ index, alias }) => `${alias} => ${index}`).join(', ')}`)
      process.exit()
    })
    .catch((err) => {
      console.error(`Alias failed: ${err.toString()}`)
      process.exit(1)
    })
}

module.exports = function (program) {
  program
    .command('alias <cluster>')
    .description('Automatically updates existing aliases to point to the latest index')
    .option('-I, --index <name>', 'The index name', 'content')
    .action(run)
}
