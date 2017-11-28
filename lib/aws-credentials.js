const { Credentials } = require('aws-sdk')

module.exports = new Credentials(
  global.workspace.auth.access_key,
  global.workspace.auth.secret_key
)
