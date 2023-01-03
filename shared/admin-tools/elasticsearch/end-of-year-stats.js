const createApplicationContext = require('../../../web-api/src/applicationContext');
const fs = require('fs');
const { computeDate } = require('../../src/business/utilities/DateHandler');
const { search } = require('../../src/persistence/elasticsearch/searchClient');

const fiscalYear = process.argv[2] || new Date().getFullYear();

const startOfYear = computeDate({
  day: 1,
  month: 10,
  year: parseInt(fiscalYear) - 1,
});
const endOfYear = computeDate({
  day: 1,
  month: 10,
  year: parseInt(fiscalYear),
});

const fiscalYearDateRange = {
  gte: startOfYear,
  lt: endOfYear,
};

const receivedAtRange = {
  range: {
    'receivedAt.S': fiscalYearDateRange,
  },
};

const suffixAggregation = {
  'by-suffix': {
    terms: {
      field: 'docketNumberSuffix.S',
    },
  },
  'no-suffix': {
    missing: {
      field: 'docketNumberSuffix.S',
    },
  },
};

const getOpinionsFiledByCaseType = async ({ applicationContext }) => {
  const results = await search({
    applicationContext,
    searchParameters: {
      body: {
        query: {
          bool: {
            must: [
              {
                terms: {
                  'eventCode.S': ['MOP', 'OST', 'SOP', 'TCOP'],
                },
              },
              receivedAtRange,
            ],
          },
        },
      },
      index: 'efcms-docket-entry',
      size: 20000,
    },
  });
  let opinionsFiledByCaseType = {};
  for (const hit of results.results) {
    const docketNumberSuffix =
      (await determineDocketNumberSuffix({
        applicationContext,
        docketNumber: hit.docketNumber,
      })) || 'Regular';
    if (!(docketNumberSuffix in opinionsFiledByCaseType)) {
      opinionsFiledByCaseType[docketNumberSuffix] = 0;
    }
    opinionsFiledByCaseType[docketNumberSuffix]++;
  }
  const rows = [];
  for (const suffix in opinionsFiledByCaseType) {
    rows.push([suffix, opinionsFiledByCaseType[suffix]].join(','));
  }
  fs.writeFileSync(
    `./FY-${fiscalYear}-opinions-filed-by-case-type.csv`,
    rows.join('\n'),
  );
};

const getCasesOpenedAndClosed = async ({ applicationContext }) => {
  const { count: totalFiled } = await applicationContext
    .getSearchClient()
    .count({
      body: {
        query: receivedAtRange,
      },
      index: 'efcms-case',
    });

  const { count: totalClosed } = await applicationContext
    .getSearchClient()
    .count({
      body: {
        query: {
          range: {
            'closedDate.S': fiscalYearDateRange,
          },
        },
      },
      index: 'efcms-case',
    });

  const rows = [];
  rows.push(['Closed', totalClosed].join(','));
  rows.push(['Filed', totalFiled].join(','));
  fs.writeFileSync(
    `./FY-${fiscalYear}-cases-filed-and-closed.csv`,
    rows.join('\n'),
  );
};

const getCasesFiledByType = async ({ applicationContext }) => {
  const results = await applicationContext.getSearchClient().search({
    body: {
      aggs: suffixAggregation,
      query: receivedAtRange,
    },
    index: 'efcms-case',
  });

  const rows = results.aggregations['by-suffix'].buckets.map(
    ({ doc_count, key }) => [key, doc_count].join(','),
  );
  rows.push(['Regular', results.aggregations['no-suffix'].doc_count].join(','));
  rows.unshift(['Type', 'Count'].join(','));
  fs.writeFileSync(
    `./FY-${fiscalYear}-cases-filed-by-type.csv`,
    rows.join('\n'),
  );
};

const determineDocketNumberSuffix = async ({
  applicationContext,
  docketNumber,
}) => {
  const result = await search({
    applicationContext,
    searchParameters: {
      body: {
        query: {
          bool: {
            must: [
              {
                term: {
                  'docketNumber.S': docketNumber,
                },
              },
            ],
          },
        },
      },
      index: 'efcms-case',
    },
  });
  return result.results[0].docketNumberSuffix;
};

const getTotalOpenCasesEOY = async ({ applicationContext }) => {
  const { count: currentOpenCount } = await applicationContext
    .getSearchClient()
    .count({
      body: {
        query: {
          bool: {
            must_not: {
              term: {
                'status.S': 'Closed',
              },
            },
          },
        },
      },
      index: 'efcms-case',
    });

  const { count: numberOpenedSinceEOY } = await applicationContext
    .getSearchClient()
    .count({
      body: {
        query: {
          range: {
            'receivedAt.S': {
              gte: endOfYear,
            },
          },
        },
      },
      index: 'efcms-case',
    });

  const { count: numberClosedSinceEOY } = await applicationContext
    .getSearchClient()
    .count({
      body: {
        query: {
          bool: {
            must: [
              {
                range: {
                  'closedDate.S': {
                    gte: endOfYear,
                  },
                },
              },
              {
                range: {
                  'receivedAt.S': {
                    lt: endOfYear,
                  },
                },
              },
            ],
          },
        },
      },
      index: 'efcms-case',
    });

  const numberOfCasesOpenAtEOY =
    currentOpenCount - numberOpenedSinceEOY + numberClosedSinceEOY;

  const rows = [];
  rows.push(['Current Open Cases', currentOpenCount].join(','));
  rows.push(['Cases Opened since EOY', numberOpenedSinceEOY].join(','));
  rows.push(['Cases Closed since EOY', numberClosedSinceEOY].join(','));
  rows.push(['Total Cases Open at EOY', numberOfCasesOpenAtEOY].join(','));

  fs.writeFileSync(
    `./FY-${fiscalYear}-cases-open-at-end-of-fiscal-year.csv`,
    rows.join('\n'),
  );
};

const getPercentageOfCasesInWhichPetitionerIsRepresented = async ({
  applicationContext,
}) => {
  const results = await applicationContext.getSearchClient().search({
    body: {
      aggs: {
        'pro-se': {
          missing: {
            field: 'privatePractitioners.L.M.userId.S',
          },
        },
        represented: {
          filter: {
            exists: {
              field: 'privatePractitioners.L.M.userId.S',
            },
          },
        },
      },
      query: receivedAtRange,
    },
    index: 'efcms-case',
  });

  const proSeCount = results.aggregations['pro-se'].doc_count;
  const representedCount = results.aggregations.represented.doc_count;
  const rows = [];
  rows.push(['Type', 'Count'].join(','));
  rows.push(['Pro Se', proSeCount].join(','));
  rows.push(['Represented', representedCount].join(','));
  fs.writeFileSync(
    `./FY-${fiscalYear}-cases-by-representation.csv`,
    rows.join('\n'),
  );
};

const getPercentageOfCasesElectronicallyFiled = async ({
  applicationContext,
}) => {
  const labels = ['Electronic', 'Paper'];

  const results_count = await applicationContext.getSearchClient().count({
    body: {
      query: receivedAtRange,
    },
    index: 'efcms-case-v2',
  });

  const results = await applicationContext.getSearchClient().search({
    body: {
      aggs: {
        'is-paper': {
          terms: {
            field: 'isPaper.BOOL',
          },
        },
      },
      query: receivedAtRange,
    },
    index: 'efcms-case-v2',
  });

  const rows = results.body.aggregations['is-paper'].buckets.map(
    ({ doc_count, key }) => {
      const pct =
        Math.floor(
          (parseInt(doc_count) / parseInt(results_count.body.count)) * 10000,
        ) / 100;
      return [labels[key], doc_count, pct].join(',');
    },
  );
  rows.unshift('Type,Count,Percentage');
  fs.writeFileSync(`./FY-${fiscalYear}-cases-is-paper.csv`, rows.join('\n'));
};

const getLimitedEntryOfAppearances = async ({ applicationContext }) => {
  // get all of the cases where an LEA was filed
  const res = await applicationContext.getSearchClient().search({
    body: {
      _source: ['docketNumber.S', 'filingDate.S'],
      query: {
        bool: {
          must: [
            {
              term: {
                'eventCode.S': 'LEA',
              },
            },
            {
              range: {
                'filingDate.S': fiscalYearDateRange,
              },
            },
          ],
          must_not: [
            {
              term: {
                'isStricken.BOOL': true,
              },
            },
          ],
        },
      },
      size: 10000,
    },
  });

  const rows = ['Docket Number,Suffix,Is Small,Is NOC Filed'];

  // for each of these, check to see "a notice of completion" was filed
  for (let i = 0; i < res.body.hits.hits.length; i++) {
    const hit = res.body.hits.hits[i];
    const docketNumber = hit['_source'].docketNumber.S;
    const isNocFiled = await checkIfNOCIsFiled({
      applicationContext,
      docketNumber,
      startRange: hit['_source'].filingDate.S,
    });
    const docketNumberSuffix = await getDocketNumberSuffix({
      applicationContext,
      docketNumber,
    });

    const isSmall =
      ['S', 'SL'].indexOf(docketNumberSuffix) === -1 ? 'No' : 'Yes';

    rows.push(
      [docketNumber, docketNumberSuffix, isSmall, isNocFiled].join(','),
    );
  }
  // console.log(rows);
  fs.writeFileSync(`./FY-${fiscalYear}-lea-report.csv`, rows.join('\n'));
};

const getDocketNumberSuffix = async ({ applicationContext, docketNumber }) => {
  const res = await applicationContext.getSearchClient().search({
    body: {
      _source: ['docketNumberSuffix.S'],
      query: {
        term: {
          'docketNumber.S': docketNumber,
        },
      },
    },
  });
  // console.log(res.body.hits.hits);

  return res.body.hits.hits[0]['_source'].docketNumberSuffix?.S || '';
};

const checkIfNOCIsFiled = async ({
  applicationContext,
  docketNumber,
  startRange,
}) => {
  const res = await applicationContext.getSearchClient().count({
    body: {
      query: {
        bool: {
          must: [
            {
              term: {
                'eventCode.S': 'NOC',
              },
            },
            {
              term: {
                'docketNumber.S': docketNumber,
              },
            },
            {
              range: {
                'filingDate.S': {
                  gte: startRange,
                  lt: fiscalYearDateRange.lt,
                },
              },
            },
          ],
        },
      },
    },
  });

  return res.body.count === 0 ? 'No' : 'Yes';
};

(async () => {
  const applicationContext = createApplicationContext({});
  await getOpinionsFiledByCaseType({
    applicationContext,
  });
  await getCasesOpenedAndClosed({
    applicationContext,
  });
  await getCasesFiledByType({
    applicationContext,
  });
  await getTotalOpenCasesEOY({
    applicationContext,
  });
  await getPercentageOfCasesInWhichPetitionerIsRepresented({
    applicationContext,
  });
  await getPercentageOfCasesElectronicallyFiled({ applicationContext });
  await getLimitedEntryOfAppearances({ applicationContext });
})();
