import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
if (process.env.CHROME_PATH) Config.setBrowserExecutable(process.env.CHROME_PATH);
