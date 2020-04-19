function myRouter(req, res) {
  this.req = req;
  this.res = res;
}

myRouter.prototype.use = function(callback) {
  callback(this.req, this.res)
}

myRouter.prototype.get = function(path, reqHandler) {
  if(this.req.method === 'GET' && this.req.path === path) {
    reqHandler(this.req, this.res);
  }
}

module.exports = myRouter;

