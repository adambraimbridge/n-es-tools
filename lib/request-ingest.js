const request = require('./request')

module.exports = function (uuid) {
  const params = {
    method: 'PUT',
    timeout: 9000,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': global.workspace.keys.es_interface
    },
    body: JSON.stringify({ id: uuid })
  }

  // this will double up overhead of modelling but it is simple
  return Promise.all([
    request('https://ft-next-es-interface-eu.herokuapp.com/api/item', params),
    request('https://ft-next-es-interface-us.herokuapp.com/api/item', params)
  ])
};
