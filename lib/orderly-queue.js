const throttle = require('promise-parallel-throttle')
const wait = require('./wait')

function extractLastError ({ rejectedIndexes, taskResults }) {
  const lastFailure = rejectedIndexes[rejectedIndexes.length - 1]
  return taskResults[lastFailure]
}

module.exports = ({ queue, callback, progress = null, maxParallel = 5, maxErrors = 5 }) => {
  // could be better as a generator maybe ¯\_(ツ)_/¯
  const tasks = queue.map((member) => callback.bind(null, member))

  const next = (status) => {
    if (status.amountRejected >= maxErrors) {
      return Promise.reject(extractLastError(status))
    }

    // try to avoid running into rate-limits
    return wait(500)
  }

  return throttle.all(tasks, maxParallel, true, progress, next)
}
