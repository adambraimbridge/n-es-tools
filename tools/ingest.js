const path = require('path')
const fetch = require('node-fetch')
const throttle = require('promise-parallel-throttle')
const wait = require('../lib/wait')
const progress = require('../lib/progress')
const readFile = require('../lib/read-file')

let status
let failures

function loadFile (filename) {
  const lines = []
  const callback = (line) => lines.push(line)
  const filepath = path.join(process.cwd(), filename)

  return readFile(filepath, callback).then(() => lines)
}

function queue (uuids) {
  // a generator may be better ¯\_(ツ)_/¯
  const tasks = uuids.map((uuid) => ingest.bind(null, uuid))
  // try to avoid running into rate-limits
  const limit = () => wait(500)
  const update = () => status.tick()

  status.total = tasks.length

  return throttle.all(tasks, 10, true, update, limit)
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
    fetch('https://ft-next-es-interface-eu.herokuapp.com/api/item', params),
    fetch('https://ft-next-es-interface-us.herokuapp.com/api/item', params)
  ])
    .catch(() => {
      failures.push(uuid)
    })
}

function run (file) {
  status = progress('Ingesting content')

  failures = []

  return loadFile(file)
    .then(queue)
    .then(() => {
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
