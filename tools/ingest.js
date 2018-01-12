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

function queue (uuids, cluster) {
  // a simple semaphore pattern to rate-limit ingestion
  const sema = new Sema(2, { capacity: uuids.length })

  status.total = uuids.length

  return uuids.map((uuid) => (
    sema.v()
      .then(() => (
        elasticItem(uuid)[cluster].ingest()
      ))
      .then(() => {
        status.tick()
        sema.p()
      })
  ))
}

function run (cluster, file) {
  status = progress('Ingesting content')

  return loadFile(file)
    .then((uuids) => (
      Promise.all(queue(uuids, cluster))
    ))
    .then((items) => {
      console.log(`Ingest complete, ingested ${items.length} items to ${cluster} cluster`)
      process.exit()
    })
    .catch((err) => {
      console.error(`Ingest failed: ${err.toString()}`)
      process.exit(1)
    })
}

module.exports = function (program) {
  program
    .command('ingest <cluster> <file>')
    .description('Takes a set of content UUIDs and sends each for ingestion')
    .action(run)
}
