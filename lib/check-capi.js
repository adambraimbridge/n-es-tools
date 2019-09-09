const fetch = require('node-fetch')

const POLICIES = [
  'INTERNAL_UNSTABLE'
]

module.exports = (uuid) => (
  fetch(`https://api.ft.com/internalcontent/${uuid}`, {
    headers: {
      'X-Api-Key': global.workspace.keys.capi,
      'X-Policy': POLICIES.join(', ')
    }
  })
    .then((response) => {
      if (response.status === 404) {
        return 'delete'
      }

      if (response.status === 200) {
        return 'ingest'
      }

      return null
    })
)
