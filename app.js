require("dotenv").config();
const qrcode = require("qrcode-terminal");
const express = require("express");
const timestamp = require("time-stamp");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs");
const request = require("request");
const vuri = require("valid-url");
const { phoneNumberFormatter } = require("./helpers/formatter");
const config = require("./config.json");
// const port = 2100;
const port = process.env.PORT;
const fLog = "./app.logs";

const mediadownloader = (url, path, callback) => {
  request.head(url, (err, res, body) => {
    request(url).pipe(fs.createWriteStream(path)).on("close", callback);
  });
};

const {
  Client,
  MessageMedia,
  Location,
  List,
  Buttons,
  LocalAuth,
} = require("./index");

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    //headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      //     "--disable-dev-shm-usage",
      //     "--disable-accelerated-2d-canvas",
      //     "--no-first-run",
      //     "--no-zygote",
      //     "--single-process", // <- this one doesn't works in Windows
      //     "--disable-gpu",
    ],
    executablePath: "/usr/bin/chromium",
  },
});

// global.client = client;
// global.authed = true;

client.initialize();

const app = express();

app.use(bodyParser.json({ limit: "50mb" }));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// client.on("loading_screen", (percent, message) => {
//     console.log("LOADING SCREEN", percent, message);
// });

// client.on("qr", (qr) => {
// NOTE: This event will not be fired if a session is specified.
//     console.log("QR RECEIVED", qr);
// });

client.on("qr", (qr) => {
  fs.writeFileSync("./last.qr", qr);
  qrcode.generate(qr, { small: true });
});

client.on("authenticated", () => {
  console.log("AUTHENTICATED");
  try {
    fs.unlinkSync("./last.qr");
  } catch (err) {}
});

client.on("auth_failure", (msg) => {
  // Fired if session restore was unsuccessful
  console.error("AUTHENTICATION FAILURE", msg);
});

client.on("ready", () => {
  console.log("READY");
});

client.on("message", async (msg) => {
  console.log("MESSAGE RECEIVED", msg);
  const jsonString = JSON.stringify(msg);
  logingRequest(jsonString);
  const logDb = process.env.DB_STATUS;
  console.log("Loging status " + logDb);
  if (logDb == "true") {
    // sini
    let chat = await msg.getChat();
    const postData = {
      type_msg: "INBOX",
      replyto: chat.id._serialized,
      body: msg.body,
      key: process.env.APIKEY,
      message: jsonString,
    };

    const url = process.env.URL_NOTIFY;
    axios
      .post(url, postData)
      .then((response) => {
        console.log("Response:", response.data);
      })
      .catch((error) => {
        console.error("Sending Notify Error: ", error);
      });
  }

  if (config.webhook.enabled) {
    if (msg.hasMedia) {
      if (!fs.existsSync(config.webhook.path)) {
        fs.mkdirSync(config.webhook.path);
        fs.mkdirSync(config.webhook.path + "/media");
      }

      const attachmentData = await msg.downloadMedia();
      msg.attachmentData = attachmentData;
      console.log("MEDIA SAVED", msg.attachmentData);
      axios.post(config.webhook.path + "/media/ini.jpg", { msg });
    }
    // axios.post(config.webhook.path, { msg });
  }

  // if (msg.body === "!ping reply") {
  //     // Send a new message as a reply to the current one
  //     msg.reply("pong");
  // } else if (msg.body === "!ping") {
  //     // Send a new message to the same chat
  //     client.sendMessage(msg.from, "pong");
  // } else if (msg.body.startsWith("!sendto ")) {
  //     // Direct send a new message to specific id
  //     let number = msg.body.split(" ")[1];
  //     let messageIndex = msg.body.indexOf(number) + number.length;
  //     let message = msg.body.slice(messageIndex, msg.body.length);
  //     number = number.includes("@c.us") ? number : `${number}@c.us`;
  //     let chat = await msg.getChat();
  //     chat.sendSeen();
  //     client.sendMessage(number, message);
  // } else if (msg.body.startsWith("!subject ")) {
  //     // Change the group subject
  //     let chat = await msg.getChat();
  //     if (chat.isGroup) {
  //         let newSubject = msg.body.slice(9);
  //         chat.setSubject(newSubject);
  //     } else {
  //         msg.reply("This command can only be used in a group!");
  //     }
  // } else if (msg.body.startsWith("!echo ")) {
  //     // Replies with the same message
  //     msg.reply(msg.body.slice(6));
  // } else if (msg.body.startsWith("!desc ")) {
  //     // Change the group description
  //     let chat = await msg.getChat();
  //     if (chat.isGroup) {
  //         let newDescription = msg.body.slice(6);
  //         chat.setDescription(newDescription);
  //     } else {
  //         msg.reply("This command can only be used in a group!");
  //     }
  // } else if (msg.body === "!leave") {
  //     // Leave the group
  //     let chat = await msg.getChat();
  //     if (chat.isGroup) {
  //         chat.leave();
  //     } else {
  //         msg.reply("This command can only be used in a group!");
  //     }
  // } else if (msg.body.startsWith("!join ")) {
  //     const inviteCode = msg.body.split(" ")[1];
  //     try {
  //         await client.acceptInvite(inviteCode);
  //         msg.reply("Joined the group!");
  //     } catch (e) {
  //         msg.reply("That invite code seems to be invalid.");
  //     }
  // } else if (msg.body === "!groupinfo") {
  //     let chat = await msg.getChat();
  //     if (chat.isGroup) {
  //         msg.reply(`
  //             *Group Details*
  //             Name: ${chat.name}
  //             Chat Replay : ${chat.id._serialized}
  //             Description: ${chat.description}
  //             Created At: ${chat.createdAt.toString()}
  //             Created By: ${chat.owner.user}
  //             Participant count: ${chat.participants.length}
  //         `);
  //     } else {
  //         msg.reply("This command can only be used in a group!");
  //     }
  // } else if (msg.body === "!chats") {
  //     const chats = await client.getChats();
  //     client.sendMessage(msg.from, `The bot has ${chats.length} chats open.`);
  // } else if (msg.body === "!info") {
  //     let info = client.info;
  //     client.sendMessage(
  //         msg.from,
  //         `
  //         *Connection info*
  //         User name: ${info.pushname}
  //         My number: ${info.wid.user}
  //         Platform: ${info.platform}
  //     `
  //     );
  // } else if (msg.body === "!mediainfo" && msg.hasMedia) {
  //     const attachmentData = await msg.downloadMedia();
  //     msg.reply(`
  //         *Media info*
  //         MimeType: ${attachmentData.mimetype}
  //         Filename: ${attachmentData.filename}
  //         Data (length): ${attachmentData.data.length}
  //     `);
  // } else if (msg.body === "!quoteinfo" && msg.hasQuotedMsg) {
  //     const quotedMsg = await msg.getQuotedMessage();

  //     quotedMsg.reply(`
  //         ID: ${quotedMsg.id._serialized}
  //         Type: ${quotedMsg.type}
  //         Author: ${quotedMsg.author || quotedMsg.from}
  //         Timestamp: ${quotedMsg.timestamp}
  //         Has Media? ${quotedMsg.hasMedia}
  //     `);
  // } else if (msg.body === "!resendmedia" && msg.hasQuotedMsg) {
  //     const quotedMsg = await msg.getQuotedMessage();
  //     if (quotedMsg.hasMedia) {
  //         const attachmentData = await quotedMsg.downloadMedia();
  //         client.sendMessage(msg.from, attachmentData, {
  //             caption: "Here's your requested media.",
  //         });
  //     }
  // } else if (msg.body === "!location") {
  //     msg.reply(
  //         new Location(37.422, -122.084, "Googleplex\nGoogle Headquarters")
  //     );
  // } else if (msg.location) {
  //     msg.reply(msg.location);
  // } else if (msg.body.startsWith("!status ")) {
  //     const newStatus = msg.body.split(" ")[1];
  //     await client.setStatus(newStatus);
  //     msg.reply(`Status was updated to *${newStatus}*`);
  // } else if (msg.body === "!mention") {
  //     const contact = await msg.getContact();
  //     const chat = await msg.getChat();
  //     chat.sendMessage(`Hi @${contact.number}!`, {
  //         mentions: [contact],
  //     });
  // } else if (msg.body === "!delete") {
  //     if (msg.hasQuotedMsg) {
  //         const quotedMsg = await msg.getQuotedMessage();
  //         if (quotedMsg.fromMe) {
  //             quotedMsg.delete(true);
  //         } else {
  //             msg.reply("I can only delete my own messages");
  //         }
  //     }
  // } else if (msg.body === "!pin") {
  //     const chat = await msg.getChat();
  //     await chat.pin();
  // } else if (msg.body === "!archive") {
  //     const chat = await msg.getChat();
  //     await chat.archive();
  // } else if (msg.body === "!mute") {
  //     const chat = await msg.getChat();
  //     // mute the chat for 20 seconds
  //     const unmuteDate = new Date();
  //     unmuteDate.setSeconds(unmuteDate.getSeconds() + 20);
  //     await chat.mute(unmuteDate);
  // } else if (msg.body === "!typing") {
  //     const chat = await msg.getChat();
  //     // simulates typing in the chat
  //     chat.sendStateTyping();
  // } else if (msg.body === "!recording") {
  //     const chat = await msg.getChat();
  //     // simulates recording audio in the chat
  //     chat.sendStateRecording();
  // } else if (msg.body === "!clearstate") {
  //     const chat = await msg.getChat();
  //     // stops typing or recording in the chat
  //     chat.clearState();
  // } else if (msg.body === "!jumpto") {
  //     if (msg.hasQuotedMsg) {
  //         const quotedMsg = await msg.getQuotedMessage();
  //         client.interface.openChatWindowAt(quotedMsg.id._serialized);
  //     }
  // } else if (msg.body === "!buttons") {
  //     let button = new Buttons(
  //         "Button body",
  //         [{ body: "bt1" }, { body: "bt2" }, { body: "bt3" }],
  //         "title",
  //         "footer"
  //     );
  //     client.sendMessage(msg.from, button);
  // } else if (msg.body === "!list") {
  //     let sections = [
  //         {
  //             title: "sectionTitle",
  //             rows: [
  //                 { title: "ListItem1", description: "desc" },
  //                 { title: "ListItem2" },
  //             ],
  //         },
  //     ];
  //     let list = new List(
  //         "List body",
  //         "btnText",
  //         sections,
  //         "Title",
  //         "footer"
  //     );
  //     client.sendMessage(msg.from, list);
  // } else if (msg.body === "!reaction") {
  //     msg.react("👍");
  // }
});

client.on("message_create", (msg) => {
  // Fired on all message creations, including your own
  if (msg.fromMe) {
    // do stuff here
  }
});

client.on("message_revoke_everyone", async (after, before) => {
  // Fired whenever a message is deleted by anyone (including you)
  console.log(after); // message after it was deleted.
  if (before) {
    console.log(before); // message before it was deleted.
  }
});

client.on("message_revoke_me", async (msg) => {
  // Fired whenever a message is only deleted in your own view.
  console.log(msg.body); // message before it was deleted.
});

client.on("message_ack", (msg, ack) => {
  /*
        == ACK VALUES ==
        ACK_ERROR: -1
        ACK_PENDING: 0
        ACK_SERVER: 1
        ACK_DEVICE: 2
        ACK_READ: 3
        ACK_PLAYED: 4
    */

  if (ack == 3) {
    // The message was read
  }
});

client.on("group_join", (notification) => {
  // User has joined or been added to the group.
  console.log("join", notification);
  //notification.reply("User joined.");
});

client.on("group_leave", (notification) => {
  // User has left or been kicked from the group.
  console.log("leave", notification);
  //notification.reply("User left.");
});

client.on("group_update", (notification) => {
  // Group picture, subject or description has been updated.
  console.log("update", notification);
});

client.on("change_state", (state) => {
  console.log("CHANGE STATE", state);
});

client.on("disconnected", (reason) => {
  console.log("Client was logged out", reason);
});

// app.get("/chats", (req, res) => {
//     res.send("Chat");
//     let number = "6287888808822"; //req.params.phone;
//     let message = "Hallo"; //req.body.message;
//     number = number.includes("@c.us") ? number : `${number}@c.us`;
//     console.log(number);
//     client.sendMessage(number, message);
// });

// app.get("/groups", (req, res) => {
//     res.send("Group");
//     let number = "6287888808822"; //req.params.phone;
//     let message = "Hallo"; //req.body.message;
//     number = number.includes("@c.us") ? number : `${number}@c.us`;
//     console.log(number);
//     client.sendMessage(number, message);
// });

// app.get("/medias", (req, res) => {
//     res.send("media");
//     let number = "6287888808822"; //req.params.phone;
//     let message = "Hallo"; //req.body.message;
//     number = number.includes("@c.us") ? number : `${number}@c.us`;
//     console.log(number);
//     client.sendMessage(number, message);
// });

// start
// const chatRoute = require("./components/chatting");
// const groupRoute = require("./components/group");
// const authRoute = require("./components/auth");
// const contactRoute = require("./components/contact");

app.use(function (req, res, next) {
  console.log("LOG FILE CRETE" + fLog);
  console.log(req.method + " : " + req.path);
  var infoku = req.method + " : " + req.path;
  logingRequest(infoku);
  next();
});

// app.use("/chat", chatRoute);
// app.use("/group", groupRoute);
// app.use("/auth", authRoute);
// app.use("/contact", contactRoute);
// end

// Direct
// chat
const checkRegisteredNumber = async function (number) {
  // const isRegistered = await client.isRegisteredUser(number);
  // return isRegistered;
  return true;
};

function sendQr(res) {
  fs.readFile("last.qr", (err, last_qr) => {
    if (!err && last_qr) {
      var page = `
                    <html>
                    <meta http-equiv="refresh" content="20">
                        <body>
                            <script type="module">
                            </script>
                            <div id="qrcode"></div>
                            <script type="module">
                                import QrCreator from "https://cdn.jsdelivr.net/npm/qr-creator/dist/qr-creator.es6.min.js";
                                let container = document.getElementById("qrcode");
                                QrCreator.render({
                                    text: "${last_qr}",
                                    radius: 0.5, // 0.0 to 0.5
                                    ecLevel: "H", // L, M, Q, H
                                    fill: "#0d0d0e", // foreground color
                                    background: null, // color or null for transparent
                                    size: 256, // in pixels
                                }, container);
                            </script>
                        </body>
                    </html>
                `;
      res.write(page);
      res.end();
    }
  });
}

app.get("/app/healthcheck", async (req, res) => {
  res.status(200).json({
    status: true,
    response: "Apps Running",
  });
});

app.get("/app/status", async (req, res) => {
  client
    .getState()
    .then((data) => {
      console.log(data);
      res.send(data);
    })
    .catch((err) => {
      if (err) {
        res.send("DISCONNECTED");
      }
    });
});

app.get("/app/qr", async (req, res) => {
  client
    .getState()
    .then((data) => {
      if (data) {
        res.write("<html><body><h2>Already Authenticated</h2></body></html>");
        res.end();
      } else sendQr(res);
    })
    .catch(() => sendQr(res));
});

app.post("/chat/sendmessagebyid/:id", async (req, res) => {
  let phone = req.params.id;
  let message = req.body.message;

  console.log("Sending to chat id " + phone);

  client.sendMessage(phone, message).then((response) => {
    if (response.id.fromMe) {
      // res.send({
      //   status: "success",
      //   message: `Message successfully sent to ${phone}`,
      // });
      res.status(200).json({
        status: true,
        response: response,
      });
    }
  });
});

app.post("/chat/sendmessage/:phone", async (req, res) => {
  // let phone = req.params.phone;
  let message = req.body.message;

  let phone = phoneNumberFormatter(req.params.phone);
  console.log("Sending to " + phone);

  const isRegisteredNumber = await checkRegisteredNumber(phone);

  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: "The phone is not registered",
    });
  }

  if (phone == undefined || message == undefined) {
    res.send({
      status: "error",
      message: "please enter valid phone and message",
    });
  } else {
    // client.sendMessage(phone + "@c.us", message).then((response) => {
    client.sendMessage(phone, message).then((response) => {
      if (response.id.fromMe) {
        // res.send({
        //   status: "success",
        //   message: `Message successfully sent to ${phone}`,
        // });
        res.status(200).json({
          status: true,
          response: response,
        });
      }
    });
  }
});

app.post("/chat/sendimage/:phone", async (req, res) => {
  var base64regex =
    /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;

  //   let phone = req.params.phone;
  let image = req.body.image;
  let caption = req.body.caption;

  let phone = phoneNumberFormatter(req.params.phone);
  console.log("Sending to " + phone);

  const isRegisteredNumber = await checkRegisteredNumber(phone);

  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: "The phone is not registered",
    });
  }

  if (phone == undefined || image == undefined) {
    res.send({
      status: "error",
      message: "please enter valid phone and base64/url of image",
    });
  } else {
    if (base64regex.test(image)) {
      let media = new MessageMedia("image/png", image);
      client
        // .sendMessage(`${phone}@c.us`, media, { caption: caption || "" })
        .sendMessage(`${phone}`, media, { caption: caption || "" })
        .then((response) => {
          if (response.id.fromMe) {
            res.send({
              status: "success",
              message: `MediaMessage successfully sent to ${phone}`,
            });
          }
        });
    } else if (vuri.isWebUri(image)) {
      if (!fs.existsSync("./temp")) {
        fs.mkdirSync("./temp");
      }

      var path = "./temp/" + image.split("/").slice(-1)[0];
      mediadownloader(image, path, () => {
        let media = MessageMedia.fromFilePath(path);

        client
          //   .sendMessage(`${phone}@c.us`, media, {
          .sendMessage(`${phone}`, media, {
            caption: caption || "",
          })
          .then((response) => {
            if (response.id.fromMe) {
              res.send({
                status: "success",
                message: `MediaMessage successfully sent to ${phone}`,
              });
              fs.unlinkSync(path);
            }
          });
      });
    } else {
      res.send({
        status: "error",
        message: "Invalid URL/Base64 Encoded Media",
      });
    }
  }
});

app.post("/chat/sendpdf/:phone", async (req, res) => {
  var base64regex =
    /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;

  //   let phone = req.params.phone;
  let pdf = req.body.pdf;
  let phone = phoneNumberFormatter(req.params.phone);
  console.log("Sending pdf to " + phone + " " + pdf);

  const isRegisteredNumber = await checkRegisteredNumber(phone);

  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: "The phone is not registered",
    });
  }

  if (phone == undefined || pdf == undefined) {
    res.send({
      status: "error",
      message: "please enter valid phone and base64/url of pdf",
    });
  } else {
    if (base64regex.test(pdf)) {
      let media = new MessageMedia("application/pdf", pdf);
      //   client.sendMessage(`${phone}@c.us`, media).then((response) => {
      client.sendMessage(`${phone}`, media).then((response) => {
        if (response.id.fromMe) {
          res.send({
            status: "success",
            message: `MediaMessage successfully sent to ${phone}`,
          });
        }
      });
    } else if (vuri.isWebUri(pdf)) {
      if (!fs.existsSync("./temp")) {
        fs.mkdirSync("./temp");
      }

      var path = "./temp/" + pdf.split("/").slice(-1)[0];
      mediadownloader(pdf, path, () => {
        let media = MessageMedia.fromFilePath(path);
        // client.sendMessage(`${phone}@c.us`, media).then((response) => {
        client.sendMessage(`${phone}`, media).then((response) => {
          if (response.id.fromMe) {
            res.send({
              status: "success",
              message: `MediaMessage successfully sent to ${phone}`,
            });
            fs.unlinkSync(path);
          }
        });
      });
    } else {
      res.send({
        status: "error",
        message: "Invalid URL/Base64 Encoded Media",
      });
    }
  }
});

app.post("/chat/sendlocation/:phone", async (req, res) => {
  //   let phone = req.params.phone;
  let latitude = req.body.latitude;
  let longitude = req.body.longitude;
  let desc = req.body.description;
  let phone = phoneNumberFormatter(req.params.phone);
  console.log("Sending to " + phone);

  const isRegisteredNumber = await checkRegisteredNumber(phone);

  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: "The phone is not registered",
    });
  }

  if (phone == undefined || latitude == undefined || longitude == undefined) {
    res.send({
      status: "error",
      message: "please enter valid phone, latitude and longitude",
    });
  } else {
    let loc = new Location(latitude, longitude, desc || "");
    // client.sendMessage(`${phone}@c.us`, loc).then((response) => {
    client.sendMessage(`${phone}`, loc).then((response) => {
      if (response.id.fromMe) {
        res.send({
          status: "success",
          message: `MediaMessage successfully sent to ${phone}`,
        });
      }
    });
  }
});

app.get("/chat/getchatbyid/:phone", async (req, res) => {
  //   let phone = req.params.phone;
  let phone = phoneNumberFormatter(req.params.phone);
  console.log("Sending to " + phone);

  const isRegisteredNumber = await checkRegisteredNumber(phone);

  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: "The phone is not registered",
    });
  }
  if (phone == undefined) {
    res.send({
      status: "error",
      message: "please enter valid phone number",
    });
  } else {
    client
      .getChatById(`${phone}@c.us`)
      .then((chat) => {
        res.send({ status: "success", message: chat });
      })
      .catch(() => {
        console.error("getchaterror");
        res.send({ status: "error", message: "getchaterror" });
      });
  }
});

app.get("/chat/getchats", (req, res) => {
  client
    .getChats()
    .then((chats) => {
      res.send({ status: "success", message: chats });
    })
    .catch(() => {
      res.send({ status: "error", message: "getchatserror" });
    });
});

const findGroupByName = async function (name) {
  const group = await client.getChats().then((chats) => {
    return chats.find(
      (chat) => chat.isGroup && chat.name.toLowerCase() == name.toLowerCase()
    );
  });
  return group;
};

const logingRequest = async function (infoku) {
  fs.appendFileSync(
    fLog,
    timestamp("YYYY-MM-DD HH:mm:ss ") + ": " + infoku + "\r\n"
  );
};

// Group
app.post("/group/sendmessage/:chatname", async (req, res) => {
  let chatname = req.params.chatname;
  let message = req.body.message;

  console.log("sending group message " + chatname + " message new " + message);

  const group = await findGroupByName(chatname);
  if (!group) {
    return res.status(422).json({
      status: false,
      message: "No group found with name: " + chatname,
    });
  }

  if (chatname == undefined || message == undefined) {
    res.send({
      status: "error",
      message: "please enter valid chatname and message",
    });
  } else {
    client.getChats().then((data) => {
      data.forEach((chat) => {
        if (chat.id.server === "g.us" && chat.name === chatname) {
          client.sendMessage(chat.id._serialized, message).then((response) => {
            if (response.id.fromMe) {
              res.send({
                status: "success",
                message: `Message successfully send to ${chatname}`,
              });
            }
          });
        }
      });
    });
  }
});

app.post("/group/sendimage/:chatname", async (req, res) => {
  var base64regex =
    /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;

  let chatname = req.params.chatname;
  let image = req.body.image;
  let caption = req.body.caption;

  const group = await findGroupByName(chatname);
  if (!group) {
    return res.status(422).json({
      status: false,
      message: "No group found with name: " + chatname,
    });
  }

  if (chatname == undefined || image == undefined) {
    res.send({
      status: "error",
      message: "please enter valid chatname and base64/url of image",
    });
  } else {
    if (base64regex.test(image)) {
      client.getChats().then((data) => {
        data.forEach((chat) => {
          if (chat.id.server === "g.us" && chat.name === chatname) {
            if (!fs.existsSync("./temp")) {
              fs.mkdirSync("./temp");
            }

            let media = new MessageMedia("image/png", image);
            client
              .sendMessage(chat.id._serialized, media, {
                caption: caption || "",
              })
              .then((response) => {
                if (response.id.fromMe) {
                  res.send({
                    status: "success",
                    message: `Message successfully send to ${chatname}`,
                  });
                  fs.unlinkSync(path);
                }
              });
          }
        });
      });
    } else if (vuri.isWebUri(image)) {
      var path = "./temp/" + image.split("/").slice(-1)[0];
      client.getChats().then((data) => {
        data.forEach((chat) => {
          if (chat.id.server === "g.us" && chat.name === chatname) {
            mediadownloader(image, path, () => {
              let media = MessageMedia.fromFilePath(path);
              client
                .sendMessage(chat.id._serialized, media, {
                  caption: caption || "",
                })
                .then((response) => {
                  if (response.id.fromMe) {
                    res.send({
                      status: "success",
                      message: `Message successfully send to ${chatname}`,
                    });
                    fs.unlinkSync(path);
                  }
                });
            });
          }
        });
      });
    } else {
      res.send({
        status: "error",
        message: "Invalid URL/Base64 Encoded Media",
      });
    }
  }
});

app.post("/group/sendpdf/:chatname", async (req, res) => {
  var base64regex =
    /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;

  let chatname = req.params.chatname;
  let pdf = req.body.pdf;

  const group = await findGroupByName(chatname);
  if (!group) {
    return res.status(422).json({
      status: false,
      message: "No group found with name: " + chatname,
    });
  }

  if (chatname == undefined || pdf == undefined) {
    res.send({
      status: "error",
      message: "please enter valid chatname and base64/url of pdf",
    });
  } else {
    if (base64regex.test(pdf)) {
      client.getChats().then((data) => {
        data.some((chat) => {
          if (chat.id.server === "g.us" && chat.name === chatname) {
            if (!fs.existsSync("./temp")) {
              fs.mkdirSync("./temp");
            }
            let media = new MessageMedia("application/pdf", pdf);
            client.sendMessage(chat.id._serialized, media).then((response) => {
              if (response.id.fromMe) {
                res.send({
                  status: "success",
                  message: `Message successfully send to ${chatname}`,
                });
                fs.unlinkSync(path);
              }
            });
            return true;
          }
        });
      });
    } else if (vuri.isWebUri(pdf)) {
      var path = "./temp/" + pdf.split("/").slice(-1)[0];
      client.getChats().then((data) => {
        data.some((chat) => {
          if (chat.id.server === "g.us" && chat.name === chatname) {
            mediadownloader(pdf, path, () => {
              let media = MessageMedia.fromFilePath(path);
              client
                .sendMessage(chat.id._serialized, media)
                .then((response) => {
                  if (response.id.fromMe) {
                    res.send({
                      status: "success",
                      message: `Message successfully send to ${chatname}`,
                    });
                    fs.unlinkSync(path);
                  }
                });
            });
            return true;
          }
        });
      });
    } else {
      res.send({
        status: "error",
        message: "Invalid URL/Base64 Encoded Media",
      });
    }
  }
});

app.post("/group/sendlocation/:chatname", async (req, res) => {
  let chatname = req.params.chatname;
  let latitude = req.body.latitude;
  let longitude = req.body.longitude;
  let desc = req.body.description;

  const group = await findGroupByName(chatname);
  if (!group) {
    return res.status(422).json({
      status: false,
      message: "No group found with name: " + chatname,
    });
  }

  if (
    chatname == undefined ||
    latitude == undefined ||
    longitude == undefined
  ) {
    res.send({
      status: "error",
      message: "please enter valid phone, latitude and longitude",
    });
  } else {
    client.getChats().then((data) => {
      data.some((chat) => {
        if (chat.id.server === "g.us" && chat.name === chatname) {
          let loc = new Location(latitude, longitude, desc || "");
          client.sendMessage(chat.id._serialized, loc).then((response) => {
            if (response.id.fromMe) {
              res.send({
                status: "success",
                message: `Message successfully send to ${chatname}`,
              });
            }
          });
          return true;
        }
      });
    });
  }
});

// contact
app.get("/contact/getcontacts", (req, res) => {
  client.getContacts().then((contacts) => {
    res.send(JSON.stringify(contacts));
  });
});

app.get("/contact/getcontact/:phone", async (req, res) => {
  //   let phone = req.params.phone;
  let phone = phoneNumberFormatter(req.params.phone);
  console.log("Sending to " + phone);

  const isRegisteredNumber = await checkRegisteredNumber(phone);

  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: "The phone is not registered",
    });
  }

  if (phone != undefined) {
    client
      .getContactById(`${phone}`)
      .then((contact) => {
        res.send(JSON.stringify(contact));
      })
      .catch((err) => {
        res.send({ status: "error", message: "Not found" });
      });
  }
});

app.get("/contact/getprofilepic/:phone", async (req, res) => {
  //   let phone = req.params.phone;
  let phone = phoneNumberFormatter(req.params.phone);
  console.log("Sending to " + phone);

  const isRegisteredNumber = await checkRegisteredNumber(phone);

  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: "The phone is not registered",
    });
  }

  if (phone != undefined) {
    client.getProfilePicUrl(`${phone}`).then((imgurl) => {
      if (imgurl) {
        res.send({ status: "success", message: imgurl });
      } else {
        res.send({ status: "error", message: "Not Found" });
      }
    });
  }
});

app.get("/contact/isregistereduser/:phone", async (req, res) => {
  //   let phone = req.params.phone;
  let phone = phoneNumberFormatter(req.params.phone);
  console.log("Sending to " + phone);

  const isRegisteredNumber = await checkRegisteredNumber(phone);
  console.log(isRegisteredNumber);
  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: "The phone is not registered",
    });
  }

  if (phone != undefined) {
    client.isRegisteredUser(`${phone}`).then((is) => {
      is
        ? res.send({
            status: "success",
            message: `${phone} is a whatsapp user`,
          })
        : res.send({
            status: "error",
            message: `${phone} is not a whatsapp user`,
          });
    });
  } else {
    res.send({ status: "error", message: "Invalid Phone number" });
  }
});

app.listen(port, () => {
  console.log("Server Running Live on Port : " + port);
});
