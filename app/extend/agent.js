'use strict';

const _rpcRegistry = Symbol.for('egg#rpcRegistry');

module.exports = {
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
};
