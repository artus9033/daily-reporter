const fs = require("fs");
const moment = require("moment");
const inquirer = require("inquirer");
const nodemailer = require("nodemailer");
const chalk = require("chalk").default;

const packageJSON = require("./package.json");

function getGreetingTime(m) {
  var g = null; //return g

  if (!m || !m.isValid()) {
    return;
  } //if we can't find a valid or filled moment, we return.

  var split_afternoon = 12; //24hr time to split the afternoon
  var split_evening = 17; //24hr time to split the evening
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

const titleSeparator = chalk.yellowBright("===");

console.log(
  ` ${titleSeparator} ${chalk.blueBright(
    "(Daily) Reporter"
  )} ${chalk.greenBright(`v${packageJSON.version}`)} ${titleSeparator} `
);

const adresaciPath = "./adresaci.json";
let adresaci = [];

if (fs.existsSync(adresaciPath)) {
  try {
    adresaci = JSON.parse(fs.readFileSync(adresaciPath));

    console.log(
      chalk.greenBright(`Wczytano ${adresaci.length} adresatów maila!`)
    );
  } catch (err) {
    console.error(chalk.redBright("Błędny plik adresaci.json: "), err);
  }
} else {
  console.log(
    chalk.whiteBright("Plik adresaci.json nie istnieje, tworzenie...")
  );

  fs.writeFileSync(adresaciPath, JSON.stringify([]));
}

const defaultConfig = {
  fromName: "",
  email: "",
  password: "",
  smtpServer: "",
  smtpPort: 587,
  signature: ""
};

const configPath = "./config.json";
let config = defaultConfig;

if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath));

    console.log(chalk.greenBright(`Wczytano konfigurację!`));
  } catch (err) {
    console.error(chalk.redBright("Błędny plik config.json: "), err);
  }
} else {
  console.log(chalk.whiteBright("Plik config.json nie istnieje, tworzenie..."));

  fs.writeFileSync(configPath, JSON.stringify(defaultConfig));
}

let transporter = nodemailer.createTransport({
  debug: true,
  host: config.smtpServer,
  port: config.smtpPort,
  secure: false,
  auth: {
    user: config.email,
    pass: config.password
  },
  tls: {
    ciphers: "SSLv3"
  }
});

transporter.verify(function(error, success) {
  if (error) {
    console.error(chalk.redBright(" Błąd podczas łączenia z SMTP!"), error);
    process.exit(-1);
  } else {
    console.log(chalk.greenBright(" Połączono z SMTP!"));

    inquirer
      .prompt([
        {
          type: "confirm",
          name: "czyDzisiaj",
          message: "Czy report z dnia dzisiejszego?"
        },
        {
          type: "input",
          name: "data",
          when: answers => !answers.czyDzisiaj,
          message: "Podaj datę (DD.MM.YYYY):",
          validate: (input, answers) => {
            try {
              return moment(input, "DD.MM.YYYY").isValid()
                ? true
                : "Błędna data!";
            } catch (err) {
              return "Błędna data!";
            }
          }
        },
        {
          type: "input",
          name: "godzRozp",
          message: "Godzina rozpoczęcia (HH:mm):"
        },
        {
          type: "input",
          name: "godzZakoncz",
          message: "Godzina zakończenia (HH:mm):"
        }
      ])
      .then(async answers1 => {
        let next = true,
          points = [];

        console.log("  Dzisiaj wykonane (aby zakończyć, pozostaw puste):");

        while (next) {
          let pt = await new Promise((resolve, reject) => {
            inquirer
              .prompt([
                {
                  type: "input",
                  name: "input",
                  message: " =>"
                }
              ])
              .then(ans => {
                resolve(ans.input);
              });
          });

          if (pt.length) {
            points.push(pt);
          } else {
            next = false;
          }
        }
        inquirer
          .prompt([
            {
              type: "confirm",
              name: "czyWyslac",
              message: `Mail będzie wysłany do: ${adresaci.join(
                ", "
              )}.\nCzy wysłać maila?`
            }
          ])
          .then(async confirmations => {
            let dayMoment = answers1.czyDzisiaj
              ? moment()
              : moment(answers1.data);

            let info = await transporter.sendMail({
              from: `"${config.fromName}" <${config.email}>`,
              to: adresaci.join(", "),
              subject: `Daily report - ${dayMoment.format("MM/DD/YYYY")} (${
                answers1.godzRozp
              } - ${answers1.godzZakoncz})`,
              text: `Good ${getGreetingTime(
                dayMoment
              )},\n\nI am attaching a daily report for the day ${dayMoment.format(
                "MM/DD/YYYY"
              )}. ${
                answers1.czyDzisiaj ? "Today" : "That day"
              } I was working on the following:\n\n${points
                .map(pt => `\t- ${pt}`)
                .join("\n")}\n\nKind regards,\n${config.signature}`
            });

            console.log(chalk.greenBright("Wysłano maila: %s"), info.messageId);
          });
      });
  }
});
