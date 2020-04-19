/* This gets a video info */

const puppeteer = require('puppeteer');
const crawlhelper = require('./crawlhelper');

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
    }, {})
    
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
    }
    collector.push(data);
    return data;
  }
  catch(e) {
    console.error(e);
  }
}


function crawler(videoId) {
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
      ])

      let searchResults = await page.evaluate((stringFunc) => {
        let extractPage = new Function('document', 'collector=[]', `${stringFunc}`);
        let result = [];
        extractPage(document, result);
        return JSON.stringify(result);
      }, [helper.getFuncBody(extractVideo)])

      await browser.close();
      return resolve(searchResults);
    } catch (e) {
      return reject(e);
    }
  })
}

module.exports = crawler;