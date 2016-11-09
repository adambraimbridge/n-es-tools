const elasticsearch = require('elasticsearch')
const connectionClass = require('http-aws-es')

function createClient (url) {
  const region = url.match(/\.(\w{2}-\w{4}-\d)\.es\./).pop()

  return new elasticsearch.Client({
    connectionClass,
    host: url,
    amazonES: {
      region: region,
      accessKey: process.env.ELASTIC_AWS_ACCESS_KEY,
      secretKey: process.env.ELASTIC_AWS_SECRET_KEY
    }
  })
}

const clients = {
  eu: process.env.ELASTIC_AWS_HOST_EU,
  us: process.env.ELASTIC_AWS_HOST_US
}

module.exports = function (region) {
  if (clients[region]) {
    return createClient(clients[region])
  } else {
    console.error(`No client available for region "${region}"`)
    console.error(`Valid regions are: ${Object.keys(clients)}`)

    process.exit()
  }
}
