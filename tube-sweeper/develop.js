const gFunction = require('./index');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

app.use((req, res, next) => {
  console.time('puppeteer')
  res.on('finish', () => {
    console.timeEnd('puppeteer')
  })
  next();
})

app.use(gFunction.sweeptube)


app.listen(PORT, () => {
  console.log(`started server on ${PORT}`)
})