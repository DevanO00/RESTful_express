import express from "express";
import path from "path";
import * as acc from "./db/menuItemAccessor.mjs";
import * as Constants from "./utils/constants.mjs";
import { MenuItem } from "./entity/MenuItem.mjs";

const app = express();

app.use(express.static(Constants.PUBLIC_FOLDER));

app.use(express.json());

// Get all items
app.get("/api/menuitems", async function (request, response) {
  try {
    let data = await acc.getAllItems();
    response.status(200).json({ err: null, data: data });
  } catch (err) {
    response
      .status(500)
      .json({ err: "could not read data: " + err, data: null });
  }
});

// Delete an item
app.delete("/api/menuitems/:key(\\d{3})", async function (request, response) {
  let key = Number(request.params.key);
  let item = new MenuItem(key, "ENT", "", 0, false);

  try {
    let ok = await acc.deleteItem(item);
    if (ok) {
      response.status(200).json({ err: null, data: true });
    } else {
      response
        .status(404)
        .json({ err: `item ${item.id} does not exist`, data: null });
    }
  } catch (err) {
    response.status(500).json({ err: "delete aborted: " + err, data: null });
  }
});

// Update an item
app.put("/api/menuitems/:id(\\d{3})", async function (request, response) {
  try {
    try {
      let itemData = request.body;
      let item = new MenuItem(
        itemData.id,
        itemData.category,
        itemData.description,
        itemData.price,
        itemData.vegetarian
      );
      let ok = await acc.updateItem(item);
      if (ok) {
        response.status(200).json({ err: null, data: true });
      } else {
        response
          .status(404)
          .json({ err: `item ${item.id} does not exist`, data: null });
      }
    } catch (err) {
      response
        .status(400)
        .json({ err: "MenuItem constructor error", data: null });
    }
  } catch (err) {
    response.status(500).json({ err: "update aborted: " + err, data: null });
  }
});

// Add an item

app.post("/api/menuitems/:id(\\d{3})", async function (request, response) {
  try {
    let itemData = request.body;
    try {
      let item = new MenuItem(
        itemData.id,
        itemData.category,
        itemData.description,
        itemData.price,
        itemData.vegetarian
      );

      let ok = await acc.addItem(item);
      if (ok) {
        response.status(201).json({ err: null, data: true });
      } else {
        response
          .status(409)
          .json({ err: `item ${item.id} already exists`, data: null });
      }
    } catch (err) {
      response
        .status(400)
        .json({ err: "MenuItem constructor error", data: null });
    }
  } catch (err) {
    response.status(500).json({ err: "add aborted: " + err, data: null });
  }
});

// Invalid URLs
app.get("/api/menuitems/:id(\\d{3})", function (request, response) {
  response.status(405).json({ err: "Single GETs not supported", data: null });
});

app.delete("/api/menuitems", function (request, response) {
  response.status(405).json({ err: "Bulk deletes not supported", data: null });
});

app.put("/api/menuitems", function (request, response) {
  response.status(405).json({ err: "Bulk updates not supported", data: null });
});

app.post("/api/menuitems", function (request, response) {
  response.status(405).json({ err: "Bulk inserts not supported", data: null });
});

// 404
app.use(function (request, response, next) {
  response
    .status(404)
    .sendFile(
      path.join(import.meta.dirname, Constants.PUBLIC_FOLDER, "404.html")
    );
});

app.listen(Constants.PORT_NUM, () =>
  console.log(`MenuItem App listening on port ${Constants.PORT_NUM}!`)
);
