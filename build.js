const glob = require('glob');
const path = require('path');
const Metalsmith = require('metalsmith');
const layouts = require('metalsmith-layouts');
const assets = require('metalsmith-assets');
const markdown = require('metalsmith-markdown');
const dataMarkdown = require('metalsmith-data-markdown');
const contentful = require('contentful-metalsmith');
const htmlMinifier = require('metalsmith-html-minifier');
const handlebars = require('handlebars');
const debug = require('metalsmith-debug');
const sitemap = require('metalsmith-sitemap');
const concat = require('metalsmith-concat');
const cleanCSS = require('metalsmith-clean-css');
const fingerprint = require("metalsmith-fingerprint-ignore");



const SPACE_ID = process.env.SPACE_ID;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

// add custom helpers to handlebars
glob.sync('helpers/*.js').forEach((fileName) => {
  const helper = fileName.split('/').pop().replace('.js', '')

  handlebars.registerHelper(
    helper,
    require(`./${fileName}`)
  )
});

//
// Node in a tree. Used for building the html sitemap of the page from a flat array of file paths.
//
function Node(id) {
    this.id = id;
    this.children = []; // array
};

Node.prototype.getChild = function (id) {
    var node;
    this.children.some(function (n) {
        if (n.id === id) {
            node = n;
            return true;
        }
    });
    return node;
};

function printTree(_tree) {
	if (_tree.children.length > 0) {
  	var html = "<li>" + _tree.id + "<ul>";
    _tree.children.forEach(subTree => {
    	html += printTree(subTree)
    });
    return html + "</ul></li>";
  } else {
  	return "<li>" + _tree.id + "</li>";
  }
};

function printTreeWithoutRoot(_tree) {
	var html = "<ul>";
  _tree.children.forEach(subTree => {
  	html += printTree(subTree);
  });
  return html + "</ul>" 
};

//
// Metalsmith config
//

Metalsmith(__dirname)
  .metadata({
    site: {
      url: "https://holzschmiede-hamburg.de"
    }
  })
  .source('src')
  .destination('build')
  .use(contentful({
    space_id: SPACE_ID,
    access_token: ACCESS_TOKEN,
    common: {
      companyInfo: {
        limit: 1,
        filter: {
          'sys.id[in]': '3xWYUZJGgg0YSoO0mUYGKu'
        }
      },      
    },
  }))
  .use((files, metalsmith, callback) => {
    Object.keys(files).forEach(filename => {
      files[filename].slug = path.parse(filename).name;
    });

    callback();
  })
  .use((files, metalsmith, callback) => {
    var tree = new Node('root');

    Object.keys(files).forEach(function (a) {
        var parts = a.substring(0, a.lastIndexOf(".")).split('/');
        parts.reduce(function (r, b) {
            var node = r.getChild(b);
            if (!node) {
                node = new Node(b);
                r.children.push(node);
            }
            return node;
        }, tree);
    });
    
    Object.keys(files).forEach(filename => {
      files[filename].htmlSitemap = printTreeWithoutRoot(tree);
    })

    callback();
  })  
  .use(assets({
    source: 'assets/',
    destination: 'assets/'
  }))
  .use(cleanCSS({
    files: 'assets/css/holzschmiede.css',
    cleanCSS: {
      rebase: false
    }
  }))   
  .use(concat({
    files: 'assets/css/*.css',
    output: 'assets/css/holzschmiede.prod.css'
  }))
  .use(fingerprint({ 
    pattern: 'assets/css/holzschmiede.prod.css',
    keep: false 
  }))
  .use(layouts({ // this needs to come after fingerprint, else fingerprint is not present in the metalsmith metadata
    engine: 'handlebars',
    partials: 'partials'
  }))     
  .use(debug())
  .use(markdown())
  .use(dataMarkdown({
    removeAttributeAfterwards: true
  }))
  .use(htmlMinifier({
    removeRedundantAttributes: false,
    removeAttributeQuotes: false
  }))
  .use(sitemap({
      "hostname": "https://holzschmiede-hamburg.de"
  }))
  .build(function (err) {
    if (err) throw err

    console.log('Successfully build metalsmith')
  })
