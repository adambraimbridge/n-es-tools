const fs = require('fs')
const path = require('path')
const elastic = require('../lib/elastic')
const progress = require('../lib/progress')

let client
let status
let output
let options

const seen = new Map()

function fetchScan () {
  return client.search({
    index: options.index,
    type: 'item',
    search_type: 'scan',
    sort: [ '_doc' ],
    scroll: '1m',
    size: 1000,
    _source: [ 'metadata' ]
  })
    .then((response) => {
      status.total = response.hits.total
      return response._scroll_id
    })
}

function fetchScroll (scrollId) {
  return client.scroll({
    scroll: '1m',
    scrollId
  })
    .then((response) => {
      const uuids = response.hits.hits.map((item) => item._id).join('\n')

      const lines = []

      response.hits.hits.forEach((doc) => {
        doc._source.metadata.forEach(({ idV1, prefLabel, taxonomy }) => {
          if (seen.has(idV1)) {
            seen.set(idV1, seen.get(idV1) + 1)
          } else {
            seen.set(idV1, 1)
            lines.push(`${idV1}|${prefLabel}|${taxonomy}`)
          }
        })
      })

      if (lines.length) {
        output.write(lines.join('\n') + '\n')
      }

      status.tick(response.hits.hits.length)

      if (!status.complete) {
        return fetchScroll(response._scroll_id)
      } else {
        output.end()
      }
    })
}

function run (cluster, command) {
  const filename = path.join(process.cwd(), `metadata-${cluster}.csv`)

  client = elastic(cluster)
  status = progress('Downloading Metadata')
  output = fs.createWriteStream(filename)
  options = command.opts()

  output.write('ID|Name|Taxonomy\n')

  return Promise.resolve()
    .then(fetchScan)
    .then(fetchScroll)
    .then(() => console.log(`Metadata saved to ${filename}`))
    .catch((err) => console.error(`Metadata failed: ${err.message}`))
}

module.exports = function (program) {
  program
    .command('metadata <cluster>')
    .description('Downloads all unique TME tags')
    .option('-I, --index <name>', 'The index name', 'content')
    .action(run)
}
