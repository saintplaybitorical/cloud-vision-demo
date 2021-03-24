import { Meteor } from "meteor/meteor";
import { WebApp } from "meteor/webapp";
import { get } from "lodash";
import formidable from "formidable";
import bodyParser from "body-parser";
import sharp from "sharp";
import mime from "mime";

import { PlaqueRecordsCollection } from "/imports/api/plaqueRecords";
import { CamerasCollection } from "/imports/api/cameras";

const fs = Npm.require("fs");
const path = Npm.require("path");
const bound = Meteor.bindEnvironment((callback) => {
  callback();
});

function ensureDirectoryExistence(filePath) {
  var dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

WebApp.rawConnectHandlers.use((req, res, next) => {
  const re = /^\/static\/(.*)$/.exec(req.url);
  if (re) {
    const filePath = process.env.PWD + "/public/.#static/" + re[1];
    try {
      const type = mime.getType(filePath);
      const data = fs.readFileSync(filePath);
      res.writeHead(200, { "Content-Type": type });
      res.write(data);
      res.end();
    } catch {
      res.writeHead(404);
      res.end();
    }
  } else {
    next();
  }
});

WebApp.connectHandlers
  .use(bodyParser.json())
  .use("/api/push", function (req, res) {
    if (req.method !== "POST") {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(`Method ${req.method} is not supported in this endpoint`);
    }

    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      bound(() => {
        if (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          return res.end(`There was an error parsing form: ${err}`);
        }

        /**
         * @type {File|null} file
         */
        let file = null;
        try {
          file = files.upload;
        } catch (error) {
          res.writeHead(500, { "Content-Type": "application/json" });
          return res.end(`There was an error ${error}`);
        }

        if (!file) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end("Image file was not present request");
        }

        let body = {};

        try {
          body = JSON.parse(fields.json).data;
        } catch (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          return res.end(`There was an error parsing json: ${err}`);
        }

        let newPlaqueRecord;

        if (
          !body ||
          !body.results ||
          !body.filename ||
          !Array.isArray(body.results)
        ) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end("there were no valid results in request");
        }

        let sharpPromise = null;
        let highestScoreResult = null;
        try {
          const publicPath =
            process.env["METEOR_SHELL_DIR"] + "/../../../public/.#static/";
          const actualPath = path.join(
            publicPath,
            path.basename(body.filename)
          );

          [highestScoreResult] = body.results;
          if (!highestScoreResult) {
            res.writeHead(400, { "Content-Type": "application/json" });
            return res.end("valid result was not found in request");
          }

          ensureDirectoryExistence(actualPath);
          sharpPromise = sharp(file.path)
            .extract({
              left: get(highestScoreResult, "box.xmin"),
              top: get(highestScoreResult, "box.ymin"),
              width:
                get(highestScoreResult, "box.xmax") -
                get(highestScoreResult, "box.xmin"),
              height:
                get(highestScoreResult, "box.ymax") -
                get(highestScoreResult, "box.ymin"),
            })
            .toFile(actualPath);
        } catch (error) {
          res.writeHead(500, { "Content-Type": "application/json" });
          return res.end(`There was an error initializing sharp: ${error}`);
        }

        sharpPromise
          .then(() => {
            try {
              newPlaqueRecord = {
                processingTime: body.processing_time,
                timestamp: body.timestamp,
                xMin: get(highestScoreResult, "box.xmin"),
                yMin: get(highestScoreResult, "box.ymin"),
                xMax: get(highestScoreResult, "box.xmax"),
                yMax: get(highestScoreResult, "box.ymax"),
                plate: get(highestScoreResult, "plate"),
                score: get(highestScoreResult, "score"),
                dscore: get(highestScoreResult, "dscore"),
                filename: path.basename(body.filename),
                version: body.version,
                cameraId: body.camera_id,
              };
            } catch (error) {
              res.writeHead(500, { "Content-Type": "application/json" });
              return res.end(`There was an error ${error}`);
            }

            try {
              PlaqueRecordsCollection.schema.validate(newPlaqueRecord);
            } catch (error) {
              if (error && error.errorType === "ClientError") {
                res.writeHead(400, { "Content-Type": "application/json" });
                return res.end(error.details.map((d) => d.message).join(". "));
              } else {
                res.writeHead(500, { "Content-Type": "application/json" });
                return res.end(
                  `There was an error validating result: ${error}`
                );
              }
            }

            try {
              CamerasCollection.upsert(
                { cameraId: newPlaqueRecord.cameraId },
                { cameraId: newPlaqueRecord.cameraId }
              );
            } catch (error) {
              res.writeHead(500, { "Content-Type": "application/json" });
              return res.end(`There was an error upserting cameraId: ${error}`);
            }

            try {
              PlaqueRecordsCollection.insert(newPlaqueRecord);
            } catch (error) {
              res.writeHead(500, { "Content-Type": "application/json" });
              return res.end(
                `There was an error inserting new plaque, ${error}`
              );
            }

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end("OK");
          })
          .catch((error) => {
            res.writeHead(500, { "Content-Type": "application/json" });
            return res.end(`There was an error using sharp: ${error}`);
          });
      });
    });
  })
  .use("/api/ping", function (req, res) {
    const { body } = req;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  })
  .use("/api/pong", function (req, res) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify("Hola"));
  });

Meteor.startup(() => {});
