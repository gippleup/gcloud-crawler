const crawler = require('../crawlOption/crawl-search');
/**
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
const crawlSearch = (req, res) => {
  let q = req.query
  crawler(q.query, q.itemCount)
    .then(results => {
      res.send(results)
    })
};

module.exports = crawlSearch;