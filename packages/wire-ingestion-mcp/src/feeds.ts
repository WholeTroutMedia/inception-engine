/**
 * Wire Ingestion MCP — Feed Registry
 *
 * ALL the feeds. Every category. Maximum sovereign coverage.
 * All free/public RSS, Atom, and open API endpoints.
 */

import type { FeedSource, WireCategory } from './types.js';

export const ALL_FEEDS: FeedSource[] = [
  // ─────────────────────────────────────────────────────────
  // NEWS WIRES
  // ─────────────────────────────────────────────────────────
  { id: 'ap-top',        name: 'AP Top News',          category: 'news', url: 'https://feeds.apnews.com/rss/apf-topnews',             type: 'rss', intervalSeconds: 60  },
  { id: 'ap-world',      name: 'AP World',             category: 'news', url: 'https://feeds.apnews.com/rss/apf-WorldNews',           type: 'rss', intervalSeconds: 60  },
  { id: 'ap-us',         name: 'AP US News',           category: 'news', url: 'https://feeds.apnews.com/rss/apf-usnews',             type: 'rss', intervalSeconds: 60  },
  { id: 'reuters-world', name: 'Reuters World',        category: 'news', url: 'https://feeds.reuters.com/reuters/worldNews',          type: 'rss', intervalSeconds: 60  },
  { id: 'reuters-us',    name: 'Reuters US',           category: 'news', url: 'https://feeds.reuters.com/reuters/topNews',            type: 'rss', intervalSeconds: 60  },
  { id: 'bbc-world',     name: 'BBC World',            category: 'news', url: 'https://feeds.bbci.co.uk/news/world/rss.xml',         type: 'rss', intervalSeconds: 120 },
  { id: 'bbc-uk',        name: 'BBC UK',               category: 'news', url: 'https://feeds.bbci.co.uk/news/uk/rss.xml',            type: 'rss', intervalSeconds: 120 },
  { id: 'aljazeera',     name: 'Al Jazeera',           category: 'news', url: 'https://www.aljazeera.com/xml/rss/all.xml',           type: 'rss', intervalSeconds: 120 },
  { id: 'npr',           name: 'NPR News',             category: 'news', url: 'https://feeds.npr.org/1001/rss.xml',                  type: 'rss', intervalSeconds: 120 },
  { id: 'guardian-world',name: 'The Guardian World',   category: 'news', url: 'https://www.theguardian.com/world/rss',               type: 'rss', intervalSeconds: 120 },
  { id: 'guardian-us',   name: 'The Guardian US',      category: 'news', url: 'https://www.theguardian.com/us-news/rss',             type: 'rss', intervalSeconds: 120 },
  { id: 'nyt',           name: 'NYT Top Stories',      category: 'news', url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', type: 'rss', intervalSeconds: 120 },
  { id: 'wapo',          name: 'Washington Post',      category: 'news', url: 'https://feeds.washingtonpost.com/rss/national',       type: 'rss', intervalSeconds: 120 },
  { id: 'cnn',           name: 'CNN Top Stories',      category: 'news', url: 'http://rss.cnn.com/rss/cnn_topstories.rss',           type: 'rss', intervalSeconds: 120 },
  { id: 'france24',      name: 'France 24',            category: 'news', url: 'https://www.france24.com/en/rss',                     type: 'rss', intervalSeconds: 180 },
  { id: 'dw',            name: 'Deutsche Welle',       category: 'news', url: 'https://rss.dw.com/rdf/rss-en-all',                  type: 'rss', intervalSeconds: 180 },
  { id: 'rt',            name: 'RT International',     category: 'news', url: 'https://www.rt.com/rss/',                             type: 'rss', intervalSeconds: 180 },
  { id: 'axios',         name: 'Axios',                category: 'news', url: 'https://api.axios.com/feed/',                         type: 'rss', intervalSeconds: 120 },
  { id: 'politico',      name: 'Politico',             category: 'news', url: 'https://www.politico.com/rss/politicopicks.xml',      type: 'rss', intervalSeconds: 120 },
  { id: 'the-hill',      name: 'The Hill',             category: 'news', url: 'https://thehill.com/news/feed/',                      type: 'rss', intervalSeconds: 120 },

  // ─────────────────────────────────────────────────────────
  // SPORTS WIRES
  // ─────────────────────────────────────────────────────────
  { id: 'espn-top',      name: 'ESPN Top',             category: 'sports', url: 'https://www.espn.com/espn/rss/news',                type: 'rss', intervalSeconds: 60  },
  { id: 'espn-nfl',      name: 'ESPN NFL',             category: 'sports', url: 'https://www.espn.com/espn/rss/nfl/news',            type: 'rss', intervalSeconds: 120 },
  { id: 'espn-nba',      name: 'ESPN NBA',             category: 'sports', url: 'https://www.espn.com/espn/rss/nba/news',            type: 'rss', intervalSeconds: 120 },
  { id: 'espn-mlb',      name: 'ESPN MLB',             category: 'sports', url: 'https://www.espn.com/espn/rss/mlb/news',            type: 'rss', intervalSeconds: 120 },
  { id: 'espn-nhl',      name: 'ESPN NHL',             category: 'sports', url: 'https://www.espn.com/espn/rss/nhl/news',            type: 'rss', intervalSeconds: 120 },
  { id: 'espn-soccer',   name: 'ESPN Soccer',          category: 'sports', url: 'https://www.espn.com/espn/rss/soccer/news',         type: 'rss', intervalSeconds: 120 },
  { id: 'espn-golf',     name: 'ESPN Golf',            category: 'sports', url: 'https://www.espn.com/espn/rss/golf/news',           type: 'rss', intervalSeconds: 180 },
  { id: 'espn-tennis',   name: 'ESPN Tennis',          category: 'sports', url: 'https://www.espn.com/espn/rss/tennis/news',         type: 'rss', intervalSeconds: 180 },
  { id: 'espn-mma',      name: 'ESPN MMA',             category: 'sports', url: 'https://www.espn.com/espn/rss/mma/news',            type: 'rss', intervalSeconds: 180 },
  { id: 'bbc-sport',     name: 'BBC Sport',            category: 'sports', url: 'https://feeds.bbci.co.uk/sport/rss.xml',            type: 'rss', intervalSeconds: 120 },
  { id: 'sky-sport',     name: 'Sky Sports',           category: 'sports', url: 'https://www.skysports.com/rss/12040',               type: 'rss', intervalSeconds: 120 },
  { id: 'bleacher',      name: 'Bleacher Report',      category: 'sports', url: 'https://bleacherreport.com/articles/feed',          type: 'rss', intervalSeconds: 120 },
  { id: 'athletic',      name: 'The Athletic',         category: 'sports', url: 'https://theathletic.com/rss-feed/',                 type: 'rss', intervalSeconds: 180 },
  { id: 'nfl-official',  name: 'NFL.com',              category: 'sports', url: 'https://www.nfl.com/rss/rsslanding.html',           type: 'rss', intervalSeconds: 120 },
  { id: 'nba-official',  name: 'NBA.com',              category: 'sports', url: 'https://www.nba.com/rss/nba_rss.xml',              type: 'rss', intervalSeconds: 120 },
  { id: 'mlb-official',  name: 'MLB.com',              category: 'sports', url: 'https://www.mlb.com/feeds/news/rss.xml',            type: 'rss', intervalSeconds: 120 },
  { id: 'nhl-official',  name: 'NHL.com',              category: 'sports', url: 'https://www.nhl.com/rss/news.xml',                  type: 'rss', intervalSeconds: 120 },
  { id: 'f1',            name: 'Formula 1',            category: 'sports', url: 'https://www.formula1.com/content/fom-website/en/latest/all.xml', type: 'rss', intervalSeconds: 180 },
  { id: 'si',            name: 'Sports Illustrated',   category: 'sports', url: 'https://www.si.com/rss/si_topstories.rss',          type: 'rss', intervalSeconds: 180 },

  // ─────────────────────────────────────────────────────────
  // FINANCIAL WIRES
  // ─────────────────────────────────────────────────────────
  { id: 'bloomberg-markets', name: 'Bloomberg Markets', category: 'financial', url: 'https://feeds.bloomberg.com/markets/news.rss',     type: 'rss', intervalSeconds: 60  },
  { id: 'bloomberg-tech',    name: 'Bloomberg Tech',    category: 'financial', url: 'https://feeds.bloomberg.com/technology/news.rss',  type: 'rss', intervalSeconds: 60  },
  { id: 'ft-markets',        name: 'FT Markets',        category: 'financial', url: 'https://www.ft.com/markets?format=rss',            type: 'rss', intervalSeconds: 60  },
  { id: 'wsj-markets',       name: 'WSJ Markets',       category: 'financial', url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',    type: 'rss', intervalSeconds: 60  },
  { id: 'cnbc-top',          name: 'CNBC Top',          category: 'financial', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', type: 'rss', intervalSeconds: 60  },
  { id: 'cnbc-markets',      name: 'CNBC Markets',      category: 'financial', url: 'https://www.cnbc.com/id/15839135/device/rss/rss.html', type: 'rss', intervalSeconds: 60  },
  { id: 'seeking-alpha',     name: 'Seeking Alpha',     category: 'financial', url: 'https://seekingalpha.com/market_currents.xml',     type: 'rss', intervalSeconds: 120 },
  { id: 'marketwatch',       name: 'MarketWatch',       category: 'financial', url: 'https://feeds.marketwatch.com/marketwatch/topstories/', type: 'rss', intervalSeconds: 120 },
  { id: 'yahoo-finance',     name: 'Yahoo Finance',     category: 'financial', url: 'https://finance.yahoo.com/news/rssindex',          type: 'rss', intervalSeconds: 120 },
  { id: 'investing-com',     name: 'Investing.com',     category: 'financial', url: 'https://www.investing.com/rss/news.rss',           type: 'rss', intervalSeconds: 120 },
  { id: 'coindesk',          name: 'CoinDesk',          category: 'financial', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', type: 'rss', intervalSeconds: 60  },
  { id: 'cointelegraph',     name: 'CoinTelegraph',     category: 'financial', url: 'https://cointelegraph.com/rss',                    type: 'rss', intervalSeconds: 60  },
  { id: 'theblock',          name: 'The Block',         category: 'financial', url: 'https://www.theblock.co/rss.xml',                  type: 'rss', intervalSeconds: 60  },
  { id: 'nerdwallet',        name: 'NerdWallet',        category: 'financial', url: 'https://www.nerdwallet.com/blog/feed/',            type: 'rss', intervalSeconds: 300 },
  { id: 'imf-news',          name: 'IMF News',          category: 'financial', url: 'https://www.imf.org/en/News/rss?id=2',             type: 'rss', intervalSeconds: 300 },

  // ─────────────────────────────────────────────────────────
  // SCIENCE WIRES
  // ─────────────────────────────────────────────────────────
  { id: 'arxiv-cs',     name: 'arXiv CS',              category: 'science', url: 'https://export.arxiv.org/rss/cs',                   type: 'rss', intervalSeconds: 300 },
  { id: 'arxiv-astro',  name: 'arXiv Astrophysics',    category: 'science', url: 'https://export.arxiv.org/rss/astro-ph',             type: 'rss', intervalSeconds: 300 },
  { id: 'arxiv-phys',   name: 'arXiv Physics',         category: 'science', url: 'https://export.arxiv.org/rss/physics',              type: 'rss', intervalSeconds: 300 },
  { id: 'arxiv-bio',    name: 'arXiv Biology',         category: 'science', url: 'https://export.arxiv.org/rss/q-bio',                type: 'rss', intervalSeconds: 300 },
  { id: 'arxiv-ai',     name: 'arXiv AI',              category: 'science', url: 'https://export.arxiv.org/rss/cs.AI',                type: 'rss', intervalSeconds: 300 },
  { id: 'pubmed',       name: 'PubMed Latest',         category: 'science', url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/0RWfXNLrHO8lNGGD-OPvNMFpNQbE6qPKHJcCmhFrFu6dpI7Kca/?limit=20&format=rss', type: 'rss', intervalSeconds: 300 },
  { id: 'nasa',         name: 'NASA Breaking News',    category: 'science', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss',    type: 'rss', intervalSeconds: 180 },
  { id: 'nasa-jpl',     name: 'NASA JPL News',         category: 'science', url: 'https://www.jpl.nasa.gov/rss/news.xml',             type: 'rss', intervalSeconds: 300 },
  { id: 'nature',       name: 'Nature',                category: 'science', url: 'https://www.nature.com/nature.rss',                 type: 'rss', intervalSeconds: 300 },
  { id: 'science-mag',  name: 'Science Magazine',      category: 'science', url: 'https://www.science.org/rss/news_current.xml',      type: 'rss', intervalSeconds: 300 },
  { id: 'sciencedaily', name: 'ScienceDaily',          category: 'science', url: 'https://www.sciencedaily.com/rss/all.xml',          type: 'rss', intervalSeconds: 180 },
  { id: 'new-scientist',name: 'New Scientist',         category: 'science', url: 'https://www.newscientist.com/feed/home/',           type: 'rss', intervalSeconds: 180 },
  { id: 'phys-org',     name: 'Phys.org',              category: 'science', url: 'https://phys.org/rss-feed/',                        type: 'rss', intervalSeconds: 180 },
  { id: 'space-com',    name: 'Space.com',             category: 'science', url: 'https://www.space.com/feeds/all',                   type: 'rss', intervalSeconds: 180 },
  { id: 'nih',          name: 'NIH News',              category: 'science', url: 'https://www.nih.gov/news-events/news-releases/feed/', type: 'rss', intervalSeconds: 300 },
  { id: 'eurekalert',   name: 'EurekAlert',            category: 'science', url: 'https://www.eurekalert.org/rss.xml',                type: 'rss', intervalSeconds: 300 },

  // ─────────────────────────────────────────────────────────
  // LITERARY WIRES
  // ─────────────────────────────────────────────────────────
  { id: 'literary-hub',    name: 'Literary Hub',         category: 'literary', url: 'https://lithub.com/feed/',                       type: 'rss', intervalSeconds: 300 },
  { id: 'pub-weekly',      name: "Publishers Weekly",    category: 'literary', url: 'https://www.publishersweekly.com/pw/feeds/index.html', type: 'rss', intervalSeconds: 300 },
  { id: 'nyt-books',       name: 'NYT Books',            category: 'literary', url: 'https://rss.nytimes.com/services/xml/rss/nyt/Books.xml', type: 'rss', intervalSeconds: 300 },
  { id: 'guardian-books',  name: 'Guardian Books',       category: 'literary', url: 'https://www.theguardian.com/books/rss',          type: 'rss', intervalSeconds: 300 },
  { id: 'the-millions',    name: 'The Millions',         category: 'literary', url: 'https://themillions.com/feed',                   type: 'rss', intervalSeconds: 300 },
  { id: 'booklist',        name: 'Booklist Online',      category: 'literary', url: 'https://www.booklistonline.com/rss.aspx',        type: 'rss', intervalSeconds: 600 },
  { id: 'np-review',       name: 'New York Review of Books', category: 'literary', url: 'https://www.nybooks.com/feed/',              type: 'rss', intervalSeconds: 600 },
  { id: 'paris-review',    name: 'The Paris Review',     category: 'literary', url: 'https://www.theparisreview.org/feed/',           type: 'rss', intervalSeconds: 600 },
  { id: 'tor-com',         name: 'Tor.com',              category: 'literary', url: 'https://www.tor.com/feed/',                      type: 'rss', intervalSeconds: 300 },
  { id: 'book-riot',       name: 'Book Riot',            category: 'literary', url: 'https://bookriot.com/feed/',                     type: 'rss', intervalSeconds: 300 },
  { id: 'electric-lit',    name: 'Electric Literature',  category: 'literary', url: 'https://electricliterature.com/feed/',           type: 'rss', intervalSeconds: 600 },

  // ─────────────────────────────────────────────────────────
  // TECH WIRES
  // ─────────────────────────────────────────────────────────
  { id: 'hn',             name: 'Hacker News Best',     category: 'tech', url: 'https://hnrss.org/best',                             type: 'rss', intervalSeconds: 60  },
  { id: 'hn-new',         name: 'Hacker News Newest',   category: 'tech', url: 'https://hnrss.org/newest',                          type: 'rss', intervalSeconds: 60  },
  { id: 'techcrunch',     name: 'TechCrunch',           category: 'tech', url: 'https://techcrunch.com/feed/',                      type: 'rss', intervalSeconds: 120 },
  { id: 'ars-technica',   name: 'Ars Technica',         category: 'tech', url: 'https://feeds.arstechnica.com/arstechnica/index',   type: 'rss', intervalSeconds: 120 },
  { id: 'the-verge',      name: 'The Verge',            category: 'tech', url: 'https://www.theverge.com/rss/index.xml',            type: 'rss', intervalSeconds: 120 },
  { id: 'wired',          name: 'WIRED',                category: 'tech', url: 'https://www.wired.com/feed/rss',                    type: 'rss', intervalSeconds: 120 },
  { id: 'mit-tech',       name: 'MIT Tech Review',      category: 'tech', url: 'https://www.technologyreview.com/feed/',            type: 'rss', intervalSeconds: 180 },
  { id: 'engadget',       name: 'Engadget',             category: 'tech', url: 'https://www.engadget.com/rss.xml',                  type: 'rss', intervalSeconds: 120 },
  { id: 'gizmodo',        name: 'Gizmodo',              category: 'tech', url: 'https://gizmodo.com/rss',                           type: 'rss', intervalSeconds: 120 },
  { id: 'macrumors',      name: 'MacRumors',            category: 'tech', url: 'https://feeds.macrumors.com/MacRumors-All',         type: 'rss', intervalSeconds: 120 },
  { id: 'daring-fireball',name: 'Daring Fireball',      category: 'tech', url: 'https://daringfireball.net/feeds/main',             type: 'rss', intervalSeconds: 180 },
  { id: 'slashdot',       name: 'Slashdot',             category: 'tech', url: 'https://rss.slashdot.org/Slashdot/slashdotMain',   type: 'rss', intervalSeconds: 180 },
  { id: 'zdnet',          name: 'ZDNet',                category: 'tech', url: 'https://www.zdnet.com/news/rss.xml',                type: 'rss', intervalSeconds: 180 },
  { id: 'venturebeat',    name: 'VentureBeat',          category: 'tech', url: 'https://venturebeat.com/feed/',                    type: 'rss', intervalSeconds: 180 },
  { id: 'product-hunt',   name: 'Product Hunt',         category: 'tech', url: 'https://www.producthunt.com/feed',                 type: 'rss', intervalSeconds: 300 },

  // ─────────────────────────────────────────────────────────
  // GOVERNMENT / LAW WIRES
  // ─────────────────────────────────────────────────────────
  { id: 'whitehouse',     name: 'White House',          category: 'government', url: 'https://www.whitehouse.gov/feed/',                type: 'rss', intervalSeconds: 300 },
  { id: 'fed-register',   name: 'Federal Register',     category: 'government', url: 'https://www.federalregister.gov/documents/current.xml', type: 'rss', intervalSeconds: 300 },
  { id: 'congress-gov',   name: 'Congress.gov Bills',   category: 'government', url: 'https://www.congress.gov/rss/featured-legislation.xml', type: 'rss', intervalSeconds: 600 },
  { id: 'scotus',         name: 'SCOTUS Blog',          category: 'government', url: 'https://www.scotusblog.com/feed/',                type: 'rss', intervalSeconds: 300 },
  { id: 'doj',            name: 'DOJ Press',            category: 'government', url: 'https://www.justice.gov/news/rss',               type: 'rss', intervalSeconds: 300 },
  { id: 'sec',            name: 'SEC News',             category: 'government', url: 'https://www.sec.gov/rss/news/press.xml',          type: 'rss', intervalSeconds: 300 },
  { id: 'un-news',        name: 'UN News',              category: 'government', url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml', type: 'rss', intervalSeconds: 300 },
  { id: 'eu-parliament',  name: 'EU Parliament',        category: 'government', url: 'https://www.europarl.europa.eu/rss/doc/press-service/en.rss', type: 'rss', intervalSeconds: 600 },
  { id: 'nato',           name: 'NATO News',            category: 'government', url: 'https://www.nato.int/cps/en/natohq/rss.xml',      type: 'rss', intervalSeconds: 600 },

  // ─────────────────────────────────────────────────────────
  // ENTERTAINMENT WIRES
  // ─────────────────────────────────────────────────────────
  { id: 'variety',        name: 'Variety',              category: 'entertainment', url: 'https://variety.com/feed/',                  type: 'rss', intervalSeconds: 180 },
  { id: 'hollywood-rep',  name: 'Hollywood Reporter',   category: 'entertainment', url: 'https://www.hollywoodreporter.com/feed/',    type: 'rss', intervalSeconds: 180 },
  { id: 'deadline',       name: 'Deadline Hollywood',   category: 'entertainment', url: 'https://deadline.com/feed/',                 type: 'rss', intervalSeconds: 180 },
  { id: 'billboard',      name: 'Billboard',            category: 'entertainment', url: 'https://www.billboard.com/feed/',            type: 'rss', intervalSeconds: 180 },
  { id: 'rolling-stone',  name: 'Rolling Stone',        category: 'entertainment', url: 'https://www.rollingstone.com/feed/',         type: 'rss', intervalSeconds: 180 },
  { id: 'pitchfork',      name: 'Pitchfork',            category: 'entertainment', url: 'https://pitchfork.com/feed/feed-news/rss/', type: 'rss', intervalSeconds: 180 },
  { id: 'entertainment',  name: 'EW',                   category: 'entertainment', url: 'https://ew.com/feed/',                       type: 'rss', intervalSeconds: 180 },
  { id: 'consequence',    name: 'Consequence of Sound', category: 'entertainment', url: 'https://consequence.net/feed/',              type: 'rss', intervalSeconds: 300 },
  { id: 'stereogum',      name: 'Stereogum',            category: 'entertainment', url: 'https://www.stereogum.com/feed/',            type: 'rss', intervalSeconds: 300 },
  { id: 'imdb-news',      name: 'IMDb News',            category: 'entertainment', url: 'https://www.imdb.com/news/top/?ref_=nv_nw_tp1_0/rss', type: 'rss', intervalSeconds: 300 },
  { id: 'av-club',        name: 'AV Club',              category: 'entertainment', url: 'https://www.avclub.com/rss',                 type: 'rss', intervalSeconds: 300 },

  // ─────────────────────────────────────────────────────────
  // HEALTH / MEDICAL WIRES
  // ─────────────────────────────────────────────────────────
  { id: 'who',            name: 'WHO News',             category: 'health', url: 'https://www.who.int/rss-feeds/news-english.xml',    type: 'rss', intervalSeconds: 300 },
  { id: 'cdc',            name: 'CDC Newsroom',         category: 'health', url: 'https://tools.cdc.gov/api/v2/resources/media/132608.rss', type: 'rss', intervalSeconds: 300 },
  { id: 'nih-news',       name: 'NIH Health',           category: 'health', url: 'https://medlineplus.gov/xml/mplus_topics.xml',      type: 'rss', intervalSeconds: 300 },
  { id: 'medrxiv',        name: 'medRxiv',              category: 'health', url: 'https://connect.medrxiv.org/medrxiv_xml.php?subject=all', type: 'rss', intervalSeconds: 300 },
  { id: 'stat-news',      name: 'STAT News',            category: 'health', url: 'https://www.statnews.com/feed/',                   type: 'rss', intervalSeconds: 180 },
  { id: 'health-affairs', name: 'Health Affairs',       category: 'health', url: 'https://www.healthaffairs.org/action/showFeed?type=etoc&feed=rss&jc=hlthaff', type: 'rss', intervalSeconds: 600 },
  { id: 'medscape',       name: 'Medscape',             category: 'health', url: 'https://www.medscape.com/cx/rssfeeds/2685-8303.xml', type: 'rss', intervalSeconds: 300 },
  { id: 'webmd',          name: 'WebMD Health',         category: 'health', url: 'https://rssfeeds.webmd.com/rss/rss.aspx?RSSSource=RSS_PUBLIC', type: 'rss', intervalSeconds: 300 },
  { id: 'nejm',           name: 'NEJM',                 category: 'health', url: 'https://www.nejm.org/action/showFeed?jc=nejmoa&type=etoc&feed=rss', type: 'rss', intervalSeconds: 600 },
  { id: 'lancet',         name: 'The Lancet',           category: 'health', url: 'https://www.thelancet.com/rssfeed/lancet_online.xml', type: 'rss', intervalSeconds: 600 },

  // ─────────────────────────────────────────────────────────
  // BUSINESS WIRES
  // ─────────────────────────────────────────────────────────
  { id: 'hbr',            name: 'Harvard Business Review', category: 'business', url: 'https://feeds.hbr.org/harvardbusiness',        type: 'rss', intervalSeconds: 300 },
  { id: 'fast-company',   name: 'Fast Company',         category: 'business', url: 'https://www.fastcompany.com/latest/rss',          type: 'rss', intervalSeconds: 180 },
  { id: 'inc',            name: 'Inc Magazine',         category: 'business', url: 'https://www.inc.com/rss',                         type: 'rss', intervalSeconds: 180 },
  { id: 'entrepreneur',   name: 'Entrepreneur',         category: 'business', url: 'https://www.entrepreneur.com/latest.rss',         type: 'rss', intervalSeconds: 300 },
  { id: 'fortune',        name: 'Fortune',              category: 'business', url: 'https://fortune.com/feed/',                       type: 'rss', intervalSeconds: 180 },
  { id: 'business-insider',name: 'Business Insider',    category: 'business', url: 'https://feeds.businessinsider.com/businessinsider/top', type: 'rss', intervalSeconds: 120 },
  { id: 'quartz',         name: 'Quartz',               category: 'business', url: 'https://qz.com/rss',                              type: 'rss', intervalSeconds: 180 },
  { id: 'protocol',       name: 'Protocol',             category: 'business', url: 'https://www.protocol.com/rss.xml',                type: 'rss', intervalSeconds: 300 },
  { id: 'morningbrew',    name: 'Morning Brew',         category: 'business', url: 'https://www.morningbrew.com/daily/rss',           type: 'rss', intervalSeconds: 300 },
];

/** Get feeds by category */
export function getFeedsByCategory(category: WireCategory): FeedSource[] {
  return ALL_FEEDS.filter(f => f.category === category);
}

/** Total feed count */
export const FEED_COUNT = ALL_FEEDS.length;
