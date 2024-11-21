import { MongoClient } from "mongodb";
import * as Constants from "../utils/constants.mjs";

/**
 * This version of ConnectionManager gets a new connection every time.
 */
class ConnectionManager {
    static #conn = null;

    /**
     * DO NOT CALL THE CONSTRUCTOR - USE STATIC METHODS
     */
    constructor() {}

    /**
     * Returns a new connection.
     *
     * @throws {Error} if database error occurs
     * @returns a Mongo database connection
     */
    static async getConnection() {
        this.#conn = await MongoClient.connect(Constants.DB_URI);
        return this.#conn;
    }

    /**
     * Closes this connection.
     *
     * @throws {Error} if database error occurs
     */
    static async closeConnection() {
        await this.#conn.close();
    }
} // end class

export { ConnectionManager };
