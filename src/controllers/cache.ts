import express from "express";
import { HttpUtil } from "../utils/http.util";
import { FileUtil } from "../utils/file.util";
import { parse } from "node-html-parser";

const latestArticleUrl = "https://www.everquest2.com/news/eq2-housing-discount-2024";

var articleMap: Map<string, string> = new Map<string, string>();

/**
 * Will cache URL to disk (if it doesn't already exist) then add and entry to the RSS timestamp <-> article dictionary file.
 * 
 * It will then "walk" the articles back until it can't do so any longer.
 * 
 * NOTE: In some cases, the article returns no previous link even though one exists. The fix is to delete the cache entry and re-run.
 * 
 * @param url - Article to process
 */
async function cacheUrl(url: string): Promise<any> {
    const pathSegments = url.split("/");
    const lastPathSegment = pathSegments[pathSegments.length - 1];

    if (!FileUtil.exists(`./cache/${lastPathSegment}.html`)) {
        const text = await HttpUtil.delayFetch(url, { delay: 500, retries: 3})
            .then((res) => res.text())
        FileUtil.write(`./cache/${lastPathSegment}.html`, "<base href='https://www.everquest2.com'>" + text.trim());
    }

    const html = parse(FileUtil.read(`./cache/${lastPathSegment}.html`) || '');
    const prevArticleLinkNode = html.querySelector(".article-bottom-nav")?.querySelector(".prev");
    const prevArticleLink = prevArticleLinkNode?.attributes["href"];

    const articlePublishDateNode = html.querySelector("head")?.querySelector("meta[property='article:published_time']");
    const articlePublishDate = articlePublishDateNode?.attributes["content"];

    if (articlePublishDate) {
        articleMap.set(articlePublishDate, lastPathSegment);

        const temp = new Map([... articleMap.entries()].sort((a, b) => -a[0].localeCompare(b[0])));
        FileUtil.write("./cache/!sort.json", JSON.stringify(Object.fromEntries(temp), undefined, 2));
    }

    if (prevArticleLink) {
        await cacheUrl(prevArticleLink);
    } else {
        console.log(`No previous article link found for ${url}`);
    }
}

/**
 * Entry point for /cache
 * 
 * This process only needs to be completed ONCE.
 * 
 * @param request
 * @param response 
 */
export async function cache(request: express.Request, response: express.Response) {
    console.log("GET /cache");

    await cacheUrl(latestArticleUrl)

    articleMap = new Map([... articleMap.entries()].sort((a, b) => -a[0].localeCompare(b[0])));
    FileUtil.write("./cache/!sort.json", JSON.stringify(Object.fromEntries(articleMap), undefined, 2));

    response.send(FileUtil.read(`./cache/eq2-frostfell-2023.html`));
}
