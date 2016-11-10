const elastic = require('../lib/elastic')

let client

function createRepository ({ name, bucketName, bucketRegion, bucketRole, bucketFolder }) {
  return client.snapshot.createRepository({
    repository: name,
    verify: true,
    body: {
      type: 's3',
      settings: {
        bucket: bucketName,
        region: bucketRegion,
        role_arn: bucketRole,
        base_path: bucketFolder
      }
    }
  })
}

function run (region, opts) {
  client = elastic(region)

  return createRepository(opts)
    .then(() => console.log(`Repository "${opts.name}" created in ${region} region`))
    .catch((err) => console.error(`Repository failed: ${err.message}`))
}

module.exports = function (program) {
  program
    .command('repository <region>')
    .description('Sets up a snapshot repository')
    .option('-N, --name <name>', 'The repository name', 's3-snapshots')
    .option('-B, --bucket-name <name>', 'The S3 bucket name', 'nextcontent-backups')
    .option('-R, --bucket-region <region>', 'The S3 bucket region', 'eu-west-1')
    .option('-A, --bucket-role <arn>', 'The S3 bucket ARN role', 'arn:aws:iam::027104099916:role/FTApplicationRoleFor_nextcontent')
    .option('-F, --bucket-folder <name>', 'The S3 bucket subfolder', new Date().toISOString().split('T').shift())
    .action(run)
}
