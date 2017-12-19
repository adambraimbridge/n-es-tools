module.exports = function (callback, delay = 1000) {
  let wait

  return function () {
    if (!wait) {
      callback()
      wait = setTimeout(() => (wait = null), delay)
    }
  }
}
