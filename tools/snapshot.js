const progress = require('../lib/progress')
const elastic = require('../lib/elastic')
const wait = require('../lib/wait')

let client
let status

function verifyRepository ({ repository }) {
  return client.snapshot.verifyRepository({ repository })
}

function createSnapshot ({ repository, name, index }) {
  return client.snapshot.create({
    repository,
    snapshot: name,
    waitForCompletion: false,
    body: {
      indices: index,
      // we're snapshotting an index, not the cluster
      include_global_state: false
    }
  })
}

function pingStatus ({ repository, name }) {
  return client.snapshot.status({
    snapshot: name,
    repository
  })
    .then((response) => {
      const { state, stats } = response.snapshots.find((item) => item.snapshot === name)

      status.total = stats.number_of_files
      status.curr = stats.processed_files

      status.tick()

      if (state === 'SUCCESS' || state === 'DONE') {
        return
      }

      if (state === 'FAILED') {
        status.terminate()
        return Promise.reject('Snapshot failed')
      }

      return wait(10000).then(() => pingStatus({ repository, name }))
    })
}

function run (cluster, opts) {
  client = elastic(cluster)
  status = progress('Creating snapshot')

  return Promise.resolve()
    .then(() => verifyRepository(opts))
    .then(() => createSnapshot(opts))
    .then(() => pingStatus(opts))
    .then(() => console.log(`Snapshot "${opts.name}" created from ${cluster} cluster`))
    .catch((err) => console.error(`Snapshot failed: ${err.message}`))
}

module.exports = function (program) {
  program
    .command('snapshot <cluster>')
    .description('Creates an index snapshot')
    .option('-I, --index <name>', 'The index name', 'v3_api_v2')
    .option('-N, --name <name>', 'The snapshot name', 'my-snapshot')
    .option('-R, --repository <name>', 'The repository name', 's3-snapshots')
    .action(run)
}
