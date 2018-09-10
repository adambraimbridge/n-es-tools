const progress = require('../lib/progress')
const elastic = require('../lib/elastic')
const wait = require('../lib/wait')

let client
let status

function verifyIndices ({ source, dest }) {
  return client.cat.indices({
    format: 'json'
  })
    .then((result) => {
      const a = result.some(({ index }) => index === source)
      const b = result.some(({ index }) => index === dest)

      if (a === false) {
        return Promise.reject(`Could not find the index "${source}"`)
      }

      if (b === false) {
        return Promise.reject(`Could not find the index "${dest}"`)
      }
    })
}

function startReindex ({ source, dest }) {
  return client.reindex({
    body: {
      source: {
        index: source
      },
      dest: {
        index: dest
      }
    },
    waitForCompletion: false
  })
}

function pingStatus (taskId) {
  return client.tasks.get({ taskId })
    .then((result) => {
      status.total = result.task.status.total
      status.curr = result.task.status.created

      // Don't draw a progress bar before we have any data
      // and don't draw one when AWS gets carried away.
      if (status.total > 0 && status.curr <= status.total) {
        status.tick(0)
      }

      if (result.completed) {
        if (result.failures && result.failures.length) {
          return Promise.reject(
            new Error(`Task completed but with ${result.failures.length} failures`)
          )
        } else {
          return result.response
        }
      }

      return wait(10000).then(() => pingStatus(taskId))
    })
}

function run (cluster, command) {
  const opts = command.opts()

  client = elastic(cluster)
  status = progress('Reindexing')

  return Promise.resolve()
    .then(() => verifyIndices(opts))
    .then(() => startReindex(opts))
    .then(({ task }) => {
      console.log(`Reindex started with task ID ${task}`)
      return pingStatus(task)
    })
    .then(() => {
      console.log(`Reindex from ${opts.source} to ${opts.dest} complete`)
      process.exit()
    })
    .catch((err) => {
      console.error(`Reindex failed: ${err.toString()}`)
      process.exit(1)
    })
}

module.exports = function (program) {
  program
    .command('reindex <cluster>')
    .description('Copies content from one index to another')
    .option('-S, --source <name>', 'The source index name', 'content')
    .option('-D, --dest <name>', 'The destination index name')
    .action(run)
}
