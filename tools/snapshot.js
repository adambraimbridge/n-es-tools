const progress = require('../lib/progress')
const elastic = require('../lib/elastic')
const wait = require('../lib/wait')

const INDICES = 'v3_api_v2'

let client
let status

function verifyRepository ({ repository }) {
  return client.snapshot.verifyRepository({ repository })
}

function createSnapshot ({ repository, name }) {
  return client.snapshot.create({
    repository,
    snapshot: name,
    waitForCompletion: false,
    body: {
      indices: INDICES,
      // we're snapshotting an index, not the cluster
      include_global_state: false
    }
  })
}

function pingSnapshot ({ repository, name }) {
  return client.snapshot.status({
    snapshot: name,
    repository
  })
    .then((response) => {
      const { state, shards_stats } = response.snapshots.find((item) => item.snapshot === name)

      status.total = shards_stats.total
      status.tick(shards_stats.done)

      if (state === 'SUCCESS' || state === 'DONE') {
        return
      }

      if (state === 'FAILED') {
        status.terminate()
        return Promise.reject('Snapshot failed')
      }

      return wait(10000).then(() => pingSnapshot({ repository, name }))
    })
}

function run (region, opts) {
  client = elastic(region)
  status = progress('Creating snapshot')

  return Promise.resolve()
    .then(() => verifyRepository(opts))
    .then(() => createSnapshot(opts))
    .then(() => pingSnapshot(opts))
    .then(() => console.log(`Snapshot "${opts.name}" created from ${region} region`))
    .catch((err) => console.error(`Snapshot failed: ${err.message}`))
}

module.exports = function (program) {
  program
    .command('snapshot <region>')
    .description('Creates a snapshot')
    .option('-N, --name <name>', 'The snapshot name', 'my-snapshot')
    .option('-R, --repository <name>', 'The repository name', 's3-snapshots')
    .action(run)
}
