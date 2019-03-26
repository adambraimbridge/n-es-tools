const AWS = require('aws-sdk')
const elasticsearch = require('elasticsearch')
const credentials = require('./aws-credentials')

// This should match the version of ELasticsearch used
const API_VERSION = '5.1'

const REGION = /\.(\w{2}-\w{4}-\d)\.es\./

function createClient (url) {
  const local = url.includes('localhost')
  const region = local ? undefined : url.match(REGION).pop()
  const awsConfig = local ? undefined : new AWS.Config({ region, credentials })
  const connectionClass = local ? undefined : require('http-aws-es')

  const client = new elasticsearch.Client({
    connectionClass,
    awsConfig,
    host: url,
    apiVersion: API_VERSION
  })

  // expose the AWS host details
  client.host = { url, region }

  return client
}

module.exports = function (cluster) {
  if (global.workspace.clusters[cluster]) {
    return createClient(global.workspace.clusters[cluster])
  } else {
    console.error(`No cluster named "${cluster}" configured`)
    process.exit(1)
  }
}
