const chalk = require('chalk')
const elastic = require('../lib/elastic')
const checkCAPI = require('../lib/check-capi')
const elasticItem = require('../lib/elastic-item')

const DOCTOR = 'http://ft-next-es-interface-eu.herokuapp.com/ui/content-doctor'

const SORT = 'publishedDate:desc'

const QUERY = 'publishedDate:>now-24h'

const SIZE = 100

const A = 'eu'

const B = 'us'

function extractIDs (response) {
  if (response && response.hits && response.hits.hits) {
    return response.hits.hits.map((hit) => hit._id)
  } else {
    throw new Error('Elasticsearch responded with invalid data')
  }
}

async function fetchIDs () {
  const request = {
    index: 'content',
    type: 'item',
    sort: SORT,
    q: QUERY,
    size: SIZE,
    _source: false
  }

  const clusterA = elastic(A)
  const clusterB = elastic(B)

  const [ hitsA, hitsB ] = await Promise.all([
    clusterA.search(request),
    clusterB.search(request)
  ])

  return {
    a: extractIDs(hitsA),
    b: extractIDs(hitsB)
  }
}

function findUnique (a, b) {
  const setA = new Set(a)
  const setB = new Set()

  b.forEach((item) => {
    if (setA.has(item)) {
      setA.delete(item)
    } else {
      setB.add(item)
    }
  })

  return { a: setA, b: setB }
}

async function processActions (uuids) {
  const actions = await Promise.all(uuids.map(checkCAPI))

  return actions.map((type, i) => {
    const uuid = uuids[i]
    return { uuid, type }
  })
}

async function run () {
  // Go fetch a list of the latest content UUIDs from each cluster
  const uuids = await fetchIDs()

  // Find any UUIDs that do not occur in both lists
  const unique = findUnique(uuids.a, uuids.b)

  // For convenience process the unique UUIDs together
  const targets = [ ...unique.a, ...unique.b ]

  if (targets.length) {
    console.log(`Found ${chalk.magenta(targets.length)} items requiring action`)

    // Check each UUID against CAPI, to infer which action to take
    const actions = await processActions(targets)

    // Check each action against the original lists, to update the right cluster
    const updates = actions.map(({ uuid, type }) => {
      let target

      if (type === 'ingest') {
        target = unique.a.has(uuid) ? B : A
      }

      if (type === 'delete') {
        target = unique.a.has(uuid) ? A : B
      }

      if (target) {
        console.log(`Will ${chalk.bold(type)} ${chalk.cyan(uuid)} for ${chalk.red(target)} cluster`)
        return elasticItem(uuid)[target][type]()
      } else {
        console.warn(chalk.yellow(`Don't know what to do with ${chalk.cyan(uuid)}, try ${DOCTOR}`))
      }
    })

    await Promise.all(updates)
  } else {
    console.log('No differences found')
  }
}

module.exports = function (program) {
  program
    .command('sync')
    .description('Runs a quick sync for latest content between EU and US indexes')
    .action(run)
}
