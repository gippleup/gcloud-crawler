const crawlSearch = require('./routing/search');
const crawlVideo = require('./routing/video');
const myRouter = require('./routing/helper');
/**
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
exports.sweeptube = (req, res) => {
  let router = new myRouter(req, res);
  router.get('/search', crawlSearch);
  router.get('/video', crawlVideo);
  // router.get('/', res.end())
};
