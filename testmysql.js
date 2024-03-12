require("dotenv").config();
const CRUD = require("./helpers/mysql/crud");

// MySQL connection configuration
const mysqlConn = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USERNAME,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DBNAME,
};

const crud = new CRUD(mysqlConn);

const jsonData = {
  name: "John",
  age: 30,
  email: "john@example.com",
};

const jsonString = JSON.stringify(jsonData);

(async () => {
  try {
    await crud.connect();

    // Example usage
    const datas = { channel: "SYSWA", type_msg: "INBOX", logs: jsonString };

    // Create a user
    const createUserResult = await crud.create(
      "whatsapp_messages_inbox",
      datas
    );
    console.log("User created:", createUserResult);

    // // Read all users
    // const allUsers = await crud.read("users");
    // console.log("All users:", allUsers);

    // // Update a user
    // const updateUserResult = await crud.update("users", 1, {
    //   email: "newemail@example.com",
    // });
    // console.log("User updated:", updateUserResult);

    // // Delete a user
    // const deleteUserResult = await crud.delete("users", 1);
    // console.log("User deleted:", deleteUserResult);

    await crud.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
})();
