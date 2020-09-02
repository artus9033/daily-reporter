import fs from "fs";

import chalk from "chalk";
import EmailValidator from "email-validator";
import inquirer from "inquirer";
import moment, { Moment } from "moment";
import nodemailer from "nodemailer";

function getGreetingTime(m: Moment) {
  var g = null;

  if (!m || !m.isValid()) {
    return;
  }

  var split_afternoon = 12; // 24h time to split the afternoon
  var split_evening = 17; // 24h time to split the evening
  var currentHour = parseFloat(m.format("HH"));

  if (currentHour >= split_afternoon && currentHour <= split_evening) {
    g = "afternoon";
  } else if (currentHour >= split_evening) {
    g = "evening";
  } else {
    g = "morning";
  }

  return g;
}

async function main() {
  const titleSeparator = chalk.yellowBright("===");

  console.log(
    ` ${titleSeparator} ${chalk.blueBright(
      "(Daily) Reporter"
    )} ${titleSeparator} `
  );

  const recipientsPath = "./recipients.json";
  let recipients = [];

  if (fs.existsSync(recipientsPath)) {
    try {
      recipients = JSON.parse(fs.readFileSync(recipientsPath).toString());

      console.log(
        chalk.greenBright(`Loaded ${recipients.length} mail recipient(s)!`)
      );
    } catch (err) {
      console.error(chalk.redBright("Invalid recipients.json file: "), err);
    }
  } else {
    console.log(
      chalk.whiteBright(
        "The recipients.json file does not exist, creating it now..."
      )
    );

    let next = true,
      recipients = [];

    console.log("");
    console.log(
      "  Please tell me the recipients You would like to address Your reports to (to finish adding items, leave empty & accept):"
    );

    while (next) {
      let recipient: string = await new Promise((resolve, reject) => {
        inquirer
          .prompt([
            {
              type: "input",
              name: "input",
              message: " =>",
            },
          ])
          .then((ans) => {
            resolve(ans.input);
          });
      });

      if (recipient.length) {
        if (EmailValidator.validate(recipient)) {
          recipients.push(recipient);
        } else {
          console.log(
            chalk.yellowBright(
              "This does not seem to be a valid email. Please try again."
            )
          );
        }
      } else {
        next = false;
      }
    }

    fs.writeFileSync(recipientsPath, JSON.stringify(recipients, null, 2));
  }

  const defaultConfig = {
    fromName: "",
    email: "",
    password: "",
    smtpServer: "",
    smtpPort: 587,
    signature: "",
  };

  const configPath = "./config.json";
  let config = defaultConfig;

  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath).toString());

      console.log(chalk.greenBright(`Successfully loaded configuration!`));
    } catch (err) {
      console.error(chalk.redBright("Invalid config.json file: "), err);
    }
  } else {
    console.log(
      chalk.whiteBright(
        "A valid config.json file does not exist, creating it now..."
      )
    );

    console.log("");
    console.log(
      "  Please tell me Your desired sender name (it will be displayed in the recipients' email client, e.g. 'John Wick, PhD, Renewable Energy Tech Lead'):"
    );

    defaultConfig.fromName = await new Promise((resolve, reject) => {
      inquirer
        .prompt([
          {
            type: "input",
            name: "name",
            message: " =>",
          },
        ])
        .then((ans) => {
          resolve(ans.name);
        });
    });

    console.log("  Please tell me Your email:");

    defaultConfig.email = await new Promise((resolve, reject) => {
      inquirer
        .prompt([
          {
            type: "input",
            name: "email",
          },
        ])
        .then((ans) => {
          resolve(ans.email);
        });
    });

    console.log("  Please tell me Your email password:");

    defaultConfig.password = await new Promise((resolve, reject) => {
      inquirer
        .prompt([
          {
            type: "password",
            name: "password",
          },
        ])
        .then((ans) => {
          resolve(ans.password);
        });
    });

    console.log("  Please tell me Your SMTP server address:");

    defaultConfig.smtpServer = await new Promise((resolve, reject) => {
      inquirer
        .prompt([
          {
            type: "input",
            name: "server",
          },
        ])
        .then((ans) => {
          resolve(ans.server);
        });
    });

    console.log("  Please tell me Your SMTP server port (usually 587):");

    defaultConfig.smtpPort = await new Promise((resolve, reject) => {
      inquirer
        .prompt([
          {
            type: "number",
            name: "port",
            default: 587,
          },
        ])
        .then((ans) => {
          resolve(isNaN(Number(ans.port)) ? 587 : ans.port);
        });
    });

    console.log(
      "  Please configure Your signature (just name + surname, please):"
    );

    defaultConfig.signature = await new Promise((resolve, reject) => {
      inquirer
        .prompt([
          {
            type: "input",
            name: "signature",
          },
        ])
        .then((ans) => {
          resolve(ans.signature);
        });
    });

    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  }

  let transporter = nodemailer.createTransport({
    debug: true,
    host: config.smtpServer,
    port: config.smtpPort,
    secure: false,
    auth: {
      user: config.email,
      pass: config.password,
    },
    tls: {
      ciphers: "SSLv3",
    },
  });

  transporter.verify(function (error, success) {
    if (error) {
      console.error(chalk.redBright("Error connecting to SMTP server!"), error);
      process.exit(-1);
    } else {
      console.log(chalk.greenBright("Connected with SMTP server!"));

      inquirer
        .prompt([
          {
            type: "confirm",
            name: "bToday",
            message: "Is the report from today?",
          },
          {
            type: "input",
            name: "data",
            when: (answers) => !answers.bToday,
            message: "Please tell me the date (DD.MM.YYYY):",
            validate: (input, answers) => {
              try {
                return moment(input, "DD.MM.YYYY").isValid()
                  ? true
                  : "Invalid date (expected date in format DD.MM.YYYY)!";
              } catch (err) {
                return "Invalid date (expected date in format DD.MM.YYYY)!";
              }
            },
          },
          {
            type: "input",
            name: "startTime",
            message: "Start time (HH:mm):",
          },
          {
            type: "input",
            name: "finishTime",
            message: "Finish time (HH:mm):",
          },
        ])
        .then(async (answers1) => {
          let next = true,
            tasks = [];

          console.log(
            "  Today's tasks (to finish adding items, leave empty & accept):"
          );

          while (next) {
            let task: string = await new Promise((resolve, reject) => {
              inquirer
                .prompt([
                  {
                    type: "input",
                    name: "input",
                    message: " =>",
                  },
                ])
                .then((ans) => {
                  resolve(ans.input);
                });
            });

            if (task.length) {
              tasks.push(task);
            } else {
              next = false;
            }
          }

          let dayMoment = answers1.bToday
            ? moment()
            : moment(answers1.data, "DD.MM.YYYY");

          let subject = `Daily report - ${dayMoment.format("MM/DD/YYYY")} (${
            answers1.startTime
          } - ${answers1.finishTime})`;

          let mailText = `Good ${getGreetingTime(
            dayMoment
          )},\n\nI am attaching a daily report for the day ${dayMoment.format(
            "MM/DD/YYYY"
          )}. ${
            answers1.bToday ? "Today" : "That day"
          } I was working on the following:\n\n${tasks
            .map((task) => `\t- ${task}`)
            .join("\n")}\n\nKind regards,\n${config.signature}`;

          console.log("");
          console.log("=".repeat(20));
          console.log("");
          console.log("Mail preview:");
          console.log("");
          console.log(subject);
          console.log("-".repeat(20));
          console.log(mailText);
          console.log("");
          console.log("=".repeat(20));
          console.log("");

          inquirer
            .prompt([
              {
                type: "confirm",
                name: "bSend",
                message: `Mail will be sent to: ${recipients.join(
                  ", "
                )}.\nDo you want to send it? [y/n]`,
              },
            ])
            .then(async (confirmations) => {
              if (confirmations.bSend.toLowerCase() === "y") {
                let info = await transporter.sendMail({
                  from: `"${config.fromName}" <${config.email}>`,
                  to: recipients.join(", "),
                  subject: subject,
                  text: mailText,
                });

                console.log(
                  chalk.greenBright("Mail successfully sent: %s"),
                  info.messageId
                );
              } else {
                console.log(chalk.redBright("Cancelled."));
              }
            });
        });
    }
  });
}

main();
