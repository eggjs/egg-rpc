'use strict';

const request = require('sofa-rpc-node').test;

module.exports = {
  /**
   * rpc 服务测试 helper
   * ```js
   * app.rpcRequest('helloService')
   *   .invoke('plus')
   *   .send([ 1, 2 ])
   *   .type('number')
   *   .expect(3, done);
   * ```
   * @param {String} serviceName - rpc 服务全称
   * @return {Request} req
   */
  rpcRequest(serviceName) {
    // 自动填充 namespace
    if (this.config.rpc && this.config.rpc.server &&
      this.config.rpc.server.namespace &&
      !serviceName.startsWith('com.') &&
      !serviceName.startsWith(this.config.rpc.server.namespace)) {
      serviceName = `${this.config.rpc.server.namespace}.${serviceName}`;
    }
    return request(this.rpcServer).service(serviceName);
  },
};
