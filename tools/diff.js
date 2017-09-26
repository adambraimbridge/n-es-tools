const path = require('path')
const fetch = require('node-fetch')
const readFile = require('../lib/read-file')
const resolvePath = require('../lib/resolve-path')

let options
let uniqueA
let uniqueB

function loadFile (filename, callback) {
  const filepath = resolvePath(filename)
  return readFile(filepath, callback)
}

function handleA (line) {
  uniqueA.add(line)
}

function handleB (line) {
  if (uniqueA.has(line)) {
    uniqueA.delete(line)
  } else {
    uniqueB.add(line)
  }
}

function testCAPI (uuid) {
  return fetch(`https://api.ft.com/enrichedcontent/${uuid}`, {
    headers: {
      'X-Api-Key': global.workspace.keys.capi,
      'X-Policy': 'INCLUDE_RICH_CONTENT, INCLUDE_COMMENTS, INTERNAL_UNSTABLE, INCLUDE_PROVENANCE'
    }
  })
    .then((response) => {
      if (response.status === 404) {
        return { type: 'delete', uuid }
      }

      if (response.status === 200) {
        return { type: 'ingest', uuid }
      }

      return { type: 'inconclusive', uuid }
    })
}

function logAction ({ type, uuid }) {
  const filenameA = path.basename(options.fileA)
  const filenameB = path.basename(options.fileB)

  let advice = ''

  if (type === 'ingest') {
    advice = `(not found in ${uniqueA.has(uuid) ? filenameB : filenameA})`
  }

  if (type === 'delete') {
    advice = `(found in ${uniqueA.has(uuid) ? filenameA : filenameB})`
  }

  return `${type} ${uuid} ${advice}`
}

function run ([ fileA, fileB ], command) {
  // Sets are extremely performant with a large # of entries
  uniqueA = new Set()
  uniqueB = new Set()

  options = { fileA, fileB }

  return Promise.resolve()
    .then(() => loadFile(fileA, handleA))
    .then(() => loadFile(fileB, handleB))
    .then(() => {
      const joined = [...uniqueA, ...uniqueB]
      return Promise.all(joined.map(testCAPI))
    })
    .then((actions) => {
      console.log(`Diff complete, ${actions.length} actions required`)
      console.log(actions.map(logAction).join('\n'))
      process.exit()
    })
    .catch((err) => {
      console.error(`Diff failed: ${err.toString()}`)
      process.exit(1)
    })
}

module.exports = function (program) {
  program
    .command('diff <files...>')
    .description('Finds differences between two sets of UUIDs')
    .action(run)
}
