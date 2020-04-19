'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var puppeteer = _interopDefault(require('puppeteer'));

class CrawlHelper {
  constructor(browser, page) {
    this.browser = browser;
    this.page = page;
  }

  async waitItemCount(selector, itemCount) {
    let page = this.page;
    return page.waitFor((selector, itemCount) => {
      let target = document.querySelectorAll(selector);
      return target.length >= itemCount;
    }, {}, selector, itemCount)
  }

  async getItemCount(selector) {
    return this.page.evaluate((selector) => {
      let target = document.querySelectorAll(selector);
      return target.length;
    }, selector)
  }

  async checkItemCount(selector, itemCount) {
    return this.page.evaluate((selector) => {
      let target = document.querySelectorAll(selector);
      return target.length >= itemCount;
    }, [selector, itemCount])
  }

  getFuncBody(func) {
    let stringFunc = func.toString();
    let stringFucnBody = stringFunc.slice(
      stringFunc.indexOf("{") + 1,
      stringFunc.lastIndexOf("}")
    );
    return stringFucnBody
  }

  filterResources(req, resources) {
    const defulatTarget = [
      'image',
      'stylesheet',
      'font',
      'media',
      'audio',
    ];

    let filter = resources ? {
      ...resources
    } : {
      ...defulatTarget
    };
    let resourceType = req.resourceType();
    if (filter[resourceType]) {
      req.abort();
    } else {
      req.continue();
    }
  }

  async filterRequestByURL(req, words) {
    let defaultTarget = [
      'css',
      'png',
      'woff2',
      'ico',
      'jpg',
    ];
    let url = req.url();
    let target = words ? words : defaultTarget;
    let wordInURL = (word) => url.indexOf(word) > -1 ? true : false;
    for (let i = 0; i < target.length; i += 1) {
      if (wordInURL(target[i])) {
        return req.abort();
      }
    }
    return req.continue();
  }

  async startCheckingCoverage() {
    let page = this.page;
    await Promise.all([
      page.coverage.startJSCoverage(),
      page.coverage.startCSSCoverage()
    ]);
  }

  async endCheckingCoverage() {
    let page = this.page;
    const [jsCoverage, cssCoverage] = await Promise.all([
      page.coverage.stopJSCoverage(),
      page.coverage.stopCSSCoverage(),
    ]);
    let totalBytes = 0;
    let usedBytes = 0;
    const coverage = [...jsCoverage, ...cssCoverage];
    for (const entry of coverage) {
      totalBytes += entry.text.length;
      for (const range of entry.ranges)
        usedBytes += range.end - range.start - 1;
    }
    console.log(`Bytes total: ${totalBytes / 1024 / 1024}`);
    console.log(`Bytes used: ${usedBytes / 1024 / 1024}`);
  }

  async waitForSelectors(selectorArr) {
    for (let i = 0; i < selectorArr.length; i += 1) {
      await this.page.waitForSelector(selectorArr[i]);
    }
  }

  // scroll for one page
  async autoScroll(page) {
    await page.evaluate(async () => {
      await new Promise((resolve, reject) => {
        var totalHeight = 0;
        var distance = 500;
        var timer = setInterval(() => {
          var scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  // this function uses evaluate!
  async scrollUntilCount(selector, itemCount) {
    await this.page.evaluate(async (selector, itemCount) => {
      await new Promise((resolve, reject) => {
        var distance = 500;
        var timer = setInterval(() => {
          window.scrollBy(0, distance);
          let target = document.querySelectorAll(selector);
          if (target.length >= itemCount) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    }, selector, itemCount);
  }
}



var crawlhelper = CrawlHelper;

/* This gets first 100 videos for the query in order of relevance */




function extractThread(thread, collector = []) {
  let thumbnailPart = thread.querySelector('ytd-thumbnail > a#thumbnail');
  let videoURL = thumbnailPart.href;
  let embedURL = videoURL.replace('watch?v=', 'embed/');
  let videoId = videoURL.slice(videoURL.indexOf('watch?v=') + 8, videoURL.length);
  let thumbnailURL = thumbnailPart.querySelector('img#img').src;
  let videoLengthSelector = 'ytd-thumbnail-overlay-time-status-renderer > span';
  let videoLength = (() => {
    let el = thumbnailPart.querySelector(videoLengthSelector);
    return el ? el.textContent.match(/\S/g).join('') : ''
  })();

  let textPart = thread.querySelector('div.text-wrapper');
  let metaPart = textPart.querySelector('div#meta');
  let title = metaPart.querySelector('a#video-title > yt-formatted-string').textContent;

  let metainfoPart = metaPart.querySelector('ytd-video-meta-block');
  let channelEl = metainfoPart.querySelector('a');
  let channelName = channelEl ? channelEl.textContent : '';
  let channelURL = channelEl ? channelEl.href : '';
  let channelBadge = metainfoPart.querySelector('svg');

  let viewAndDate = metainfoPart.querySelectorAll('div#metadata-line > span');
  let view = viewAndDate[0] ? viewAndDate[0].textContent : '';
  let date = viewAndDate[1] ? viewAndDate[1].textContent : '';

  let des = (() => {
    let el = textPart.querySelector('#description-text');
    return el ? el.textContent : ''
  })();

  let data = {
    title,
    videoURL,
    embedURL,
    videoId,
    videoLength,
    thumbnailURL,
    view,
    date,
    des,
    channelName,
    channelURL,
    channelBadge,
  };

  collector.push(data);

  return data
}



function crawler(query, itemCount = 100) {
  return new Promise(async (resolve, reject) => {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          // '--window-size=1920x1080',
        ]
      });
      const page = await browser.newPage();
      let helper = new crawlhelper(browser, page);

      helper.startCheckingCoverage();

      await page.setRequestInterception(true);
      page.on('request', (req) => {
        helper.filterRequestByURL(req);
        // crawlhelper.filterResources(req);
      });
  
      await page.goto(`https://www.youtube.com/results?search_query=${query}`);

      helper.endCheckingCoverage();
      
      const nestedElSelector = 'ytd-thumbnail-overlay-time-status-renderer > span';
      await helper.scrollUntilCount(nestedElSelector, itemCount);

      let searchResults = await page.evaluate((stringFunc, itemCount) => {
        let threads = document.querySelectorAll('ytd-video-renderer');
        let slice = Array.from(threads).slice(0, itemCount);
        let extractThread = new Function('thread', 'collector=[]', `${stringFunc}`);

        let result = [];
        slice.forEach((thread) => {
          extractThread(thread, result);
        });

        return JSON.stringify(result);
      }, helper.getFuncBody(extractThread), itemCount);
      await browser.close();
      return resolve(searchResults);
    } catch (e) {
      return reject(e);
    }
  })
}

var crawlSearch = crawler;

/**
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
const crawlSearch$1 = (req, res) => {
  let q = req.query;
  crawlSearch(q.query, q.itemCount)
    .then(results => {
      res.send(results);
    });
};

var search = crawlSearch$1;

/* This gets a video info */




function extractVideo(document, collector = []) {
  try {
    let embedURL = document.URL.replace('watch?v=', 'embed/');
    let primary = document.querySelector('div#primary');
    let infoDiv = primary.querySelector('div#info');
    let tagEles = infoDiv.querySelectorAll('yt-formatted-string a');
    let tags = tagEles.length ? Array.from(tagEles).map(a => a.textContent) : '';
    let titleEl = infoDiv.querySelector('h1.ytd-video-primary-info-renderer');
    let title = titleEl.textContent;
    let menuButtons = infoDiv.querySelector('div#info div#top-level-buttons');
    let responseEles = menuButtons.querySelectorAll('ytd-toggle-button-renderer');
    let responses = Array.from(responseEles).reduce((result, el, i) => {
      let tag = i === 0 ? 'likes' : 'dislikes';
      result[tag] = el.textContent.match(/\S+/)[0];
      return result;
    }, {});
    
    let metaDiv = primary.querySelector('div#meta');
    let channelRow = metaDiv.querySelector('ytd-video-owner-renderer');
    let channelURL = channelRow.querySelector('a').href;
    let channelImg = channelRow.querySelector('img').src;
    let follwerEl = channelRow.querySelector('#owner-sub-count');
    let follower = follwerEl.textContent.split(' ')[0];
    
    let desDiv = metaDiv.querySelector('div#description');
    let description = desDiv.querySelector('yt-formatted-string').textContent;

    let data = {
      embedURL,
      tags,
      title,
      responses,
      channelURL,
      channelImg,
      follower,
      description,
    };
    collector.push(data);
    return data;
  }
  catch(e) {
    console.error(e);
  }
}


function crawler$1(videoId) {
  return new Promise(async (resolve, reject) => {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          // '--window-size=1920x1080',
        ]
      });
      const page = await browser.newPage();
      let helper = new crawlhelper(browser, page);

      helper.startCheckingCoverage();

      // await page.setRequestInterception(true);
      // page.on('request', (req) => {
      //   // crawlhelper.filterRequestByURL(req);
      //   crawlhelper.filterResources(req);
      // })

      await page.goto(`https://www.youtube.com/watch?v=${videoId}`);

      helper.endCheckingCoverage();

      await helper.waitForSelectors([
        'div#primary div#info h1.ytd-video-primary-info-renderer',
        'div#primary div#info div#top-level-buttons ytd-toggle-button-renderer',
      ]);

      let searchResults = await page.evaluate((stringFunc) => {
        let extractPage = new Function('document', 'collector=[]', `${stringFunc}`);
        let result = [];
        extractPage(document, result);
        return JSON.stringify(result);
      }, [helper.getFuncBody(extractVideo)]);

      await browser.close();
      return resolve(searchResults);
    } catch (e) {
      return reject(e);
    }
  })
}

var crawlVideo = crawler$1;

/**
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
const crawlVideo$1 = (req, res) => {
  let q = req.query;
  crawlVideo(q.id)
    .then(results => {
      res.send(results);
    });
};

var video = crawlVideo$1;

function myRouter(req, res) {
  this.req = req;
  this.res = res;
}

myRouter.prototype.use = function(callback) {
  callback(this.req, this.res);
};

myRouter.prototype.get = function(path, reqHandler) {
  if(this.req.method === 'GET' && this.req.path === path) {
    reqHandler(this.req, this.res);
  }
};

var helper = myRouter;

/**
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
var sweeptube_1 = (req, res) => {
  let router = new helper(req, res);
  router.use((req, res) => {
    req.on('start', () => {console.time('puppeteer');});
    res.on('finish', () => {console.timeEnd('puppeteer');});
  });
  router.get('/search', search);
  router.get('/video', video);
  // router.get('/', res.end())
};

var sweeptube = {
	sweeptube: sweeptube_1
};

exports.default = sweeptube;
exports.sweeptube = sweeptube_1;
