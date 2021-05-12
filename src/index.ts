import fs from "fs";

import chalk from "chalk";
import EmailValidator from "email-validator";
import inquirer from "inquirer";
import moment, { Moment } from "moment";
import nodemailer from "nodemailer";
import signale from "signale";

const recipientsPath = "./recipients.json";
const configPath = "./config.json";

function getGreetingTime(date: Moment): string {
  var timeOfDay: string = "";

  if (!date || !date.isValid()) {
    return "afternoon";
  }

  var splitAfternoon = 12; // 24h time to split the afternoon
  var splitEvening = 17; // 24h time to split the evening
  var currentHour = parseFloat(date.format("HH"));

  if (currentHour >= splitAfternoon && currentHour <= splitEvening) {
    timeOfDay = "afternoon";
  } else if (currentHour >= splitEvening) {
    timeOfDay = "evening";
  } else {
    timeOfDay = "morning";
  }

  return timeOfDay;
}

async function main() {
  const titleSeparator = chalk.yellowBright("===");

  signale.log(
    ` ${titleSeparator} ${chalk.blueBright(
      "(Daily) Reporter"
    )} ${titleSeparator} `
  );

  let recipients: string[] = [];

  if (fs.existsSync(recipientsPath)) {
    try {
      recipients = JSON.parse(fs.readFileSync(recipientsPath).toString());

      signale.success(
        chalk.greenBright(`Loaded ${recipients.length} mail recipient(s)!`)
      );
    } catch (err) {
      signale.error(chalk.redBright("Invalid recipients.json file: "), err);
    }
  } else {
    signale.info(
      chalk.whiteBright(
        "The recipients.json file does not exist, creating it now..."
      )
    );

    let next = true,
      recipients = [];

    signale.log("");
    signale.log(
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
          signale.warn(
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
    SSL: false,
    selfSigned: false,
  };

  let config = defaultConfig;

  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath).toString());

      let deletedSuperfluous: number = 0,
        addedMissing: number = 0;

      const defaultConfigKeys = Object.keys(defaultConfig);

      // delete superfluous config entries
      for (let key of Object.keys(config)) {
        if (!defaultConfigKeys.includes(key)) {
          delete config[key];
          deletedSuperfluous++;
        }
      }

      const configKeys = Object.keys(config);
      // add missing config entries
      for (let key of defaultConfigKeys) {
        if (!configKeys.includes(key)) {
          config[key] = defaultConfig[key];
          addedMissing++;
        }
      }

      if (deletedSuperfluous > 0 || addedMissing > 0) {
        signale.info(
          `Deleted ${deletedSuperfluous} obsolete, superfluous config entries & added ${addedMissing} missing entries.`
        );

        fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
      }

      signale.log(chalk.greenBright(`Successfully loaded configuration!`));
    } catch (err) {
      signale.error(chalk.redBright("Invalid config.json file: "), err);
    }
  } else {
    signale.debug(
      chalk.whiteBright(
        "A valid config.json file does not exist, creating it now..."
      )
    );

    signale.log("");

    signale.log(
      "  Please tell me Your desired sender name (it will be displayed in the recipients' email client, e.g. 'John Wick, PhD, Renewable Energy Tech Lead'):"
    );
    config.fromName = await new Promise((resolve, reject) => {
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

    signale.log("  Please tell me Your email address");
    config.email = await new Promise((resolve, reject) => {
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

    signale.log("  Please tell me Your email password");
    config.password = await new Promise((resolve, reject) => {
      inquirer
        .prompt([
          {
            type: "password",
            name: "password",
            mask: "*",
          },
        ])
        .then((ans) => {
          resolve(ans.password);
        });
    });

    signale.log("  Please tell me Your SMTP server address");
    config.smtpServer = await new Promise((resolve, reject) => {
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

    signale.log("  Please tell me Your SMTP server port (usually 587)");
    config.smtpPort = await new Promise((resolve, reject) => {
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

    signale.log("  Please configure Your signature (e.g. 'name surname')");
    config.signature = await new Promise((resolve, reject) => {
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

    signale.log("  Does Your server use SSL?");
    config.SSL = await new Promise((resolve, reject) => {
      inquirer
        .prompt([
          {
            type: "confirm",
            name: "SSL",
          },
        ])
        .then((ans) => {
          resolve(ans.SSL);
        });
    });

    signale.log("  Does the server use a self-signed certificate?");
    config.selfSigned = await new Promise((resolve, reject) => {
      inquirer
        .prompt([
          {
            type: "confirm",
            name: "selfSigned",
          },
        ])
        .then((ans) => {
          resolve(ans.selfSigned);
        });
    });

    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
  }

  let transporter = nodemailer.createTransport({
    debug: process.env.NODE_ENV === "development",
    host: config.smtpServer,
    port: config.smtpPort,
    secure: config.SSL,
    auth: {
      user: config.email,
      pass: config.password,
    },
    tls: {
      ciphers: "SSLv3",
      rejectUnauthorized: !config.selfSigned,
    },
  });

  transporter.verify(function (error, success) {
    if (error) {
      signale.error(chalk.redBright("Error connecting to SMTP server!"), error);
      process.exit(-1);
    } else {
      signale.log(chalk.greenBright("Connected with SMTP server!"));

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

          signale.log(
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

          signale.log("");
          signale.log("=".repeat(20));
          signale.log("");
          signale.log("Mail preview:");
          signale.log("");
          signale.log(subject);
          signale.log("-".repeat(20));
          signale.log(mailText);
          signale.log("");
          signale.log("=".repeat(20));
          signale.log("");

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
              if (confirmations.bSend) {
                let info = await transporter.sendMail({
                  from: `"${config.fromName}" <${config.email}>`,
                  to: recipients.join(", "),
                  subject: subject,
                  text: mailText,
                });

                signale.log(
                  chalk.greenBright("Mail successfully sent: %s"),
                  info.messageId
                );
              } else {
                signale.log(chalk.redBright("Cancelled sending the mail."));
              }
            });
        });
    }
  });
}

main();
