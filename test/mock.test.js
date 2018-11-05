'use strict';

const mm = require('egg-mock');
const assert = require('assert');

describe('test/mock.test.js', () => {
  let app;
  before(async function() {
    app = mm.app({
      baseDir: 'apps/mock',
    });
    await app.ready();
  });
  afterEach(mm.restore);
  after(async function() {
    await app.close();
  });

  it('should app.mockProxy check encode error', async function() {
    app.mockProxy('DemoService', 'echoPerson', function() {
      return {
        name: '宗羽 by mock',
        address: 'C 空间',
        id: 68955,
        salary: 10000000,
      };
    });

    const ctx = app.createAnonymousContext();
    const res = await ctx.proxy.demoService.echoPerson({
      name: '宗羽',
      address: 'C 空间',
      id: 68955,
      salary: 10000000,
    });
    assert.deepEqual(res, {
      name: '宗羽 by mock',
      address: 'C 空间',
      id: 68955,
      salary: 10000000,
    });

    try {
      await ctx.proxy.demoService.echoPerson({
        name: '宗羽',
        address: 'C 空间',
        id: 68955,
        salary: '10000000',
      });
      assert(false);
    } catch (err) {
      assert(err.message === 'hessian writeInt expect input type is `int32`, but got `string` : "10000000" ');
    }
  });
});
