const throttle = require('promise-parallel-throttle')
const wait = require('./wait')

function nextCheck () {
  // try to avoid running into rate-limits
  return wait(500).then(() => true)
}

function formatErrors (queue, status) {
  return status.rejectedIndexes.map((i) => `${queue[i]}, "${status.taskResults[i]}"`)
}

module.exports = ({ queue, callback, progressCallback = null, maxInProgress = 5 }) => {
  // could be better as a generator maybe ¯\_(ツ)_/¯
  const tasks = queue.map((member) => () => callback(member))

  return throttle.raw(tasks, { nextCheck, progressCallback, maxInProgress })
    .then((status) => formatErrors(queue, status))
}
