const os = require('os')
const path = require('path')

const TILDE = /^~\/?/

module.exports = function (dir) {
  if (path.isAbsolute(dir)) {
    return dir
  }

  if (TILDE.test(dir)) {
    return path.join(os.homedir(), dir.replace(TILDE, ''))
  }

  return path.join(process.cwd(), dir)
}
