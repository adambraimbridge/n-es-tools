const Progress = require('progress')

module.exports = function (message) {
  const format = message + ' [:bar] :current/:total (:percent)'

  return new Progress(format, {
    total: 0,
    width: 30
  })
}
