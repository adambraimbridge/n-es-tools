const progress = require('../lib/progress')
const elastic = require('../lib/elastic')
const wait = require('../lib/wait')

let client
let status

function verifyIndices ({ source, destination }) {
  return client.cat.indices({
    format: 'json'
  })
    .then((result) => {
      const a = result.some(({ index }) => index === source)
      const b = result.some(({ index }) => index === destination)

      if (a === false) {
        return Promise.reject(`Could not find the index "${source}"`)
      }

      if (b === false) {
        return Promise.reject(`Could not find the index "${destination}"`)
      }
    })
}

function startReindex ({ source, destination }) {
  return client.reindex({ source, destination, waitForCompletion: false })
}

function pingStatus (taskId) {
  return client.tasks.get({ taskId })
    .then((result) => {
      if (result.completed) {
        status.total = result.task.status.total
        status.curr = sresult.task.status.created

        status.tick()

        return result.response
      } else if (result.errors) {
        status.terminate()

        return Promise.reject(
          new Error(result.errors.join(', '))
        )
      } else {
        return wait(10000).then(() => pingStatus(taskId))
      }
    })
}

function run (cluster, command) {
  const opts = command.opts()

  client = elastic(cluster)
  status = progress('Reindexing')

  return Promise.resolve()
    .then(() => verifyIndices(opts))
    .then(() => startReindex(opts))
    .then(({ taskId }) => pingStatus(taskId))
    .then(() => {
      console.log(`Reindex from ${opts.source} to ${opts.destination} complete`)
      process.exit()
    })
    .catch((err) => {
      console.error(`Reindex failed: ${err.toString()}`)
      process.exit(1)
    })
}

module.exports = function (program) {
  program
    .command('reindex <cluster> <dest>')
    .description('Restores an index snapshot')
    .option('-S, --source <name>', 'The source index name', 'content')
    .option('-D, --destination <name>', 'The destination index name', 'content_{{date}}')
    .action(run)
}
