module.exports = function(context, options) {
      var fn = options.fn, inverse = options.inverse, ctx;
      var ret = "";

      if(context && context.length > 0) {
        for(var i=0, j=context.length; i<j; i++) {
          ctx = Object.create(context[i]);
          ctx.index = i;
          ret = ret + fn(ctx);
        }
      } else {
        ret = inverse(this);
      }
      return ret;
}; 
