import express from "express";
import { HttpUtil } from "../utils/http.util";
import { XMLParser } from "fast-xml-parser";

const uri = "https://www.everquest2.com/rss";
const timeout = 5000;

async function fetchNewsData(url: string): Promise<any> {
    const text = await HttpUtil.delayFetch(url, { delay: 500, retries: 3})
        .then((res) => res.text())
    const xml = new XMLParser().parse(text);

    return { content: ''};
}

async function convertToRSS(rawRDF: string): Promise<string> {
    const xml = new XMLParser().parse(rawRDF);
    console.log(xml);
    const channelXml = xml["rdf:RDF"].channel;

    const channelTitle = channelXml.title;
    const channelLink = channelXml.link;
    const channelDescription = channelXml.description || 'Official Everquest 2 News';
    const channelItems = channelXml.item;

    var itemXml = '';
    console.log(channelItems);
    for (const item of channelItems) {
        const itemTitle = item.title.trim();
        const itemLink = item.link.trim();
        const newsData = await fetchNewsData(itemLink);
        const itemPublishDate = newsData.publishDate;
        const itemContent = newsData.content.trim();
        itemXml = `
        <item>
            <title>${itemTitle}</title>
            <link>${itemLink}</link>
            <pubDate>${itemPublishDate}</pubDate>
            <content:encoded><![CDATA[${itemContent}]]></content:encoded>
        </item>
        `;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0" xmlns:cc="http://cyber.law.harvard.edu/rss/creativeCommonsRssModule.html">
<channel>
<title>${channelTitle}</title>
<description>${channelDescription}</description>
<link>${channelLink}</link>
<generator>eq2rdf</generator>
${itemXml}
</channel>
</rss>
`;
}

export async function rss(request: express.Request, response: express.Response) {
    console.log("GET /rss");

    await HttpUtil.delayFetch(uri, { delay: 500, retries: 3 } )
        .then((res) => res.text() )
        .then(async (text) => {
            const rss = await convertToRSS(text);

            response.contentType("text/xml; charset=UTF-8").send(rss);
        })
        .catch((error) => {
            console.log(error);
            response.status(500).end();
        })
}
