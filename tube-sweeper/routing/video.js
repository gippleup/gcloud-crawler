const crawler = require('../crawlOption/crawl-video');
/**
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
const crawlVideo = (req, res) => {
  let q = req.query
  crawler(q.id)
    .then(results => {
      res.send(results)
    })
};

module.exports = crawlVideo;