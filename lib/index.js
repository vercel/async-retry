// Packages
var retrier = require('retry');

function retry(fn, opts) {
  var options = opts || {};

  // Default `randomize` to true
  if (!('randomize' in options)) {
    options.randomize = true;
  }

  function run(resolve, reject) {
    var op;

    op = retrier.operation(options);

    // We allow the user to abort retrying
    // this makes sense in the cases where
    // knowledge is obtained that retrying
    // would be futile (e.g.: auth errors)

    function bail(err) {
      reject(err || new Error('Aborted'));
    }

    function onError(err, num) {
      if (err.bail) {
        bail(err);
        return;
      }

      if (!op.retry(err)) {
        reject(op.mainError());
      } else if (options.onRetry) {
        options.onRetry(err, num);
      }
    }

    function runAttempt(num) {
      var val;

      try {
        val = fn(bail, num);
      } catch (err) {
        onError(err, num);
        return;
      }

      Promise.resolve(val)
        .then(resolve)
        .catch(function catchIt(err) {
          onError(err, num);
        });
    }

    op.attempt(runAttempt);
  }

  // Setting up overall timeout for a retry
  const { retryTimeout } = options;
  return retryTimeout
    ? Promise.race([
        new Promise(run),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Retry timed out in ${retryTimeout}ms`));
          }, retryTimeout);
        }),
      ])
    : new Promise(run);
}

module.exports = retry;
