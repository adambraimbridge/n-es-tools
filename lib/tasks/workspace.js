const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')

let output
let target
let source

function makeSpace () {
  return new Promise((resolve, reject) => {
    mkdirp(output, (err) => {
      err ? reject(err) : resolve(output)
    })
  })
}

function copyTemplate () {
  const read = fs.createReadStream(source)
  const write = fs.createWriteStream(target)

  return new Promise((resolve, reject) => {
    read.pipe(write)

    write.on('error', reject)
    write.on('close', resolve)
  })
}

module.exports = function ({ directory }) {
  output = path.resolve(directory || '.')
  source = path.join(__dirname, '../templates/.env.example')
  target = path.join(output, '.env')

  return Promise.resolve()
    .then(makeSpace)
    .then(copyTemplate)
    .then(() => console.log(`Workspace created in ${output}`))
}
