import * as fetch from 'node-fetch';
import * as R from 'ramda';
import * as L from 'partial.lenses';
// import * as urlTools from 'url';
import * as cheerio from 'cheerio';
// https://github.com/agentcooper/albert-heijn/blob/master/index.js
import { KafkaStreams as KStreams } from 'kafka-streams';
// import * as config from 'kafka-streams/test/test-config.js';
import { config } from './kafka-config';
// ^ groupId? clientName?

const log = console.log.bind(console);

// AH

// scrape

// const getJSONUrl = (url) => {
//   const { pathname } = urlTools.parse(url);
//   return `https://www.ah.nl/service/rest/delegate?url=${encodeURIComponent(pathname)}`;
// }
// const getPath = (url) => urlTools.parse(url).pathname;
const getJSONUrl = R.pipe(
    // getPath, // -> strips https://www.ah.nl
    encodeURIComponent,
    (url) => `https://www.ah.nl/service/rest/delegate?url=${url}`,
);

const scrape = (url: string) => fetch(url)
.then((resp: Response) => {
  if (resp.status >= 400) {
    throw new Error(`Bad response (${resp.status})`);
  }
  return resp.json();
})

const scrapeProd = R.pipe(getJSONUrl, scrape);

// kafka

const kafka = new KStreams(config);
// operators: https://github.com/nodefluent/kafka-streams#operator-implementations
// most.js api: https://github.com/cujojs/most/blob/master/docs/api.md

// TODO: create
const stream = kafka.getKStream("my-input-topic");
stream
    // v string to key-value object; args: delimiter, key-index, value-index
    // .mapStringToKV(" ", 0, 1)
    // .sumByKey("key", "value", "sum")
    // .map(kv => kv.key + " " + kv.sum)
    // .tap(kv => console.log(kv))
    // .to("my-output-topic");
stream.start();
// setTimeout(kafka.closeAll.bind(kafka), 5000); //consume for 5 seconds

// nav

const unwrap = ['_embedded', 'lanes'];
const byType = L.modifyOp(R.pipe(R.map(x => [R.prop('type')(x), x]), <any> R.fromPairs)); // L.normalize?
// const getTypes = L.modify(unwrap, byType);
const getTypes = [unwrap, byType];

// lenses!
// /producten
const handleRoot = L.collect([getTypes, 'ProductCategoryNavigationLane',
    '_embedded', 'items', L.elems, 'navItem', 'link', 'href']);
// /producten/aardappel-groente-fruit
const handleCat = L.collect([getTypes, 'FilterLane', '_embedded',
    'items', 0, '_embedded', 'filters', L.find(R.whereEq({ label: 'Soort' })),
    // ^ unavailable in leaf cats
    '_embedded', 'filterItems', L.elems, 'navItem', 'link', 'href']);
// if a cat has no sub-cats...
const handleLeaf = L.collect([
  getTypes, 'ProductLane', '_embedded', 'items', L.elems,
    'foldOutChannelId', // wi128875 -> /producten/product/wi128875/
    // 'navItem', 'link', 'href', // /producten/product/wi128875/ah-trostomaten
]);

const parseNutrients = (str: string) => {
  const html = str
  .replace(/\[/g, '<')
  .replace(/\]/g, '>')

  const $ = cheerio.load(html);
  let labels = $('tr > td:nth-of-type(1)').map(log)
  let values = $('tr > td:nth-of-type(2)').map(log)
  let nutrients = R.zipObj(labels, values)
  let unit = $('tr > th:nth-of-type(2)')
  return { unit, nutrients };

  // return new Promise(resolve => {
  //   jsdom.env(html, [], (err, window) => {
  //     const { document } = window;
  //     const labels = parseColumn(document.querySelectorAll('tr > td:nth-of-type(1)'));
  //     const values = parseColumn(document.querySelectorAll('tr > td:nth-of-type(2)'));
  //     resolve(zipObject(labels, values));
  //   });
  // });
}

const handleProduct = (o) => ({ product: getInfo(o), nutrients: getNutrients(o) });

// nutrients
const getNutrients = L.modify([unwrap, { type: 'Story' }, '_embedded',
    'sections', 0, '_embedded', 'content', L.find(R.pipe(JSON.stringify,
    R.contains('Eiwitten'))), 'text', 'body'], parseNutrients);

// product info
const getInfo = L.get([getTypes, 'ProductDetailLane', 0,
  // 'foldOutChannelId',
  '_embedded', 'product',
  L.props([
    'brandName',
    'availability', //'orderable',
    'id',
    'description',
    'details', //'unitOfUseSize',
    'unitSize',
    'priceLabel',
      // 'now',
      // 'was'?,
  ]),
]);
