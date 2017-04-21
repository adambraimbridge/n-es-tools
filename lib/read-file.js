const fs = require('fs')
const readline = require('readline')

const WHITESPACE = /^\s+$/

module.exports = function (filepath, callback) {
  // This is more complex than fs.readFile but it means
  // we do not have to buffer the whole thing in memory
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(filepath)
    const reader = readline.createInterface({ input })

    input.on('error', reject)

    reader.on('line', (data) => {
      // ignore empty or whitespace-only lines
      if (data && WHITESPACE.test(data) === false) {
        callback(data)
      }
    })

    reader.on('close', resolve)
  })
}
