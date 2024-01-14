import * as https from "https";

export class HttpUtil {
	
	public static async exists(url: string): Promise<boolean> {
		return new Promise<boolean>((resolve, reject) => {
			https.get(url, res => {
				resolve(res.statusCode === 200)
			})
		})
	}

	public static async delayFetch(url: string, options: any): Promise<Response> {
		return new Promise<Response>((resolve, reject) => {
			setTimeout(() => {
				console.log(`Fetching data from: ${url}`);
				fetch(url, options)
					.then((res) => resolve(res))
					.catch(async (error: Error) => {
						if (options.retries > 0) {
							console.log("Timeout. Trying again.");
							await this.delayFetch(url, { delay: options.delay, retries: options.retries --});
						} else {
							console.log("Timeout.");
							reject(error);
						}
					});
			}, options.delay);
		});
	}
}