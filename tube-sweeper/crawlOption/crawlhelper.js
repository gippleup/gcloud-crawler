class CrawlHelper {
  constructor(browser, page) {
    this.browser = browser
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
    let stringFunc = func.toString()
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
    ]

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
    ]
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
    console.log(`Bytes total: ${totalBytes / 1024 / 1024}`)
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



module.exports = CrawlHelper;