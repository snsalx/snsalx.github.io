/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1809324929")

  // add field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "json666537513",
    "maxSize": 0,
    "name": "points",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1809324929")

  // remove field
  collection.fields.removeById("json666537513")

  return app.save(collection)
})
