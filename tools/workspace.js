const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')

const FILE = 'workspace.yml'

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

function run (directory) {
  output = path.resolve(directory)
  source = path.join(__dirname, '../templates', FILE)
  target = path.join(output, FILE)

  return Promise.resolve()
    .then(makeSpace)
    .then(copyTemplate)
    .then(() => console.log(`Workspace created in ${output}`))
    .catch((err) => console.error(`Workspace failed: ${err.message}`))
}

module.exports = function (program) {
  program
    .command('workspace <directory>')
    .description('Creates a new workspace')
    .action(run)
}
