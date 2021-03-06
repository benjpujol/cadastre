'use strict'

const {createWriteStream, createReadStream} = require('fs')
const {createGzip, createGunzip} = require('zlib')

const turf = require('@turf/turf')
const {stringify, parse} = require('JSONStream')
const {pipeline, through} = require('mississippi')

function truncate(options = {}) {
  return through.obj((feature, enc, cb) => {
    const mutate = options.mutate === true
    const precision = 'precision' in options ? options.precision : 6
    const coordinates = options.coordinates || 2

    cb(null, turf.truncate(feature, {precision, coordinates, mutate}))
  })
}

function rewind(options = {}) {
  return through.obj((feature, enc, cb) => {
    const reverse = options.reverse === true
    const mutate = options.mutate === true

    cb(null, turf.rewind(feature, {reverse, mutate}))
  })
}

const GEOJSON = {
  open: '{"type":"FeatureCollection","features":[\n',
  separator: ',\n',
  close: ']}'
}

function createGeoJSONWriteStream(path) {
  return pipeline.obj(
    stringify(GEOJSON.open, GEOJSON.separator, GEOJSON.close),
    createGzip(),
    createWriteStream(path)
  )
}

function createGeoJSONReadStream(path) {
  const file = createReadStream(path)
  const gunzip = createGunzip()
  const parser = parse('features.*')

  function onError(err) {
    file.destroy()
    gunzip.destroy()
    parser.emit('error', err)
    parser.destroy()
  }

  file.on('error', onError)
  gunzip.on('error', onError)

  file.pipe(gunzip).pipe(parser)

  return parser
}

function createPolygonWriteStream(path) {
  return pipeline.obj(
    truncate({precision: 7, mutate: false}),
    rewind({mutate: false}),
    createGeoJSONWriteStream(path)
  )
}

function createCompactGeoJSONWriteStream(path) {
  return pipeline.obj(
    truncate({precision: 7, mutate: false}),
    createGeoJSONWriteStream(path)
  )
}

module.exports = {
  createGeoJSONReadStream,
  createGeoJSONWriteStream,
  createPolygonWriteStream,
  createCompactGeoJSONWriteStream
}
