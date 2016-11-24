const TOKEN = /\{\{(\w+)\}\}/g

module.exports = function (template, data) {
  return template.replace(TOKEN, (match, property) => data[property])
}
