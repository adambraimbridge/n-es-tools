const path = require('path')
const chalk = require('chalk')
const fetch = require('node-fetch')
const readFile = require('../lib/read-file')
const checkCAPI = require('../lib/check-capi')
const resolvePath = require('../lib/resolve-path')

let options
let uniqueA
let uniqueB

function loadFile (filename, callback) {
  const filepath = resolvePath(filename)
  return readFile(filepath, callback)
}

async function processActions (uuids) {
  const actions = await Promise.all(uuids.map(checkCAPI))

  return actions.map((type, i) => {
    const uuid = uuids[i]
    return { uuid, type }
  })
}

async function run (fileA, fileB) {
  // Sets are extremely performant with a large # of entries
  const unique = {
    a: new Set(),
    b: new Set()
  }

  const filenameA = path.basename(fileA)
  const filenameB = path.basename(fileB)

  // Load all UUIDs from each file...
  await loadFile(fileA, (line) => {
    unique.a.add(line)
  })

  // ... but only end up with the unique UUIDs
  await loadFile(fileB, (line) => {
    if (unique.a.has(line)) {
      unique.a.delete(line)
    } else {
      unique.b.add(line)
    }
  })

  // For convenience process the unique UUIDs together
  const targets = [ ...unique.a, ...unique.b ]

  if (targets.length) {
    console.log(`Found ${chalk.magenta(targets.length)} items requiring action`)

    // Check each UUID against CAPI, to infer which action to take
    const actions = await processActions(targets)

    // Check each action against the original lists, to update the right cluster
    return actions.map(({ uuid, type }) => {
      let note

      if (type === 'ingest') {
        note = `not found in ${unique.a.has(uuid) ? filenameB : filenameA}`
      }

      if (type === 'delete') {
        note = `found in ${unique.a.has(uuid) ? filenameA : filenameB}`
      }

      console.log(`${chalk.bold(type)} ${chalk.cyan(uuid)} (${note})`)
    })
  } else {
    console.log('No differences found')
  }
}

module.exports = function (program) {
  program
    .command('diff <a> <b>')
    .description('Finds differences between two sets of UUIDs')
    .action(run)
}
