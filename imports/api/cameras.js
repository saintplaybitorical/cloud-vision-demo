import { Mongo } from "meteor/mongo";
import SimpleSchema from "simpl-schema";

const Cameras = new Mongo.Collection("cameras");
Cameras.schema = new SimpleSchema({
  cameraId: { type: String },
});

export const CamerasCollection = Cameras;
