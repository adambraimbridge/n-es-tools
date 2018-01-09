const request = require('./request')

const TIMEOUT = 9000

function update (id, method, cluster) {
  const body = JSON.stringify({ id })

  const headers = {
    'Content-Type': 'application/json',
    'X-Api-Key': global.workspace.keys.es_interface
  }

  const params = {
    timeout: TIMEOUT,
    headers,
    method,
    body
  }

  const endpoint = `https://ft-next-es-interface-${cluster}.herokuapp.com/api/item`

  return request(endpoint, params)
}

class Item {
  constructor (uuid) {
    this.uuid = uuid
  }

  exec () {
    return update(this.uuid, this.method, this.cluster)
  }

  get eu () {
    this.cluster = 'eu'
    return this
  }

  get us () {
    this.cluster = 'us'
    return this
  }

  get ingest () {
    this.method = 'PUT'
    return this.exec
  }

  get delete () {
    this.method = 'DELETE'
    return this.exec
  }
}

// Example usage: item(123).eu.ingest()
module.exports = (uuid) => new Item(uuid)
