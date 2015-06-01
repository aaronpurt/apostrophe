var assert = require('assert');
var _ = require('lodash');
var async = require('async');
var request = require('request');

var apos;

function anonReq() {
  return {
    res: {
      __: function(x) { return x; }
    },
    browserCall: apos.app.request.browserCall,
    getBrowserCalls: apos.app.request.getBrowserCalls,
    query: {}
  };
}

function adminReq() {
  return _.merge(anonReq(), {
    user: {
      permissions: {
        admin: true
      }
    }
  });
}

describe('Jawns', function() {
  //////
  // EXISTENCE
  //////

  it('should initialize', function(done) {
    apos = require('../index.js')({
      root: module,
      shortName: 'test',
      hostName: 'test.com',
      modules: {
        'apostrophe-express': {
          secret: 'xxx',
          port: 7941
        },
        // normally not used directly, but it's handy
        // for testing. Normally you'd extend it
        'apostrophe-jawns': {
          indexType: 'index'
        }
      },
      afterListen: function(err) {
        done();
      }
    });
  });

  it('should fire a dispatch route for its homepage', function(done) {
    var jawns = apos.modules['apostrophe-jawns'];
    jawns.dispatch('/', function(req, callback) {
      req.handlerInvoked = true;
      req.template = function(req, args) {
        return 'jawns-index';
      }
      return setImmediate(callback);
    });
    // Simulate a page request
    var req = {
      data: {
        bestPage: {
          type: 'index'
        }
      },
      remainder: '/'
    };
    // pageServe method normally invoked via callAll in
    // the pages module
    jawns.pageServe(req, function(err) {
      assert(!err);
      assert(req.handlerInvoked);
      done();
    });
  });

  it('should fire a dispatch route matching a second, longer URL', function(done) {
    var jawns = apos.modules['apostrophe-jawns'];
    jawns.dispatch('/foo', function(req, callback) {
      req.fooInvoked = true;
      return setImmediate(callback);
    });
    // Simulate a page request
    var req = {
      data: {
        bestPage: {
          type: 'index'
        }
      },
      remainder: '/foo'
    };
    // pageServe method normally invoked via callAll in
    // the pages module
    jawns.pageServe(req, function(err) {
      assert(!err);
      assert(req.fooInvoked);
      done();
    });
  });

  it('should fire a dispatch route with parameters', function(done) {
    var jawns = apos.modules['apostrophe-jawns'];
    jawns.dispatch('/bar/:bizzle/:kapow/*', function(req, callback) {
      req.barInvoked = true;
      return setImmediate(callback);
    });
    // Simulate a page request
    var req = {
      data: {
        bestPage: {
          type: 'index'
        }
      },
      remainder: '/bar/wacky/wonky/wibble/skip'
    };
    // pageServe method normally invoked via callAll in
    // the pages module
    jawns.pageServe(req, function(err) {
      assert(!err);
      assert(req.barInvoked);
      assert(req.params.bizzle === 'wacky');
      assert(req.params.kapow === 'wonky');
      assert(req.params[0] === 'wibble/skip');
      done();
    });
  });

  it('should allow a later call to dispatch to override an earlier dispatch route', function(done) {
    var jawns = apos.modules['apostrophe-jawns'];
    jawns.dispatch('/foo', function(req, callback) {
      req.foo2Invoked = true;
      req.template = function(req, args) {
        return 'jawns-foo';
      }
      return setImmediate(callback);
    });
    // Simulate a page request
    var req = {
      data: {
        bestPage: {
          type: 'index'
        }
      },
      remainder: '/foo'
    };
    // pageServe method normally invoked via callAll in
    // the pages module
    jawns.pageServe(req, function(err) {
      assert(!err);
      assert(req.foo2Invoked);
      assert(!req.fooInvoked);
      done();
    });
  });

  it('should not match when page type is wrong', function(done) {
    var jawns = apos.modules['apostrophe-jawns'];
    // Simulate a page request for the wrong page type
    var req = {
      data: {
        bestPage: {
          type: 'wibble'
        }
      },
      remainder: '/foo'
    };
    // pageServe method normally invoked via callAll in
    // the pages module
    jawns.pageServe(req, function(err) {
      assert(!err);
      assert(!req.foo2Invoked);
      done();
    });
  });

  it('should not match when there is no bestPage', function(done) {
    var jawns = apos.modules['apostrophe-jawns'];
    // Simulate a page request for the wrong page type
    var req = {
      data: {
        bestPage: null
      },
      remainder: '/foo'
    };
    // pageServe method normally invoked via callAll in
    // the pages module
    jawns.pageServe(req, function(err) {
      assert(!err);
      assert(!req.foo2Invoked);
      done();
    });
  });

  it('should be able to insert a test page manually into the db', function(done) {
    var testItem =
      { _id: 'jawns1',
        type: 'index',
        slug: '/jawns',
        published: true,
        path: '/jawns',
        level: 1,
        rank: 5
      };
    return apos.docs.db.insert(testItem, done);
  });

  it('should match a dispatch route on a real live page request', function(done) {
    return request('http://localhost:7941/jawns', function(err, response, body){
      assert(!err);
      // Is our status code good?
      assert.equal(response.statusCode, 200);
      // Did we get the index output?
      assert(body.match(/jawns\-index/));
      return done();
    });
  });

  it('runs foo route with /foo remainder', function(done) {
    return request('http://localhost:7941/jawns/foo', function(err, response, body){
      assert(!err);
      // Is our status code good?
      assert.equal(response.statusCode, 200);
      // Did we get the index output?
      assert(body.match(/jawns\-foo/));
      return done();
    });
  });

  it('yields 404 with bad remainder (not matching any dispatch routes)', function(done) {
    return request('http://localhost:7941/jawns/tututu', function(err, response, body){
      assert(!err);
      // Is our status code good?
      assert.equal(response.statusCode, 404);
      return done();
    });
  });

});
