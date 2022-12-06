// Packages
const test = require('ava');
const fetch = require('node-fetch');
const sleep = require('then-sleep');

// Ours
const retry = require('../lib');

test('return value', async t => {
  const val = await retry(async (bail, num) => {
    if (num < 2) {
      throw new Error('woot');
    }

    await sleep(50);
    return `woot ${num}`;
  });

  t.deepEqual('woot 2', val);
});

test('return value no await', async t => {
  const val = await retry(async (bail, num) => num);
  t.deepEqual(1, val);
});

test('chained promise', async t => {
  const res = await retry(async (bail, num) => {
    if (num < 2) {
      throw new Error('retry');
    }

    return fetch('https://www.wikipedia.org');
  });

  t.deepEqual(200, res.status);
});

test('bail', async t => {
  try {
    await retry(
      async (bail, num) => {
        if (num === 2) {
          bail(new Error('Wont retry'));
        }

        throw new Error(`Test ${num}`);
      },
      { retries: 3 }
    );
  } catch (err) {
    t.deepEqual('Wont retry', err.message);
  }
});

test('bail + return', async t => {
  let error;

  try {
    await Promise.resolve(
      retry(async bail => {
        await sleep(200);
        await sleep(200);
        bail(new Error('woot'));
      })
    );
  } catch (err) {
    error = err;
  }

  t.deepEqual(error.message, 'woot');
});

test('bail error', async t => {
  let retries = 0;

  try {
    await retry(
      async () => {
        retries += 1;
        await sleep(100);
        const err = new Error('Wont retry');
        err.bail = true;
        throw err;
      },
      { retries: 3 }
    );
  } catch (err) {
    t.deepEqual('Wont retry', err.message);
  }

  t.deepEqual(retries, 1);
});

test('with non-async functions', async t => {
  try {
    await retry(
      (bail, num) => {
        throw new Error(`Test ${num}`);
      },
      { retries: 2 }
    );
  } catch (err) {
    t.deepEqual('Test 3', err.message);
  }
});

test('return non-async', async t => {
  const val = await retry(() => 5);
  t.deepEqual(5, val);
});

test('with number of retries', async t => {
  let retries = 0;

  try {
    await retry(() => fetch('https://www.fakewikipedia.org'), {
      retries: 2,
      onRetry: (err, i) => {
        if (err) {
          // eslint-disable-next-line no-console
          console.log('Retry error : ', err);
        }

        retries = i;
      }
    });
  } catch (err) {
    t.deepEqual(retries, 2);
  }
});

test('with retry timeout', async t => {
  const retryTimeout = 2000;
  try {
    await retry(
      async () => {
        await sleep(3000);
      },
      {
        retryTimeout,
      }
    );
  } catch (err) {
    t.deepEqual(err.message, `Retry timed out in ${retryTimeout}ms`);
  }
});
