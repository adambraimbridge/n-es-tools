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
    .then((response) => {
      if (!response.accepted) {
        throw new Error('Nothing to restore')
      }
    })
}

function pingStatus ({ snapshot, index }) {
  return client.indices.recovery({ index })
    .then((response) => {
      // we'll just take the status of the primary shard for simplicity
      const stats = response[index].shards.find((item) => item.source.snapshot === snapshot)

      if (stats) {
        status.total = stats.index.files.total
        status.curr = stats.index.files.recovered

        status.tick()

        if (stats.stage === 'DONE') {
          return
        }
      }

      return wait(10000).then(() => pingStatus({ snapshot, index }))
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
    .then(() => console.log(`Restored snapshot "${opts.snapshot}" to ${cluster} cluster`))
    .catch((err) => console.error(`Restore failed: ${err.message}`))
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
