import { Meteor } from "meteor/meteor";
import { WebApp } from "meteor/webapp";
import { get } from "lodash";
import formidable from "formidable";

import { PlaqueRecordsCollection } from "/imports/api/plaqueRecords";
import { CamerasCollection } from "/imports/api/cameras";

const bound = Meteor.bindEnvironment((callback) => {
  callback();
});

WebApp.connectHandlers
  .use("/api/push", function (req, res) {
    if (req.method !== "POST") {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(`Method ${req.method} is not supported in this endpoint`);
    }

    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields) => {
      bound(() => {
        if (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(`There was an error parsing form: ${err}`);
          return;
        }

        let body = {};

        try {
          body = JSON.parse(fields.json);
          body = JSON.parse(body).data;
        } catch (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(`There was an error parsing json: ${err}`);
          return;
        }

        let newPlaqueRecord;

        if (!body || !body.results || !Array.isArray(body.results)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end("there were no valid results in request");
        }

        try {
          const [highestScoreResult] = body.results;
          if (!highestScoreResult) {
            res.writeHead(400, { "Content-Type": "application/json" });
            return res.end("valid result was not found in request");
          }
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
            filename: body.filename,
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
            res.end(error.details.map((d) => d.message).join(". "));
          } else {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(`There was an error validating result: ${error}`);
          }
          return;
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
          return res.end(`There was an error inserting new plaque, ${error}`);
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end("OK");
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
