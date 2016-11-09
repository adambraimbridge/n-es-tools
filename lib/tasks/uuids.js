const fs = require('fs')
const path = require('path')
const util = require('util')
const elastic = require('../elastic')
const progress = require('../progress')

const INDEX = 'v3_api_v2'
const TYPE = 'item'
const FILE = 'uuids-%s.csv'

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

module.exports = function ({ region }) {
  result = []
  client = elastic(region)
  status = progress('Downloading UUIDs')
  output = path.join(process.cwd(), util.format(FILE, region))

  return Promise.resolve()
    .then(fetchScan)
    .then(fetchScroll)
    .then(writeOutput)
    .then(() => console.log(`UUIDs saved to ${output}`))
}
