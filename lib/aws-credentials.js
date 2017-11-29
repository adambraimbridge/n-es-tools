const { Credentials } = require('aws-sdk')

module.exports = global.workspace ? new Credentials(
  global.workspace.auth.access_key,
  global.workspace.auth.secret_key
) : null
