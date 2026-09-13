const axios = require("axios");

/**
 * @param {string} cookie Cookie string as `c_user=123;xs=123;datr=123;` format
 * @param {string} userAgent User agent string
 * @returns {Promise<boolean>} True if cookie is valid, false if not
 */
module.exports = async function (cookie, userAgent) {
	if (typeof cookie !== "string" || !cookie.includes("c_user=") || !cookie.includes("xs="))
		return false;

	try {
		const response = await axios.get("https://www.facebook.com/", {
			headers: {
				Cookie: cookie,
				"User-Agent": userAgent || "Mozilla/5.0"
			},
			maxRedirects: 5,
			timeout: 15000,
			validateStatus: () => true
		});

		const body = typeof response.data === "string" ? response.data : "";
		const redirectedToLogin = /\/login(?:\/|\?|\"|')/i.test(response.request?.res?.responseUrl || "");
		return response.status >= 200 && response.status < 400 && !redirectedToLogin && !/Log Into Facebook|login_form/i.test(body);
	}
	catch (error) {
		return false;
	}
};
