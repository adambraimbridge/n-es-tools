const progress = require('../lib/progress')
const elastic = require('../lib/elastic')
const wait = require('../lib/wait')

let client
let status

function verifyRepository ({ repository }) {
  return client.snapshot.verifyRepository({ repository })
}

function restoreSnapshot ({ repository, snapshot, index }) {
  return client.snapshot.restore({
    repository,
    snapshot,
    waitForCompletion: false,
    body: {
      indices: index,
      // we're restoring an index, not the cluster
      include_aliases: false
    }
  })
    .then(({ accepted, snapshot }) => {
      if (!accepted) {
        if (!snapshot.indices.length) {
          return Promise.reject(new Error(`No index named "${index}" found`))
        }

        return Promise.reject(new Error('Nothing to restore'))
      }
    })
}

function pingStatus ({ snapshot, index }) {
  return client.indices.recovery({ index })
    .then((response) => {
      if (response.hasOwnProperty(index)) {
        const stats = response[index].shards.filter((item) => (
          item.type === 'SNAPSHOT' && item.source.snapshot === snapshot
        ))

        status.total = stats.reduce((count, item) => count + item.index.files.total, 0)
        status.curr = stats.reduce((count, item) => count + item.index.files.recovered, 0)

        if (status.total > 0 && status.curr <= status.total) {
          status.tick()
        }

        if (stats.every(({ stage }) => stage === 'DONE')) {
          return
        } else {
          return wait(10000).then(() => pingStatus({ snapshot, index }))
        }
      } else {
        console.log(`Waiting for restore of "${snapshot}" to start`)
        return wait(3000).then(() => pingStatus({ snapshot, index }))
      }
    })
}

function run (cluster, command) {
  const opts = command.opts()

  client = elastic(cluster)
  status = progress('Restoring snapshot')

  return Promise.resolve()
    .then(() => verifyRepository(opts))
    .then(() => restoreSnapshot(opts))
    .then(() => pingStatus(opts))
    .then(() => {
      console.log(`Restored "${opts.snapshot}" snapshot of "${opts.index}" index to ${cluster} cluster`)
      process.exit()
    })
    .catch((err) => {
      console.error(`Restore failed: ${err.toString()}`)
      process.exit(1)
    })
}

module.exports = function (program) {
  program
    .command('restore <cluster>')
    .description('Restores an index snapshot')
    .option('-I, --index <name>', 'The index name', 'content')
    .option('-S, --snapshot <name>', 'The snapshot name', 'my-snapshot')
    .option('-R, --repository <name>', 'The repository name', 's3-snapshots')
    .action(run)
}
