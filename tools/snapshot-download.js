const s3 = require('s3')
const os = require('os')
const path = require('path')
const elastic = require('../lib/elastic')
const progress = require('../lib/progress')
const throttle = require('../lib/throttle')

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
  return s3.createClient({
    s3Options: {
      accessKeyId: global.workspace.auth.access_key,
      secretAccessKey: global.workspace.auth.secret_key
    }
  })
}

function resolveDirectory (dir) {
  if (path.isAbsolute(dir)) {
    return dir
  }

  if (/^~\//.test(dir)) {
    return path.join(os.homedir(), dir.replace('~/', ''))
  }

  return path.join(process.cwd(), dir)
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
      if (download.progressTotal) {
        status.tick()
      }
    }))

    download.on('end', resolve)
  })
}

function run (cluster, command) {
  const opts = command.opts()
  const target = resolveDirectory(opts.directory)

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
