'use strict'

const FileWriter = require('../output/files')
const extractDepartement = require('../extract/departement')

function ready() {
  process.send({ eventName: 'ready' })
}

function boom(err) {
  process.send({ eventName: 'error', errorMessage: err.message || err })
}

process.on('message', ({ action, codeDep, src, dest }) => {
  if (action !== 'extract') throw new Error('Not implemented')

  const writer = new FileWriter(dest)
  const extractor = extractDepartement(src, codeDep)

  extractor
    .on('start', () => {
      process.send({ eventName: 'start', total: extractor.total })
    })
    .on('planche', ({ planche, status, features }) => {
      features.forEach(f => writer.writeFeature(f))
      process.send({ eventName: 'planche', planche, status })
    })
    .on('end', () => {
      writer.finish()
        .then(() => {
          process.send({ eventName: 'end' })
          ready()
        })
        .catch(boom)
    })
    .on('error', boom)
})

ready()