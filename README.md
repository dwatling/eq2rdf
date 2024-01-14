# EQ2RDF

Converts EQ2's RDF news feed (https://www.everquest2.com/rss) into an RSS2-compatible feed.

This will allow it to be imported correctly into RSS readers such as FreshRSS (https://www.freshrss.org).

URLs to know:
- *HOST*:8080/rss - Main RSS feed (includes all cached articles)
- *HOST*:8080/cache - Begins caching ALL news entries

NOTE: Some articles will not render a link to the previous article even though it should. I suspect this is an attempt to throttle scrapers such as this. So, when triggering the "/cache" URL, you may have to delete the cache entry and try again.