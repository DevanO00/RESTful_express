import { assert } from "chai";
const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
import * as Constants from "../utils/constants.mjs";
import { rebuild } from "../db/databaseBuilder.mjs";
import { MenuItem } from "../entity/MenuItem.mjs";
import {
    itemExists,
    deleteItem,
    getItemByID,
    updateItem,
    addItem,
    getAllItems,
} from "../db/menuItemAccessor.mjs";
import { readFile } from "fs/promises";

const NUM_ITEMS = 39;
const TEST_ITEMS = {
    goodItem: new MenuItem(107, "ENT", "nothing", 99, false),
    badItem: new MenuItem(777, "ENT", "nothing", 99, false),
    itemToAdd: new MenuItem(888, "ENT", "poutine", 99, false),
    itemToDelete: new MenuItem(202, "ENT", "nothing", 99, false),
    itemToUpdate: new MenuItem(303, "ENT", "after update", 99, false),
};

describe("A4 - Web Service Testing", function () {
    before("Setup", async function () {
        await rebuild();
        console.log("  <<SETUP: Database restored to original state.>>\n");
    });
    after("Teardown", async function () {
        await rebuild();
        console.log("  <<TEARDOWN: Database restored to original state.>>\n");
    });

    describe("Supported Operations", function () {
        describe("Expected Successes", function () {
            it("GET /api/menuitems --> status 200, 39 items", async function () {
                const url = "http://localhost:8000/api/menuitems";
                const options = {
                    method: "GET",
                };

                const expectedStatus = 200;
                const expectedNumberOfItems = NUM_ITEMS;

                const response = await fetch(url, options);
                const body = await response.json();

                assert.equal(response.status, expectedStatus);
                assert.equal(body.data.length, expectedNumberOfItems);
            });

            it(`POST /api/menuitems/${TEST_ITEMS.itemToAdd.id} --> status 201, item added`, async function () {
                const url = `http://localhost:8000/api/menuitems/${TEST_ITEMS.itemToAdd.id}`;
                const options = {
                    method: "POST",
                    body: JSON.stringify(TEST_ITEMS.itemToAdd),
                    headers: { "Content-Type": "application/json" },
                };

                const expectedStatus = 201;

                const response = await fetch(url, options);

                assert.equal(response.status, expectedStatus);

                // make sure item was actually added to database
                assert.isTrue(await itemExists(TEST_ITEMS.itemToAdd));

                // now remove the item
                await deleteItem(TEST_ITEMS.itemToAdd);
            });

            it(`PUT /api/menuitems/${TEST_ITEMS.itemToUpdate.id} --> status 200, item updated`, async function () {
                const url = `http://localhost:8000/api/menuitems/${TEST_ITEMS.itemToUpdate.id}`;
                const options = {
                    method: "PUT",
                    body: JSON.stringify(TEST_ITEMS.itemToUpdate),
                    headers: { "Content-Type": "application/json" },
                };

                let originalItem = await getItemByID(
                    TEST_ITEMS.itemToUpdate.id
                );

                const expectedStatus = 200;

                const response = await fetch(url, options);

                assert.equal(response.status, expectedStatus);

                // make sure item was actually updated
                let newItem = await getItemByID(TEST_ITEMS.itemToUpdate.id);
                assert.deepEqual(newItem, TEST_ITEMS.itemToUpdate);

                // now restore to its original values
                await updateItem(originalItem);
            });

            it(`DELETE /api/menuitems/${TEST_ITEMS.itemToDelete.id} --> status 200, item deleted`, async function () {
                const url = `http://localhost:8000/api/menuitems/${TEST_ITEMS.itemToDelete.id}`;
                const options = {
                    method: "DELETE",
                };

                let originalItem = await getItemByID(
                    TEST_ITEMS.itemToDelete.id
                );

                const expectedStatus = 200;

                const response = await fetch(url, options);

                assert.equal(response.status, expectedStatus);

                // make sure item was actually deleted
                assert.isFalse(await itemExists(TEST_ITEMS.itemToDelete));

                // now restore to the original item
                await addItem(originalItem);
            });
        });

        describe("Expected Failures I - conflicts", function () {
            it(`POST /api/menuitems/${TEST_ITEMS.goodItem.id} --> status 409, error "item ${TEST_ITEMS.goodItem.id} already exists"`, async function () {
                const url = `http://localhost:8000/api/menuitems/${TEST_ITEMS.goodItem.id}`;
                const options = {
                    method: "POST",
                    body: JSON.stringify(TEST_ITEMS.goodItem),
                    headers: { "Content-Type": "application/json" },
                };

                const expectedStatus = 409;
                const expectedMessage = `item ${TEST_ITEMS.goodItem.id} already exists`;

                const response = await fetch(url, options);
                const body = await response.json();

                assert.equal(response.status, expectedStatus);
                assert.equal(body.err, expectedMessage);

                // make sure item was not added to database
                let items = await getAllItems();
                assert.equal(items.length, NUM_ITEMS);
            });

            it(`PUT /api/menuitems/${TEST_ITEMS.badItem.id} --> status 404, error "item ${TEST_ITEMS.badItem.id} does not exist"`, async function () {
                const url = `http://localhost:8000/api/menuitems/${TEST_ITEMS.badItem.id}`;
                const options = {
                    method: "PUT",
                    body: JSON.stringify(TEST_ITEMS.badItem),
                    headers: { "Content-Type": "application/json" },
                };

                const expectedStatus = 404;
                const expectedMessage = `item ${TEST_ITEMS.badItem.id} does not exist`;

                const response = await fetch(url, options);
                const body = await response.json();

                assert.equal(response.status, expectedStatus);
                assert.equal(body.err, expectedMessage);
            });

            it(`DELETE /api/menuitems/${TEST_ITEMS.badItem.id} --> status 404, error "item ${TEST_ITEMS.badItem.id} does not exist"`, async function () {
                const url = `http://localhost:8000/api/menuitems/${TEST_ITEMS.badItem.id}`;
                const options = {
                    method: "DELETE",
                };

                const expectedStatus = 404;
                const expectedMessage = `item ${TEST_ITEMS.badItem.id} does not exist`;

                const response = await fetch(url, options);
                const body = await response.json();

                assert.equal(response.status, expectedStatus);
                assert.equal(body.err, expectedMessage);

                // make sure item was not deleted from database
                let items = await getAllItems();
                assert.equal(items.length, NUM_ITEMS);
            });
        });

        describe("Expected Failures II - bad data sent", function () {
            describe("POST Requests", function () {
                it(`POST /api/menuitems/${TEST_ITEMS.itemToAdd.id} with missing fields --> status 400, constructor error`, async function () {
                    const url = `http://localhost:8000/api/menuitems/${TEST_ITEMS.itemToAdd.id}`;
                    const options = {
                        method: "POST",
                        body: JSON.stringify({}),
                        headers: { "Content-Type": "application/json" },
                    };

                    const expectedStatus = 400;
                    const expectedText = "MenuItem constructor error";
                    const response = await fetch(url, options);
                    const body = await response.json();

                    assert.equal(response.status, expectedStatus);
                    assert.isTrue(body.err.startsWith(expectedText));

                    // make sure item was not added to database
                    let items = await getAllItems();
                    assert.equal(items.length, NUM_ITEMS);
                });

                it(`POST /api/menuitems/${TEST_ITEMS.itemToAdd.id} with invalid ID --> status 400, constructor error`, async function () {
                    const url = `http://localhost:8000/api/menuitems/${TEST_ITEMS.itemToAdd.id}`;
                    const options = {
                        method: "POST",
                        body: JSON.stringify({
                            id: 99,
                            category: "ENT",
                            description: "something",
                            price: 99,
                            vegetarian: false,
                        }),
                        headers: { "Content-Type": "application/json" },
                    };

                    const expectedStatus = 400;
                    const expectedText = "MenuItem constructor error";
                    const response = await fetch(url, options);
                    const body = await response.json();

                    assert.equal(response.status, expectedStatus);
                    assert.isTrue(body.err.startsWith(expectedText));

                    // make sure item was not added to database
                    let items = await getAllItems();
                    assert.equal(items.length, NUM_ITEMS);
                });

                it(`POST /api/menuitems/${TEST_ITEMS.itemToAdd.id} with invalid category --> status 400, constructor error`, async function () {
                    const url = `http://localhost:8000/api/menuitems/${TEST_ITEMS.itemToAdd.id}`;
                    const options = {
                        method: "POST",
                        body: JSON.stringify({
                            id: 999,
                            category: "EN",
                            description: "something",
                            price: 99,
                            vegetarian: false,
                        }),
                        headers: { "Content-Type": "application/json" },
                    };

                    const expectedStatus = 400;
                    const expectedText = "MenuItem constructor error";
                    const response = await fetch(url, options);
                    const body = await response.json();

                    assert.equal(response.status, expectedStatus);
                    assert.isTrue(body.err.startsWith(expectedText));

                    // make sure item was not added to database
                    let items = await getAllItems();
                    assert.equal(items.length, NUM_ITEMS);
                });

                it(`POST /api/menuitems/${TEST_ITEMS.itemToAdd.id} with invalid price --> status 400, constructor error`, async function () {
                    const url = `http://localhost:8000/api/menuitems/${TEST_ITEMS.itemToAdd.id}`;
                    const options = {
                        method: "POST",
                        body: JSON.stringify({
                            id: 999,
                            category: "ENT",
                            description: "something",
                            price: -9,
                            vegetarian: false,
                        }),
                        headers: { "Content-Type": "application/json" },
                    };

                    const expectedStatus = 400;
                    const expectedText = "MenuItem constructor error";
                    const response = await fetch(url, options);
                    const body = await response.json();

                    assert.equal(response.status, expectedStatus);
                    assert.isTrue(body.err.startsWith(expectedText));

                    // make sure item was not added to database
                    let items = await getAllItems();
                    assert.equal(items.length, NUM_ITEMS);
                });
            });

            describe("PUT Requests", function () {
                it(`PUT /api/menuitems/${TEST_ITEMS.itemToUpdate.id} with missing fields --> status 400, constructor error`, async function () {
                    const url = `http://localhost:8000/api/menuitems/${TEST_ITEMS.itemToUpdate.id}`;
                    const options = {
                        method: "PUT",
                        body: JSON.stringify({}),
                        headers: { "Content-Type": "application/json" },
                    };

                    const originalItem = await getItemByID(
                        TEST_ITEMS.itemToUpdate.id
                    );

                    const expectedStatus = 400;
                    const expectedText = "MenuItem constructor error";
                    const response = await fetch(url, options);
                    const body = await response.json();

                    assert.equal(response.status, expectedStatus);
                    assert.isTrue(body.err.startsWith(expectedText));

                    // make sure item was not updated
                    const newItem = await getItemByID(
                        TEST_ITEMS.itemToUpdate.id
                    );
                    assert.deepEqual(newItem, originalItem);
                });

                it(`PUT /api/menuitems/${TEST_ITEMS.itemToUpdate.id} with invalid ID --> status 400, constructor error`, async function () {
                    const url = `http://localhost:8000/api/menuitems/${TEST_ITEMS.itemToUpdate.id}`;
                    const options = {
                        method: "PUT",
                        body: JSON.stringify({
                            id: 99,
                            category: "ENT",
                            description: "something",
                            price: 99,
                            vegetarian: false,
                        }),
                        headers: { "Content-Type": "application/json" },
                    };

                    const originalItem = await getItemByID(
                        TEST_ITEMS.itemToUpdate.id
                    );

                    const expectedStatus = 400;
                    const expectedText = "MenuItem constructor error";
                    const response = await fetch(url, options);
                    const body = await response.json();

                    assert.equal(response.status, expectedStatus);
                    assert.isTrue(body.err.startsWith(expectedText));

                    // make sure item was not updated
                    const newItem = await getItemByID(
                        TEST_ITEMS.itemToUpdate.id
                    );
                    assert.deepEqual(newItem, originalItem);
                });

                it(`PUT /api/menuitems/${TEST_ITEMS.itemToUpdate.id} with invalid category --> status 400, constructor error`, async function () {
                    const url = `http://localhost:8000/api/menuitems/${TEST_ITEMS.itemToUpdate.id}`;
                    const options = {
                        method: "PUT",
                        body: JSON.stringify({
                            id: 999,
                            category: "EN",
                            description: "something",
                            price: 99,
                            vegetarian: false,
                        }),
                        headers: { "Content-Type": "application/json" },
                    };

                    const originalItem = await getItemByID(
                        TEST_ITEMS.itemToUpdate.id
                    );

                    const expectedStatus = 400;
                    const expectedText = "MenuItem constructor error";
                    const response = await fetch(url, options);
                    const body = await response.json();

                    assert.equal(response.status, expectedStatus);
                    assert.isTrue(body.err.startsWith(expectedText));

                    // make sure item was not updated
                    const newItem = await getItemByID(
                        TEST_ITEMS.itemToUpdate.id
                    );
                    assert.deepEqual(newItem, originalItem);
                });

                it(`PUT /api/menuitems/${TEST_ITEMS.itemToUpdate.id} with invalid price --> status 400, constructor error`, async function () {
                    const url = `http://localhost:8000/api/menuitems/${TEST_ITEMS.itemToUpdate.id}`;
                    const options = {
                        method: "PUT",
                        body: JSON.stringify({
                            id: 999,
                            category: "ENT",
                            description: "something",
                            price: -9,
                            vegetarian: false,
                        }),
                        headers: { "Content-Type": "application/json" },
                    };

                    const originalItem = await getItemByID(
                        TEST_ITEMS.itemToUpdate.id
                    );

                    const expectedStatus = 400;
                    const expectedText = "MenuItem constructor error";
                    const response = await fetch(url, options);
                    const body = await response.json();

                    assert.equal(response.status, expectedStatus);
                    assert.isTrue(body.err.startsWith(expectedText));

                    // make sure item was not updated
                    const newItem = await getItemByID(
                        TEST_ITEMS.itemToUpdate.id
                    );
                    assert.deepEqual(newItem, originalItem);
                });
            });
        });
    });

    describe("Unsupported Operations", function () {
        it(`GET /api/menuitems/${TEST_ITEMS.goodItem.id} --> status 405, error "Single GETs not supported"`, async function () {
            const url = `http://localhost:8000/api/menuitems/${TEST_ITEMS.goodItem.id}`;
            const options = {
                method: "GET",
            };

            const expectedStatus = 405;
            const expectedMessage = "Single GETs not supported";

            const response = await fetch(url, options);
            const body = await response.json();

            assert.equal(response.status, expectedStatus);
            assert.equal(body.err, expectedMessage);
        });

        it(`POST /api/menuitems --> status 405, error "Bulk inserts not supported"`, async function () {
            const url = `http://localhost:8000/api/menuitems`;
            const options = {
                method: "POST",
                body: JSON.stringify(TEST_ITEMS.goodItem),
                headers: { "Content-Type": "application/json" },
            };

            const expectedStatus = 405;
            const expectedMessage = "Bulk inserts not supported";

            const response = await fetch(url, options);
            const body = await response.json();

            assert.equal(response.status, expectedStatus);
            assert.equal(body.err, expectedMessage);
        });

        it(`PUT /api/menuitems --> status 405, error "Bulk updates not supported"`, async function () {
            const url = `http://localhost:8000/api/menuitems`;
            const options = {
                method: "PUT",
                body: JSON.stringify(TEST_ITEMS.itemToUpdate),
                headers: { "Content-Type": "application/json" },
            };

            const expectedStatus = 405;
            const expectedMessage = "Bulk updates not supported";

            const response = await fetch(url, options);
            const body = await response.json();

            assert.equal(response.status, expectedStatus);
            assert.equal(body.err, expectedMessage);
        });

        it(`DELETE /api/menuitems --> status 405, error "Bulk deletes not supported"`, async function () {
            const url = `http://localhost:8000/api/menuitems`;
            const options = {
                method: "DELETE",
            };

            const expectedStatus = 405;
            const expectedMessage = "Bulk deletes not supported";

            const response = await fetch(url, options);
            const body = await response.json();

            assert.equal(response.status, expectedStatus);
            assert.equal(body.err, expectedMessage);
        });
    });

    describe("Invalid URLs", function () {
        let badUrls = [
            "/api/menuitem",
            "/api/menuitemss",
            "/api/menuitems/12",
            "/api/menuitems/1234",
        ];

        badUrls.forEach((url) => {
            it(`DELETE ${url} --> status 404, custom 404 page`, async function () {
                const options = {
                    method: "DELETE",
                };

                const expectedStatus = 404;
                const expectedContent = await readFile("./public/404.html");

                const response = await fetch(
                    `http://localhost:8000${url}`,
                    options
                );
                const body = await response.text();

                assert.equal(response.status, expectedStatus);
                assert.equal(body, expectedContent);
            });
        });
    });

    describe("Server Errors", function () {
        it(`GET http://localhost:800/api/menuitems (wrong port) --> code ECONNREFUSED`, async function () {
            const url = "http://localhost:800/api/menuitems";
            const options = {
                method: "GET",
            };

            let expectedErrorCode = "ECONNREFUSED";

            try {
                const response = await fetch(url, options);
            } catch (err) {
                assert.equal(err.code, expectedErrorCode);
            }
        });
    });
});
