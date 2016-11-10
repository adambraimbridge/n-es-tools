const fs = require('fs')
const path = require('path')
const elastic = require('../lib/elastic')
const progress = require('../lib/progress')

const INDEX = 'v3_api_v2'
const TYPE = 'item'

let result
let client
let status
let output

function fetchScan () {
  return client.search({
    index: INDEX,
    type: TYPE,
    search_type: 'scan',
    sort: [ '_doc' ],
    scroll: '1m',
    size: 1000,
    _source: false,
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
      status.tick(response.hits.hits.length)
      response.hits.hits.forEach((item) => result.push(item._id))

      if (!status.complete) {
        return fetchScroll(response._scroll_id)
      }
    })
}

function writeOutput () {
  return new Promise((resolve, reject) => {
    fs.writeFile(output, result.sort().join('\n'), (err) => {
      err ? reject(err) : resolve()
    })
  })
}

function run (region, { filename }) {
  result = []
  client = elastic(region)
  status = progress('Downloading UUIDs')
  output = path.join(process.cwd(), filename)

  return Promise.resolve()
    .then(fetchScan)
    .then(fetchScroll)
    .then(writeOutput)
    .then(() => console.log(`UUIDs saved to ${output}`))
    .catch((err) => console.error(`UUIDs failed: ${err.message}`))
}

module.exports = function (program) {
  program
    .command('uuids <region>')
    .description('Downloads all content UUIDs')
    .option('-F, --filename <filename>', 'The output filename', 'uuids.csv')
    .action(run)
}
