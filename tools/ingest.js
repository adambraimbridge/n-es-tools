const Sema = require('async-sema')
const progress = require('../lib/progress')
const readFile = require('../lib/read-file')
const elasticItem = require('../lib/elastic-item')
const resolvePath = require('../lib/resolve-path')

let status

function loadFile (filename) {
  const lines = []
  const filepath = resolvePath(filename)

  return readFile(filepath, lines.push.bind(lines)).then(() => lines)
}

function queue (uuids) {
  // a simple semaphore pattern to rate-limit ingestion
  const sema = new Sema(2, { capacity: uuids.length })

  status.total = uuids.length

  return uuids.map((uuid) => (
    sema.v()
      .then(() => (
        Promise.all([
          elasticItem(uuid).eu.ingest(),
          elasticItem(uuid).us.ingest()
        ])
      ))
      .then(() => {
        status.tick()
        sema.p()
      })
  ))
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
