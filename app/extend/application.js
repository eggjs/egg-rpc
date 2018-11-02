'use strict';

const EggRpcClient = require('../../lib/client');
const EggRpcServer = require('../../lib/server');
const ProxyBase = require('../../lib/base_proxy');

// Symbols
const _rpcRegistry = Symbol.for('egg#rpcRegistry');
const _rpcClient = Symbol.for('egg#rpcClient');
const _rpcServer = Symbol.for('egg#rpcServer');

module.exports = {
  get Proxy() {
    return ProxyBase;
  },
  get rpcRegistry() {
    if (!this[_rpcRegistry]) {
      const options = this.config.rpc.registry;
      if (!options) return null;

      const registryClass = this.config.rpc.registryClass;
      this[_rpcRegistry] = new registryClass(Object.assign({
        logger: this.coreLogger,
        cluster: this.cluster,
      }, options));
      this[_rpcRegistry].on('error', err => { this.coreLogger.error(err); });
      this.beforeClose(async () => {
        await this[_rpcRegistry].close();
      });
    }
    return this[_rpcRegistry];
  },
  get rpcClient() {
    if (!this[_rpcClient]) {
      this[_rpcClient] = new EggRpcClient(this);
      this[_rpcClient].on('error', err => { this.coreLogger.error(err); });
      this.beforeClose(async () => {
        await this[_rpcClient].close();
      });
    }
    return this[_rpcClient];
  },
  get rpcServer() {
    if (!this[_rpcServer]) {
      this[_rpcServer] = new EggRpcServer(this);
      this[_rpcServer].on('error', err => { this.coreLogger.error(err); });
      this.beforeClose(async () => {
        await this[_rpcServer].close();
        this.coreLogger.info('[egg-rpc] rpc server is closed');
      });
    }
    return this[_rpcServer];
  },
};
