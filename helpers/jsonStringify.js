const util = require("util");

module.exports = function (json) {
  console.log("jsonStringify:");
  console.log(util.inspect(json, false, null));
  if (json === 1) {
    console.log("json is 1");
  }
  if (json === 2) {
    console.log("json is 2");
  }  
  return JSON.stringify(json);
}