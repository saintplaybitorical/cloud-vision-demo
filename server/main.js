import { Meteor } from "meteor/meteor";
import { WebApp } from "meteor/webapp";

import SimpleSchema from "simpl-schema";
import bodyParser from "body-parser";
import { get } from "lodash";

import { PlaqueRecordsCollection } from "/imports/api/plaqueRecords";
import { CamerasCollection } from "/imports/api/cameras";

PushSchema = new SimpleSchema({
  processing_time: { type: Number },
  timestamp: { type: String },
  results: { type: Array },
  "results.$": { type: Object },
  "results.$.box": { type: Object },
  "results.$.box.xmin": { type: Number },
  "results.$.box.ymin": { type: Number },
  "results.$.box.xmax": { type: Number },
  "results.$.box.ymax": { type: Number },
  "results.$.plate": { type: String },
  "results.$.score": { type: Number },
  "results.$.dscore": { type: Number },
  filename: { type: String },
  version: { type: Number },
  camera_id: { type: String },
});

WebApp.connectHandlers
  .use(bodyParser.json())
  .use("/api/push", function (req, res) {
    if (req.method !== "POST") {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(`Method ${req.method} is not supported in this endpoint`);
    }

    const { body } = req;
    try {
      PushSchema.validate(body);
    } catch (error) {
      if (error && error.errorType === "ClientError") {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(error.details.map((d) => d.message).join(". "));
      } else {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end("There was an error validating request body");
      }
      return;
    }

    let newPlaqueRecord;
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
      return res.end("There was an error upserting cameraId");
    }

    try {
      PlaqueRecordsCollection.insert(newPlaqueRecord);
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end("There was an error inserting new plaque");
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end("OK");
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
