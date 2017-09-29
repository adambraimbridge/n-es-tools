const AWS = require('aws-sdk')

AWS.config.update({
  credentials: new AWS.Credentials(
    global.workspace.auth.access_key,
    global.workspace.auth.secret_key
  )
})

module.exports = AWS
