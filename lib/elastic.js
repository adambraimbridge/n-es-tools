const AWS = require('aws-sdk')
const elasticsearch = require('elasticsearch')
const connectionClass = require('http-aws-es')
const credentials = require('./aws-credentials')

// This should match the version of ELasticsearch used
const API_VERSION = '5.2'

function createClient (url) {
  const region = url.match(/\.(\w{2}-\w{4}-\d)\.es\./).pop()

  const client = new elasticsearch.Client({
    connectionClass,
    host: url,
    apiVersion: API_VERSION,
    awsConfig: new AWS.Config({ region, credentials })
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
