/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1612934933")

  // update collection data
  unmarshal({
    "name": "maps"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1612934933")

  // update collection data
  unmarshal({
    "name": "map_headers"
  }, collection)

  return app.save(collection)
})
