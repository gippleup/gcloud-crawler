import crawlSearch from './crawlOption/crawl-search'

/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */

exports.sweeptube = (req, res) => {
  crawlSearch(req, res);
};
