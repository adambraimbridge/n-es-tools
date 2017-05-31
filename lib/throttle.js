module.exports = function (callback, delay = 500) {
  let wait

  return function () {
    if (!wait) {
      callback()
      wait = setTimeout(() => (wait = null), delay)
    }
  }
}
