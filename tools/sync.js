const fs = require('fs')
const elastic = require('../lib/elastic')
const ingest = require('../lib/request-ingest')
const resolvePath = require('../lib/resolve-path')

const SORT = 'publishedDate:desc'

const QUERY = 'publishedDate:>now-24h NOT type:podcast'

function extractIDs (response) {
  if (response && response.hits && response.hits.hits) {
    return response.hits.hits.map((hit) => hit._id)
  } else {
    throw new Error('Elasticsearch responded with invalid data')
  }
}

function fetchIDs (options) {
  const request = {
    index: 'content',
    type: 'item',
    sort: SORT,
    q: QUERY,
    size: options.size,
    _source: false
  }

  const eu = elastic('eu')
  const us = elastic('us')

  return Promise.all([
    eu.search(request),
    us.search(request)
  ])
    .then(([ eu, us ]) => (
      [
        extractIDs(eu),
        extractIDs(us)
      ]
    ))
}

function differences (a, b) {
	const uniqueA = new Set(a)
	const uniqueB = new Set()

	b.forEach((item) => {
		if (uniqueA.has(item)) {
			uniqueA.delete(item)
		} else {
			uniqueB.add(item)
		}
	})

	return [...uniqueA, ...uniqueB];
}

function run (command) {
  const options = command.opts()

  return fetchIDs(options)
    .then(([ lhs, rhs ]) => {
      console.log(`Fetched ${options.size} IDs from EU and US indexes`)

      const diff = differences(lhs, rhs)

      if (diff.length) {
        console.log(`Found ${diff.length} differences:\n${diff.join('\n')}`)

        return Promise.all(diff.map(ingest)).then(() => {
          console.log('Reingested items')
        })
      } else {
        console.log('No differences found')
      }
    })
}

module.exports = function (program) {
  program
    .command('sync')
    .description('Attempts to run a quick sync between EU and US indexes')
    .option('-S, --size <size>', 'Max number of documents to check', 100)
    .action(run)
}
