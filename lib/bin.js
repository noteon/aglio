(function() {
  var aglio, cErr, cWarn, clc, fs, getLineNo, http, logWarnings, parser;

  aglio = require('./main');

  clc = require('cli-color');

  fs = require('fs');

  http = require('http');

  parser = require('optimist').usage('Usage: $0 [-l -t template --no-filter --no-condense] -i infile [-o outfile -s]').options('i', {
    alias: 'input',
    describe: 'Input file'
  }).options('o', {
    alias: 'output',
    describe: 'Output file'
  }).options('t', {
    alias: 'template',
    describe: 'Template name or file',
    "default": 'default'
  }).options('f', {
    alias: 'filter',
    boolean: true,
    describe: 'Sanitize input from Windows',
    "default": true
  }).options('c', {
    alias: 'condense',
    boolean: true,
    describe: 'Condense navigation links',
    "default": true
  }).options('s', {
    alias: 'server',
    describe: 'Start a local preview server'
  }).options('h', {
    alias: 'host',
    describe: 'Address to bind local preview server to',
    "default": '127.0.0.1'
  }).options('p', {
    alias: 'port',
    describe: 'Port for local preview server',
    "default": 3000
  }).options('l', {
    alias: 'list',
    describe: 'List templates'
  });

  cErr = clc.white.bgRed;

  cWarn = clc.xterm(214).bgXterm(235);

  getLineNo = function(input, err) {
    if (err.location && err.location.length) {
      return input.substr(0, err.location[0].index).split('\n').length;
    }
  };

  logWarnings = function(warnings) {
    var lineNo, warning, _i, _len, _ref, _results;
    _ref = warnings || [];
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      warning = _ref[_i];
      lineNo = getLineNo(warnings.input, warning) || 0;
      _results.push(console.error(cWarn(">> Line " + lineNo + ":") + (" " + warning.message + " (warning code " + warning.code + ")")));
    }
    return _results;
  };

  exports.run = function(argv, done) {
    var options;
    if (argv == null) {
      argv = parser.argv;
    }
    if (done == null) {
      done = function() {};
    }
    if (argv.l) {
      return aglio.getTemplates(function(err, names) {
        if (err) {
          console.error(err);
          return done(err);
        }
        console.log('Templates:\n' + names.join('\n'));
        return done();
      });
    } else if (argv.s) {
      if (!argv.i) {
        parser.showHelp();
        return done('Invalid arguments');
      }
      http.createServer(function(req, res) {
        var blueprint, options;
        if (req.url !== '/') {
          return res.end();
        }
        console.log("Rendering " + argv.i);
        options = {
          template: argv.t,
          filterInput: argv.f,
          condenseNav: argv.c
        };
        blueprint = fs.readFileSync(argv.i, 'utf-8');
        return aglio.render(blueprint, options, function(err, html, warnings) {
          logWarnings(warnings);
          if (err) {
            console.error(err);
          }
          res.writeHead(200, {
            'Content-Type': 'text/html'
          });
          return res.end(err ? err.toString() : html);
        });
      }).listen(argv.p, argv.h);
      console.log("Server started on http://" + argv.h + ":" + argv.p + "/");
      return done();
    } else {
      if (!argv.i || !argv.o) {
        parser.showHelp();
        return done('Invalid arguments');
      }
      options = {
        template: argv.t,
        filterInput: argv.f,
        condenseNav: argv.c
      };
      return aglio.renderFile(argv.i, argv.o, options, function(err, warnings) {
        var lineNo;
        if (err) {
          lineNo = getLineNo(err.input, err);
          if (lineNo != null) {
            console.error(cErr(">> Line " + lineNo + ":") + (" " + err.message + " (error code " + err.code + ")"));
          } else {
            console.error(cErr('>>') + (" " + (JSON.stringify(err))));
          }
          return done(err);
        }
        logWarnings(warnings);
        return done();
      });
    }
  };

}).call(this);
