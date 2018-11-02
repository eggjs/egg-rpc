'use strict';

module.exports = agent => {
  agent.beforeStart(async function() {
    // 可能不需要 rpcRegistry，比如直连的情况
    if (!agent.rpcRegistry) return;

    await agent.rpcRegistry.ready();
  });
};
