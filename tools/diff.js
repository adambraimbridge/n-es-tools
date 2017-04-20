const path = require('path')
const fetch = require('node-fetch')
const readFile = require('../lib/read-file')

let options
let uniqueA
let uniqueB

function loadFile (filename, callback) {
  const filepath = path.join(process.cwd(), filename)
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
  return Promise.all([
    fetchCapiV1(uuid),
    fetchCapiV2(uuid)
  ])
    .then(([ res1, res2 ]) => {
      const status1 = res1.status
      const status2 = res2.status

      if (status1 === 404 && status2 === 404) {
        return { type: 'delete', uuid }
      }

      if (status1 === 200 || status2 === 200) {
        return { type: 'ingest', uuid }
      }

      return { type: 'inconclusive', uuid }
    })
}

function fetchCapiV1 (uuid) {
  return fetch(`https://api.ft.com/content/items/v1/${uuid}`, {
    headers: {
      'X-Api-Key': global.workspace.keys.capi,
      // allow access to wires
      'X-FT-API-Content-Control-Policy': 'FT_B2C_FT_COM_CONTENT_POLICY_2013'
    }
  })
}

function fetchCapiV2 (uuid) {
  return fetch(`https://api.ft.com/enrichedcontent/${uuid}`, {
    headers: {
      'X-Api-Key': global.workspace.keys.capi,
      'X-Policy': 'INCLUDE_RICH_CONTENT, INCLUDE_COMMENTS, INTERNAL_UNSTABLE, INCLUDE_PROVENANCE'
    }
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
    })
    .catch((err) => {
      console.error(`Diff failed: ${err.toString()}`)
    })
}

module.exports = function (program) {
  program
    .command('diff <files...>')
    .description('Finds differences between two sets of UUIDs')
    .action(run)
}
