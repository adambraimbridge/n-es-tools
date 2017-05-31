const s3 = require('s3')
const path = require('path')
const elastic = require('../lib/elastic')
const progress = require('../lib/progress')
const throttle = require('../lib/throttle')

let client
let status

function fetchRepository ({ repository }) {
  return client.snapshot.getRepository({ repository })
    .then((response) => response[repository].settings)
}

function createAwsClient () {
  return s3.createClient({
    s3Options: {
      accessKeyId: global.workspace.auth.access_key,
      secretAccessKey: global.workspace.auth.secret_key
    }
  })
}

function downloadDirectory (client, repo, target) {
  return new Promise((resolve, reject) => {
    const download = client.downloadDir({
      localDir: target,
      s3Params: {
        Bucket: repo.bucket,
        Prefix: repo.base_path
      }
    })

    download.on('error', reject)

    download.on('progress', throttle(() => {
      // progress amounts are in bytes so => MB
      status.total = Math.ceil(download.progressTotal / 1000000)
      status.curr = Math.ceil(download.progressAmount / 1000000)

      // don't draw a progress bar before we have any data
      if (download.progressTotal) {
        status.tick()
      }
    }))

    download.on('end', resolve)
  })
}

function run (cluster, command) {
  const opts = command.opts()

  client = elastic(cluster)

  status = progress('Downloading snapshot')

  return fetchRepository(opts)
    .then((repo) => {
      const aws = createAwsClient()
      const target = path.join(process.cwd(), opts.directory)

      return downloadDirectory(aws, repo, target)
    })
    .then(() => {
      console.log('Snapshot download complete')
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
