import React from "react";
import { createUseStyles } from "react-jss";
import VideoSource from "./VideoSource";
import SelfView from "./SelfView";

const useStyles = createUseStyles({
  root: {
    border: "2px solid blue",
    backgroundColor: "#FFF",
    border: "2px solid #7f8c8d",
    padding: 8,
    borderRadius: 8,
  },
  preferences: {
    fontSize: 24,
    fontWeight: "light",
  },
  middle: {
    display: "flex",
    marginTop: 24,
  },
  camera: {
    border: "1px solid blue",
    width: 700,
  },
  colorCorrection: {
    border: "2px solid green",
    flex: 1,
  },
});

export default function OptionsApp() {
  const classes = useStyles();
  return (
    <div className={classes.root}>
      <h3 className={classes.preferences}>Preferences</h3>
      <div className={classes.middle}>
        <div className={classes.camera}>
          <VideoSource />
          <SelfView />
        </div>
        <div className={classes.colorCorrection}>color correction</div>
      </div>
      <div>filters</div>
    </div>
  );
}