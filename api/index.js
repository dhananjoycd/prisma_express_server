"use strict";

module.exports = (req, res) => {
  const appModule = require("../dist/src/app.js");
  const app = appModule.default || appModule;
  return app(req, res);
};
