const mysql = require("mysql");

class CRUD {
  constructor(config) {
    this.connection = mysql.createConnection(config);
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.connection.connect((err) => {
        if (err) {
          reject(err);
        } else {
          resolve("Connected to MySQL");
        }
      });
    });
  }

  disconnect() {
    return new Promise((resolve, reject) => {
      this.connection.end((err) => {
        if (err) {
          reject(err);
        } else {
          resolve("Disconnected from MySQL");
        }
      });
    });
  }

  create(table, data) {
    return new Promise((resolve, reject) => {
      this.connection.query(
        `INSERT INTO ${table} SET ?`,
        data,
        (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        }
      );
    });
  }

  read(table) {
    return new Promise((resolve, reject) => {
      this.connection.query(`SELECT * FROM ${table}`, (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });
  }

  update(table, id, data) {
    return new Promise((resolve, reject) => {
      this.connection.query(
        `UPDATE ${table} SET ? WHERE id = ?`,
        [data, id],
        (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        }
      );
    });
  }

  delete(table, id) {
    return new Promise((resolve, reject) => {
      this.connection.query(
        `DELETE FROM ${table} WHERE id = ?`,
        id,
        (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        }
      );
    });
  }
}

module.exports = CRUD;
