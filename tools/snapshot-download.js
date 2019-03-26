const s3 = require('s3-client')
const AWS = require('aws-sdk')
const elastic = require('../lib/elastic')
const progress = require('../lib/progress')
const throttle = require('../lib/throttle')
const resolvePath = require('../lib/resolve-path')
const credentials = require('../lib/aws-credentials')

let client
let status

function fetchRepositories ({ repository }) {
  return client.cat.repositories({ format: 'json' })
    .then((repositories) => repositories.some(({ id }) => id === repository))
}

function fetchSnapshots ({ repository }) {
  return client.cat.snapshots({ format: 'json', repository })
    .then((snapshots) => snapshots.some(({ status }) => status === 'SUCCESS'))
}

function fetchRepositorySettings ({ repository }) {
  return client.snapshot.getRepository({ repository })
    .then((response) => response[repository].settings)
}

function createAwsClient () {
  const s3Client = new AWS.S3({ credentials })
  return s3.createClient({ s3Client })
}

function downloadDirectory (client, settings, target) {
  return new Promise((resolve, reject) => {
    const download = client.downloadDir({
      localDir: target,
      s3Params: {
        Bucket: settings.bucket,
        Prefix: settings.base_path
      }
    })

    download.on('error', reject)

    download.on('progress', throttle(() => {
      // progress amounts are in bytes so => MB
      status.total = Math.ceil(download.progressTotal / 1000000)
      status.curr = Math.ceil(download.progressAmount / 1000000)

      // don't draw a progress bar before we have any data
      if (download.progressTotal && status.curr <= status.total) {
        status.tick(0)
      }
    }))

    download.on('end', resolve)
  })
}

function run (cluster, command) {
  const opts = command.opts()
  const target = resolvePath(opts.directory)

  client = elastic(cluster)

  status = progress('Downloading snapshot')

  return fetchRepositories(opts)
    .then((exists) => {
      if (exists) {
        return fetchSnapshots(opts)
      } else {
        throw new Error(`No repository named "${opts.repository}"`)
      }
    })
    .then((exists) => {
      if (exists) {
        return fetchRepositorySettings(opts)
      } else {
        throw new Error(`No snapshots available in repository "${opts.repository}".`)
      }
    })
    .then((settings) => {
      const aws = createAwsClient()
      return downloadDirectory(aws, settings, target)
    })
    .then(() => {
      console.log(`Snapshot download completed: ${target}`)
      process.exit()
    })
    .catch((err) => {
      console.error(`Snapshot download failed: ${err.toString()}`)
      process.exit(1)
    })
}

module.exports = function (program) {
  program
    .command('snapshot-download <cluster>')
    .description('Downloads the latest snapshot')
    .option('-R, --repository <name>', 'The repository name', 's3-snapshots')
    .option('-D, --directory <name>', 'The destination directory name', 'my-downloaded-snapshots')
    .action(run)
}
