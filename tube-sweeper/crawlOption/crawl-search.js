/* This gets first 100 videos for the query in order of relevance */

const puppeteer = require('puppeteer');
const crawlhelper = require('./crawlhelper');

function extractThread(thread, collector = []) {
  let thumbnailPart = thread.querySelector('ytd-thumbnail > a#thumbnail');
  let videoURL = thumbnailPart.href;
  let embedURL = videoURL.replace('watch?v=', 'embed/');
  let videoId = videoURL.slice(videoURL.indexOf('watch?v=') + 8, videoURL.length);
  let thumbnailURL = thumbnailPart.querySelector('img#img').src;
  let videoLengthSelector = 'ytd-thumbnail-overlay-time-status-renderer > span';
  let videoLength = (() => {
    let el = thumbnailPart.querySelector(videoLengthSelector)
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
    let el = textPart.querySelector('#description-text')
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
  }

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
      })
  
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
      }, helper.getFuncBody(extractThread), itemCount)
      await browser.close();
      return resolve(searchResults);
    } catch (e) {
      return reject(e);
    }
  })
}

module.exports = crawler;