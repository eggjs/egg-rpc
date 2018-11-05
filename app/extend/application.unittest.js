'use strict';

const request = require('sofa-rpc-node').test;
const MockConnection = require('../../lib/mock_connection');

const mockAddress = require('url').parse('mock://127.0.0.1:12200', true);

function normalizeProxyName(name) {
  return name[0].toLowerCase() + name.substring(1);
}

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

  /**
   * mock 客户端 proxy
   *
   * @param {String} proxyName - proxy 的名字
   * @param {String} methodName - 方法名
   * @param {Function} fn - mock 的具体逻辑实现
   */
  mockProxy(proxyName, methodName, fn) {
    const consumers = this.rpcClient._consumerCache;
    let target;
    for (const consumer of consumers.values()) {
      if (normalizeProxyName(consumer.options.proxyName) === normalizeProxyName(proxyName)) {
        target = consumer;
        break;
      }
    }
    if (!target) {
      this.logger.warn('[egg-rpc] app.mockProxy(proxyName, methodName, fn), proxyName: %s not found', proxyName);
      return;
    }

    if (!target.__mockMethods__) {
      this.mm(target, '__mockMethods__', new Map());

      const getConnection = target.getConnection;
      this.mm(target, 'getConnection', async function(...args) {
        const req = args[0];
        if (this.__mockMethods__.has(req.methodName)) {
          return this.__mockMethods__.get(req.methodName);
        }
        return await getConnection.apply(this, args);
      });
    }

    target.__mockMethods__.set(methodName, new MockConnection({
      address: mockAddress,
      logger: this.logger,
      protocol: this.config.rpc.client.protocol,
      handler: async (...args) => {
        return this.toAsyncFunction(fn).apply(null, args);
      },
    }));
  },
};
