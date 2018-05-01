const fs = require('fs')
const elastic = require('../lib/elastic')
const progress = require('../lib/progress')
const template = require('../lib/template')
const resolvePath = require('../lib/resolve-path')

let client
let status
let options

const seen = new Map()

function registerAnnotation (annotation) {
  if (seen.has(annotation.id)) {
    const concept = seen.get(annotation.id)
    seen.set(annotation.id, Object.assign(annotation, { count: concept.count + 1 }))
  } else {
    seen.set(annotation.id, Object.assign(annotation, { count: 1 }))
  }
}

function pluckAnnotations ({ _source }) {
  if (Array.isArray(_source.annotations)) {
    _source.annotations.forEach(registerAnnotation)
  }
}

function fetchScan () {
  return client.search({
    index: options.index,
    type: 'item',
    q: options.query,
    sort: [ '_doc' ],
    scroll: '1m',
    size: 1000,
    _source: [ 'annotations.id', 'annotations.prefLabel' ]
  })
    .then((response) => {
      status.total = response.hits.total

      response.hits.hits.forEach(pluckAnnotations)

      status.tick(response.hits.hits.length)

      return response._scroll_id
    })
}

function fetchScroll (scrollId) {
  return client.scroll({
    scroll: '1m',
    scrollId
  })
    .then((response) => {
      response.hits.hits.forEach(pluckAnnotations)

      status.tick(response.hits.hits.length)

      if (response.hits.hits.length > 0) {
        return fetchScroll(response._scroll_id)
      }
    })
}

function run (cluster, command) {
  client = elastic(cluster)
  status = progress('Downloading concepts')
  options = command.opts()

  // allow templating in filename to interpolate options ✌️
  const filename = template(options.filename, Object.assign({}, options, { cluster }))
  const filepath = resolvePath(filename)

  return Promise.resolve()
    .then(fetchScan)
    .then(fetchScroll)
    .then(() => {
      const output = fs.createWriteStream(filepath)

      output.write('UUID|Label|Count\n')

      for (const [ uuid, concept ] of seen) {
        output.write(`${uuid}|${concept.prefLabel}|${concept.count}\n`)
      }

      output.end()

      return new Promise((resolve) => {
        output.on('finish', resolve)
      })
    })
    .then(() => {
      console.log(`Concepts saved to ${filepath}`)
      process.exit()
    })
    .catch((err) => {
      console.error(`Concepts failed: ${err.toString()}`)
      process.exit(1)
    })
}

module.exports = function (program) {
  program
    .command('concepts <cluster>')
    .description('Downloads all unique concepts')
    .option('-I, --index <name>', 'The index name', 'content')
    .option('-Q, --query <querystring>', 'Simple query string query')
    .option('-F, --filename <filename>', 'Output filename', 'concepts-{{cluster}}.txt')
    .action(run)
}
