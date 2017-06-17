const util = require("util");

module.exports = function (json) {
  console.log("jsonStringify:");
  console.log(util.inspect(json, false, null));
  return JSON.stringify(json);
}