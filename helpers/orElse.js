const handlebars = require('handlebars');

module.exports = (value, fallback) => {
    const out = value || fallback;
    return new handlebars.SafeString(out);
};