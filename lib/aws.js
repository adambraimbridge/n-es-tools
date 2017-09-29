const AWS = require('aws-sdk')

// Use a shared AWS client for all the things
if (global.workspace && global.workspace.auth) {
  AWS.config.update({
    credentials: new AWS.Credentials(
      global.workspace.auth.access_key,
      global.workspace.auth.secret_key
    )
  })
}

module.exports = AWS
