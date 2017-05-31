const fs = require('fs')
const path = require('path')
const elastic = require('../lib/elastic')
const progress = require('../lib/progress')

let client
let status
let output
let options

function fetchScan () {
  return client.search({
    index: options.index,
    type: 'item',
    q: options.query,
    sort: [ '_doc' ],
    scroll: '1m',
    size: 5000,
    _source: false
  })
    .then((response) => {
      status.total = response.hits.total

      response.hits.hits.forEach((item, i) => output.write(item._id + '\n'))
      status.tick(response.hits.hits.length)

      return response._scroll_id
    })
}

function fetchScroll (scrollId) {
  return client.scroll({
    scroll: '1m',
    scrollId
  })
    .then((response) => {
      response.hits.hits.forEach((item, i) => output.write(item._id + '\n'))
      status.tick(response.hits.hits.length)

      if (response.hits.hits.length > 0) {
        return fetchScroll(response._scroll_id)
      } else {
        output.end()
      }
    })
}

function run (cluster, command) {
  const filename = path.join(process.cwd(), `uuids-${cluster}.txt`)

  client = elastic(cluster)
  status = progress('Downloading UUIDs')
  output = fs.createWriteStream(filename)
  options = command.opts()

  return Promise.resolve()
    .then(fetchScan)
    .then(fetchScroll)
    .then(() => {
      console.log(`UUIDs saved to ${filename}`)
      process.exit()
    })
    .catch((err) => {
      console.error(`UUIDs failed: ${err.toString()}`)
      process.exit(1)
    })
}

module.exports = function (program) {
  program
    .command('uuids <cluster>')
    .description('Downloads all content UUIDs')
    .option('-I, --index <name>', 'The index name', 'content')
    .option('-Q, --query <querystring>', 'Simple query string query')
    .action(run)
}
