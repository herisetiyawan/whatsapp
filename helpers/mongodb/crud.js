// crud.js
const { connect } = require("./db");

class CrudOperations {
    constructor() {
        this.connect = connect;
        this.collection = "messages";
    }

    async createDocument(data) {
        const db = await this.connect();
        const collection = db.collection(this.collection);
        const currentDate = new Date();
        const document = {
            ...data,
            createdDate: currentDate,
            updateDate: currentDate,
        };
        const result = await collection.insertOne(document);
        console.log(`Document inserted with _id: ${result.insertedId}`);
    }

    async readDocuments() {
        const db = await this.connect();
        const collection = db.collection(this.collection);
        const documents = await collection.find().toArray();
        console.log("Documents:", documents);
    }

    async updateDocument(query, update) {
        const db = await this.connect();
        const collection = db.collection(this.collection);
        const result = await collection.updateOne(query, { $set: update });
        console.log(
            `Matched ${result.matchedCount} document(s) and modified ${result.modifiedCount} document(s)`
        );
    }

    async deleteDocument(query) {
        const db = await this.connect();
        const collection = db.collection(this.collection);
        const result = await collection.deleteOne(query);
        console.log(`Deleted ${result.deletedCount} document(s)`);
    }
}

module.exports = new CrudOperations();
