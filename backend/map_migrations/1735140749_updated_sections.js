/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1809324929")

  // update field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "select976907234",
    "maxSelect": 1,
    "name": "layout",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "auto",
      "vertical",
      "horizontal"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1809324929")

  // update field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "select976907234",
    "maxSelect": 1,
    "name": "layout",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "automatic",
      "vertical",
      "horizontal"
    ]
  }))

  return app.save(collection)
})
