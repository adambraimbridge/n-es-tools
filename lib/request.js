const fetch = require('node-fetch')

module.exports = function (url, params = {}) {
  return fetch(url, params).then((res) => {
    if (res.ok) {
      return res.json()
    } else {
      throw new Error(`Request returned a ${res.status} response`)
    }
  })
}
