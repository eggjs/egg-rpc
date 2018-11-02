'use strict';

const mm = require('egg-mock');

describe('test/jar2proxy.test.js', () => {
  let app;
  before(async function() {
    app = mm.app({
      baseDir: 'apps/jar2proxy',
    });
    await app.ready();
  });
  after(async function() {
    await app.close();
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
});
