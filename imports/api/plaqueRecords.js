import { Mongo } from "meteor/mongo";
import SimpleSchema from "simpl-schema";

const PlaqueRecords = new Mongo.Collection("plaqueRecords");
PlaqueRecords.schema = new SimpleSchema({
  processingTime: { type: Number },
  timestamp: { type: String },
  xMin: { type: Number },
  yMin: { type: Number },
  xMax: { type: Number },
  yMax: { type: Number },
  plate: { type: String },
  score: { type: Number },
  dscore: { type: Number },
  filename: { type: String },
  version: { type: Number },
  cameraId: { type: String },
});

export const PlaqueRecordsCollection = PlaqueRecords;
