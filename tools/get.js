const elastic = require('../lib/elastic')
const unescape = require('unescape')
const wrap = require('word-wrap')
const chalk = require('chalk')

const INDENT = '  '

const SOURCE_FIELDS = [
  'url',
  'title',
  'byline',
  'publishedDate',
  'bodyText',
  'displayConcept'
]

let client

function getContent (uuid) {
  return client.getSource({
    index: 'content',
    type: 'item',
    id: uuid,
    _source: SOURCE_FIELDS
  })
}

function prettify (content) {
  const publishedDate = new Date(content.publishedDate).toLocaleString()
  const bodyText = wrap(unescape(content.bodyText), { width: 80, indent: INDENT })

  return [
    INDENT + chalk.blue.bold.underline(content.title),
    INDENT + chalk.blue(content.byline),
    INDENT + chalk.magenta(`Posted on ${chalk.bold(publishedDate)} in ${chalk.bold(content.displayConcept.prefLabel)}`),
    chalk.white(bodyText),
    INDENT + chalk.yellow(`View the article at ${content.url}`)
  ].join('\n\n')
}

function run (cluster, uuid) {
  client = elastic(cluster)

  return getContent(uuid)
    .then(prettify)
    .then((content) => {
      console.log(content)
      process.exit()
    })
    .catch((err) => {
      console.error(`Snapshot failed: ${err.toString()}`)
      process.exit(1)
    })
}

module.exports = function (program) {
  program
    .command('get <cluster> <uuid>')
    .description('View a piece of content in plain text')
    .action(run)
}
