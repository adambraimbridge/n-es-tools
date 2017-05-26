const elastic = require('../lib/elastic')

let client

function fetchAliases () {
  return client.cat.aliases({
    format: 'json'
  })
}

function fetchIndices () {
  return client.cat.indices({
    format: 'json'
  })
}

function extractCurrentIndex (aliases) {
  return aliases[0].index
}

function extractLatestIndex (indices) {
  const PATTERN = /^content_\d{4}-\d{2}-\d{2}$/
  const DATE = /(\d{4}-\d{2}-\d{2})/

  return indices
        // pull out index names
        .map((item) => item.index)
        // ignore kibana etc.
        .filter((index) => PATTERN.test(index))
        // sort by date, oldest to newest
        .sort((a, b) => new Date(a.match(DATE).pop()) - new Date(b.match(DATE).pop()))
        // we have a winner!
        .pop()
}

function updateAliases (aliases, indices) {
  const current = extractCurrentIndex(aliases)
  const latest = extractLatestIndex(indices)

  if (current === latest) {
    throw new Error(`Current index and latest index are the same (${latest})`)
  }

  const actions = aliases.reduce((actions, { alias }) => {
    console.log(`Removing ${current} => ${alias}`)
    actions.push({ remove: { index: current, alias } })

    console.log(`Adding ${latest} => ${alias}`)
    actions.push({ add: { index: latest, alias } })

    return actions
  }, [])

  return client.indices.updateAliases({ body: { actions } })
}

function run (cluster, command) {
  client = elastic(cluster)

  return Promise.all([ fetchAliases(), fetchIndices() ])
    .then(([ aliases, indices ]) => updateAliases(aliases, indices))
    .then(() => {
      console.log('Alias complete')
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
    .action(run)
}
