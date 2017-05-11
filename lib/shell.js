const { spawn } = require('child_process')

module.exports = function (exec, options = []) {
  let out = ''
  let err = ''

  return new Promise((resolve, reject) => {
    const proc = spawn(exec, options)

    proc.stdout.on('data', (chunk) => {
      out += chunk.toString().trim()
    })

    proc.stderr.on('data', (chunk) => {
      err += chunk.toString().trim()
    })

    proc.on('error', reject)

    proc.on('exit', (code) => {
      if (code === 0) {
        resolve(out)
      } else {
        reject(err)
      }
    })
  })
}
