require("dotenv").config();
const { MongoClient } = require("mongodb");

const url = process.env.DB_CONNECTION;

async function connect() {
    try {
        const client = new MongoClient(url);
        await client.connect();
        console.log("Connection to MongoDB Successfully");
        return client.db(process.env.DB_NAME);
    } catch (err) {
        console.error("Error connecting to MongoDB:", err);
        throw err;
    }
}

module.exports = { connect };
