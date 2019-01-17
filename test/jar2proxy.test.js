'use strict';

const mm = require('egg-mock');
const assert = require('assert');

describe('test/jar2proxy.test.js', () => {
  let app;
  before(async function() {
    app = mm.app({
      baseDir: 'apps/jar2proxy',
    });
    await app.ready();
  });
  afterEach(mm.restore);
  after(async function() {
    await app.close();
  });

  it('should has apiMeta', () => {
    assert(app.rpcServer);
    assert(app.rpcServer.apiMeta);
    assert(app.rpcServer.classMap);
    assert.deepEqual(app.rpcServer.apiMeta, require('./fixtures/apps/jar2proxy/config/apiMeta.json'));
    assert(app.rpcServer.services && app.rpcServer.services.has('eggjs.demo.DemoService:1.0.0'));
    const service = app.rpcServer.services.get('eggjs.demo.DemoService:1.0.0');
    assert.deepEqual(service.apiMeta, app.rpcServer.apiMeta['eggjs.demo.DemoService']);
  });

  it('should invoke sayHello', done => {
    app.rpcRequest('eggjs.demo.DemoService')
      .invoke('sayHello')
      .send([ 'gxcsoccer' ])
      .expect('hello gxcsoccer', done);
  });

  it('should invoke echoPerson', done => {
    app.rpcRequest('eggjs.demo.DemoService')
      .invoke('echoPerson')
      .send([{
        name: '宗羽',
        address: 'C 空间',
        id: 68955,
        salary: 10000000,
      }])
      .expect({
        name: '宗羽',
        address: 'C 空间',
        id: 68955,
        salary: 10000000,
      }, done);
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
    app.mockProxy('not-existService', 'xxx', function() {});
    app.mockProxy('DemoService', 'echoPerson1', function() {
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

    const r = await ctx.proxy.demoService.sayHello('gxcsoccer');
    assert(r === 'hello gxcsoccer');

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

    app.mockProxy('DemoService', 'sayHello', function() {
      throw new Error('mock error');
    });

    try {
      await ctx.proxy.demoService.sayHello('gxcsoccer');
      assert(false);
    } catch (err) {
      assert(err.message.includes('mock error'));
    }
  });
});
