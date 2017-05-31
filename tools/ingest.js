const path = require('path')
const request = require('../lib/request')
const progress = require('../lib/progress')
const readFile = require('../lib/read-file')
const orderlyQueue = require('../lib/orderly-queue')

let status

function loadFile (filename) {
  const lines = []
  const callback = (line) => lines.push(line)
  const filepath = path.join(process.cwd(), filename)

  return readFile(filepath, callback).then(() => lines)
}

function queue (uuids) {
  const tick = () => status.tick()

  status.total = uuids.length

  return orderlyQueue({
    queue: uuids,
    callback: ingest,
    progressCallback: tick
  })
}

function ingest (uuid) {
  const params = {
    method: 'PUT',
    timeout: 9000,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': global.workspace.keys.es_interface
    },
    body: JSON.stringify({ id: uuid })
  }

  // this will double up overhead of modelling but it is simple
  return Promise.all([
    request('https://ft-next-es-interface-eu.herokuapp.com/api/item', params),
    request('https://ft-next-es-interface-us.herokuapp.com/api/item', params)
  ])
}

function run (file) {
  status = progress('Ingesting content')

  return loadFile(file)
    .then(queue)
    .then((failures) => {
      console.log('Ingest complete')

      if (failures.length) {
        console.warn(`However, there were ${failures.length} failures:`)
        console.log(failures.join('\n'))
      }

      process.exit()
    })
    .catch((err) => {
      console.error(`Ingest failed: ${err.toString()}`)
      process.exit(1)
    })
}

module.exports = function (program) {
  program
    .command('ingest <file>')
    .description('Takes a set of content UUIDs and sends each for ingestion')
    .action(run)
}
