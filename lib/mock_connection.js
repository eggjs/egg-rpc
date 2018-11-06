'use strict';

const pump = require('pump');
const PassThrough = require('stream').PassThrough;
const Base = require('sofa-rpc-node').client.RpcConnection;

class MockConnection extends Base {
  _connect() {
    this._socket = new PassThrough();
    const opts = {
      sentReqs: this._sentReqs,
      classCache: this.options.classCache || new Map(),
      address: this.address,
    };
    opts.classCache.enableCompile = true;
    this._encoder = this.protocol.encoder(opts);
    this._decoder = this.protocol.decoder(opts);
    this._decoder.on('request', req => {
      this.options.handler.apply(null, req.data.args)
        .then(result => {
          this._handleResponse({
            packetId: req.packetId,
            packetType: 'response',
            data: { error: null, appResponse: result },
            meta: { size: 0, start: 0, rt: 0 },
          });
        })
        .catch(err => {
          this._handleResponse({
            packetId: req.packetId,
            packetType: 'response',
            data: { error: err, appResponse: null },
            meta: { size: 0, start: 0, rt: 0 },
          });
        });
    });
    pump(this._encoder, this._socket, this._decoder);
    this.ready(true);
  }

  heartbeat() {}
}

module.exports = MockConnection;
