//
// Some basic security for user / group permissions (not sufficient on Windows)
//
var uidNumber = require('uid-number');
exports.name = 'security';
exports.schema = {
  properties: {
    uid: {
      type: 'string',
      description: 'the user to associate with this scaffold'
    },
    gid: {
      type: 'string',
      description: 'the group to associate with this scaffold'
    },
    insecure: {
      type: 'boolean',
      description: 'if the user and group should not be set for this instance'
    },
    precomputed: {
      type: 'boolean',
      description: 'if there is no need to check the user and group id before running'
    }
  }
}
exports.actions = {
  //
  // When locking down, change fs attributes appropriately
  //
  'task.checkout.lockdown': function secure(scaffold, options, next) {
    //
    // for consistency only
    //
    if (options.config.get('insecure')) {
      next(null, scaffold, options);
      return;
    }
    var uid = options.config.get('uid') || process.getuid();
    var gid = options.config.get('gid') || process.getgid();
    uidNumber(uid, gid, function (err, uid, gid) {
      if (err) {
        next(err);
        return;
      }
      chmodr(scaffold.directories.rootdir, uid, gid, function (err) {
        next(err, scaffold);
      });
    });
  },
  //
  // When programs run, run as the proper user/group
  //
  'task.run.lockdown': function secure(cmd, args, options, next) {
    var insecure = options.config.get('insecure');
    if (insecure) {
      next(null, cmd, args, options);
      return;
    }
    var scaffold = this;
    var uid = options.config.get('uid');
    var gid = options.config.get('gid');
    function setids(err, uid, gid) {
      if (err) {
        next(err);
        return;
      }
      if (uid) options.uid = '#'+uid;
      if (gid) options.gid = '#'+gid;
      next(null, cmd, args, options);
    }
    if (uid) {
      if (gid) {
        uidNumber(uid, gid, setids);
      }
      else {
        uidNumber(uid, setids);
      }
    }
    else {
      setids(null, void 0, void 0);
    }
  }
}