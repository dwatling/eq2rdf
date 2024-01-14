import express from "express";
import { HttpUtil } from "../utils/http.util";
import { FileUtil } from "../utils/file.util";
import { XMLParser } from "fast-xml-parser";
import { parse } from "node-html-parser";
import * as fs from "fs";

const uri = "https://www.everquest2.com/rss";

/**
 * Will cache URL to disk (if it doesn't already exist) then add and entry to the RSS timestamp <-> article dictionary file.
 * 
 * @param url - Article to process
 */
async function cacheArticle(url: string): Promise<any> {
    const pathSegments = url.split("/");
    const lastPathSegment = pathSegments[pathSegments.length - 1];

    if (!FileUtil.exists(`./cache/${lastPathSegment}.html`)) {
        const text = await HttpUtil.delayFetch(url, { delay: 500, retries: 3})
            .then((res) => res.text())
        FileUtil.write(`./cache/${lastPathSegment}.html`, "<base href='https://www.everquest2.com'>\r\n" + text.trim());
    }

    const html = parse(FileUtil.read(`./cache/${lastPathSegment}.html`) || '');
    const sortedNews = new Map(Object.entries(JSON.parse(FileUtil.read("./cache/!sort.json"))));

    const articlePublishDateNode = html.querySelector("head")?.querySelector("meta[property='article:published_time']");
    const articlePublishDate = articlePublishDateNode?.attributes["content"];

    if (articlePublishDate) {
        sortedNews.set(articlePublishDate, lastPathSegment);
    }   

    const sorted = new Map([... sortedNews.entries()].sort((a, b) => -a[0].localeCompare(b[0])));
    FileUtil.write("./cache/!sort.json", JSON.stringify(Object.fromEntries(sorted), undefined, 2));
}

/**
 * This will convert HTML data from the server into a data object for use w/ the RSS response.
 * 
 * Meaning, HTML is streamlined to just include the content (minus social and navigation links) and also send back
 * the title of the article.
 * 
 * @param data HTML data from server
 * @returns Object containing: pubDate, title, and content
 */
async function processHtml(data: string): Promise<any> {
    const html = parse(data);
    const article = html.querySelector("#newsArticle")?.querySelector(".container-fluid");
    const shareNodes = article?.querySelectorAll(".share") || [];
    for (const shareNode of shareNodes) {
        article?.removeChild(shareNode);
    }
    const bottomNavNode = article?.querySelector(".article-bottom-nav");
    if (bottomNavNode) {
        article?.removeChild(bottomNavNode);
    }

    const articlePublishDateNode = html.querySelector("head")?.querySelector("meta[property='article:published_time']");
    const articlePublishDate = articlePublishDateNode?.attributes["content"];
    var articlePubDate = new Date();

    if (articlePublishDate) {
        articlePubDate = new Date(articlePublishDate);
    }

    const articleTitle = html.querySelector("h1")?.innerText;

    return { pubDate: articlePubDate, title: articleTitle, content: article };
}

/**
 * Converts RDF output into an RSS-compatible feed.
 * 
 * It will also cache any missing article from the RDF feed and updated the RSS timestamp <-> article dictionary.
 * 
 * @param rawRDF RDF content
 * @returns RSS XML as a string
 */
async function convertToRSS(rawRDF: string): Promise<string> {
    const xml = new XMLParser().parse(rawRDF);
    const channelXml = xml["rdf:RDF"].channel;

    const channelTitle = channelXml.title;
    const channelLink = channelXml.link;
    const channelDescription = channelXml.description || 'Official Everquest 2 News';
    const channelItems = channelXml.item;

    for (const item of channelItems) {
        const itemLink = item.link.trim();
        await cacheArticle(itemLink);
    }

    const sortedNews = JSON.parse(FileUtil.read("./cache/!sort.json"));
    var itemXml = '';
    for (const entry of Object.entries(sortedNews)) {
        const file = entry[1] as string;
        const html = FileUtil.read(`./cache/${file}.html`);

        const { pubDate, title, content } = await processHtml(html);

        const itemPublishDate = new Date(entry[0] as string);
        const itemContent = content;
        itemXml += `
        <item>
            <title><![CDATA[${title}]]></title>
            <link>https://www.everquest2.com/news/${file}</link>
            <pubDate>${itemPublishDate.toUTCString()}</pubDate>
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

/**
 * Entry point for /rss
 * 
 * @param request
 * @param response 
 */
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
